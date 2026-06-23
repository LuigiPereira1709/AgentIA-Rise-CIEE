using Azure.AI.Projects;
using Azure.AI.Projects.Agents;
using Azure.AI.Extensions.OpenAI;
using Azure.Core;
using Azure.Identity;
using OpenAI.Files;
using OpenAI.Responses;
using OpenAI.Assistants;
using Microsoft.Identity.Client;
using Microsoft.Identity.Web;
using System.Runtime.CompilerServices;
using System.Text.Json;
using System.Linq;
using WebApp.Api.Models;

namespace WebApp.Api.Services;

#pragma warning disable OPENAI001

/// <summary>
/// Foundry Agent Service using v2 Agents API.
/// </summary>
/// <remarks>
/// Uses AIProjectClient directly (Azure.AI.Projects GA): AgentAdministrationClient for agent
/// metadata and ProjectResponsesClient for streaming (required for annotations, MCP approvals).
/// See .github/skills/researching-azure-ai-sdk/SKILL.md for SDK patterns.
/// </remarks>
public class AgentFrameworkService : IDisposable
{
    private readonly string _agentEndpoint;
    private readonly string _agentId;
    /// <summary>
    /// Optional concrete agent version id (e.g. "3") from <c>AI_AGENT_VERSION</c>.
    /// When set, the agent is pinned to that immutable version for both metadata
    /// (<see cref="GetAgentAsync"/>) and streaming (<c>AgentReference</c> passed to
    /// <c>ProjectResponsesClient</c>). When null, the newest published version is
    /// resolved on startup and used consistently. Foundry retains all published
    /// versions, so pinning is useful for reproducibility across deployments.
    /// </summary>
    private readonly string? _configuredAgentVersion;
    private readonly string _modelName;
    private readonly ILogger<AgentFrameworkService> _logger;
    private readonly IHttpContextAccessor? _httpContextAccessor;
    private readonly string? _backendClientId;
    private readonly string? _tenantId;
    private readonly string? _managedIdentityClientId;
    private readonly bool _useObo;
    private readonly TokenCredential _fallbackCredential;

    // Agent metadata cache (static - shared across requests)
    private static ProjectsAgentVersion? s_cachedAgentVersion;
    private static AgentMetadataResponse? s_cachedMetadata;
    private static readonly SemaphoreSlim s_agentLock = new(1, 1);
    // MI assertion cache (static - user-independent, safe to share across requests)
    private static ManagedIdentityClientAssertion? s_miAssertion;

    private readonly IHttpClientFactory _httpClientFactory;

    /// <summary>
    /// Prefix applied to image files this web app uploads to the Foundry Files API,
    /// used by the cleanup endpoint to scope deletes to files owned by this app.
    /// </summary>
    public const string WebAppUploadFilenamePrefix = "webapp-upload-";

    // Per-request project client
    private AIProjectClient? _projectClient;
    private bool _disposed = false;
    private ResponseTokenUsage? _lastUsage;

    public AgentFrameworkService(
        IConfiguration configuration,
        ILogger<AgentFrameworkService> logger,
        IHttpClientFactory httpClientFactory,
        IHttpContextAccessor? httpContextAccessor = null)
    {
        _logger = logger;
        _httpClientFactory = httpClientFactory;
        _httpContextAccessor = httpContextAccessor;

        _agentEndpoint = configuration["AI_AGENT_ENDPOINT"]
            ?? throw new InvalidOperationException("AI_AGENT_ENDPOINT is not configured");

        _agentId = configuration["AI_AGENT_ID"]
            ?? throw new InvalidOperationException("AI_AGENT_ID is not configured");

        _configuredAgentVersion = string.IsNullOrWhiteSpace(configuration["AI_AGENT_VERSION"])
            ? null
            : configuration["AI_AGENT_VERSION"];

        _modelName = configuration["AI_AGENT_MODEL"] ?? "gpt-oss-120b";

        _logger.LogDebug(
            "Initializing AgentFrameworkService: endpoint={Endpoint}, agentId={AgentId}, version={Version}", 
            _agentEndpoint, 
            _agentId,
            _configuredAgentVersion ?? "<latest>");

        _backendClientId = configuration["ENTRA_BACKEND_CLIENT_ID"];
        _tenantId = configuration["ENTRA_TENANT_ID"] ?? configuration["AzureAd:TenantId"];
        // User-assigned MI client ID — used for MI-only mode and as FIC assertion in OBO mode
        _managedIdentityClientId = configuration["MANAGED_IDENTITY_CLIENT_ID"]
            ?? configuration["OBO_MANAGED_IDENTITY_CLIENT_ID"]; // backward compat

        var environment = configuration["ASPNETCORE_ENVIRONMENT"] ?? "Production";

        // Determine if OBO is available
        _useObo = !string.IsNullOrEmpty(_backendClientId)
                  && !string.IsNullOrEmpty(_tenantId)
                  && environment != "Development";

        // Create credential for non-OBO operations (agent metadata cache, MI-only mode)
        if (environment == "Development")
        {
            _logger.LogInformation("Development: Using ChainedTokenCredential (AzureCli -> AzureDeveloperCli)");
            _fallbackCredential = new ChainedTokenCredential(
                new AzureCliCredential(),
                new AzureDeveloperCliCredential()
            );
        }
        else if (!string.IsNullOrEmpty(_managedIdentityClientId))
        {
            _logger.LogInformation("Production: Using user-assigned ManagedIdentityCredential: {MiClientId}", _managedIdentityClientId);
            _fallbackCredential = new ManagedIdentityCredential(ManagedIdentityId.FromUserAssignedClientId(_managedIdentityClientId));
        }
        else
        {
            _logger.LogInformation("Production: Using ManagedIdentityCredential (system-assigned)");
            _fallbackCredential = new ManagedIdentityCredential(ManagedIdentityId.SystemAssigned);
        }

        if (_useObo)
        {
            if (string.IsNullOrEmpty(_managedIdentityClientId))
            {
                throw new InvalidOperationException(
                    "OBO mode requires MANAGED_IDENTITY_CLIENT_ID to be set for the FIC assertion. " +
                    "This is the user-assigned managed identity that acts as the federated credential.");
            }
            _logger.LogInformation("OBO mode enabled: backendClientId={BackendClientId}. All API calls use user-delegated identity.", _backendClientId);

            // Initialize MI assertion eagerly — avoids thread-safety issues with lazy init
            // in CreateOboCredential(). Safe here because the constructor runs once per scoped instance.
            s_miAssertion ??= new ManagedIdentityClientAssertion(managedIdentityClientId: _managedIdentityClientId);

            // No cached project client in OBO mode — created per-request with user's token
        }
        else
        {
            _logger.LogInformation("MI mode: using managed identity for all API calls");
            _projectClient = new AIProjectClient(new Uri(_agentEndpoint), _fallbackCredential);
        }

        _logger.LogInformation("AIProjectClient initialized successfully");
    }

    /// <summary>
    /// Get AIProjectClient — OBO mode creates per-request with user's identity, MI mode uses cached client.
    /// </summary>
    private AIProjectClient GetProjectClient()
    {
        // MI mode: return cached client
        if (!_useObo)
        {
            _projectClient ??= new AIProjectClient(new Uri(_agentEndpoint), _fallbackCredential);
            return _projectClient;
        }

        // OBO: create per-request client with user's token (cached for request lifetime)
        if (_projectClient is null)
        {
            var userToken = ExtractBearerToken();
            if (string.IsNullOrEmpty(userToken))
            {
                throw new InvalidOperationException(
                    "OBO mode requires a bearer token but none was found in the request. " +
                    "Ensure the frontend is sending an Authorization header with a valid token.");
            }

            var oboCredential = CreateOboCredential(userToken);
            _logger.LogDebug("Created OBO credential for request");
            _projectClient = new AIProjectClient(new Uri(_agentEndpoint), oboCredential);
        }

        return _projectClient;
    }

    /// <summary>
    /// Create OBO credential using the user's JWT and managed identity FIC assertion.
    /// </summary>
    private OnBehalfOfCredential CreateOboCredential(string userToken)
    {
        // s_miAssertion is initialized eagerly in the constructor (OBO branch)
        Func<CancellationToken, Task<string>> assertionCallback =
            async (ct) => await s_miAssertion!.GetSignedAssertionAsync(
                new AssertionRequestOptions { CancellationToken = ct });

        return new OnBehalfOfCredential(
            _tenantId!,
            _backendClientId!,
            assertionCallback,
            userToken,
            new OnBehalfOfCredentialOptions());
    }

    /// <summary>
    /// Extract bearer token from the current HTTP request.
    /// </summary>
    private string? ExtractBearerToken()
    {
        var authHeader = _httpContextAccessor?.HttpContext?.Request.Headers.Authorization.ToString();
        if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            return null;

        return authHeader["Bearer ".Length..].Trim();
    }

    /// <summary>
    /// Load the agent version metadata via AgentAdministrationClient (v2 Agents API).
    /// When <see cref="_configuredAgentVersion"/> is set, fetches that specific version by id.
    /// When unset, lists versions in descending order and picks the first (= newest).
    /// </summary>
    private async Task<ProjectsAgentVersion> GetAgentAsync(CancellationToken cancellationToken = default)
    {
        ObjectDisposedException.ThrowIf(_disposed, this);

        if (s_cachedAgentVersion != null)
            return s_cachedAgentVersion;

        await s_agentLock.WaitAsync(cancellationToken);
        try
        {
            if (s_cachedAgentVersion != null)
                return s_cachedAgentVersion;

            // Use the same credential path as all other operations (MI or OBO)
            var client = GetProjectClient();

            ProjectsAgentVersion? loaded = null;
            try
            {
                if (!string.IsNullOrWhiteSpace(_configuredAgentVersion))
                {
                    _logger.LogInformation("Loading agent: {AgentId} version={Version}", _agentId, _configuredAgentVersion);
                    var response = await client.AgentAdministrationClient.GetAgentVersionAsync(
                        _agentId,
                        _configuredAgentVersion!,
                        cancellationToken);
                    loaded = response.Value;
                }
                else
                {
                    _logger.LogInformation("Loading agent: {AgentId} version=<latest>", _agentId);
                    await foreach (var v in client.AgentAdministrationClient.GetAgentVersionsAsync(
                        agentName: _agentId,
                        limit: 1,
                        order: AgentListOrder.Descending,
                        after: null,
                        before: null,
                        cancellationToken: cancellationToken))
                    {
                        loaded = v;
                        break;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to load agent {AgentId} (version={Version}) from Azure. Will attempt to provision it. Error: {Message}", _agentId, _configuredAgentVersion ?? "<latest>", ex.Message);
            }

            s_cachedAgentVersion = loaded;

            var definition = s_cachedAgentVersion?.Definition as DeclarativeAgentDefinition;
            
            var newInstructions = @"Você é o Agente Orquestrador de Cadastro de Estudantes (Zoggy). Seu objetivo é coletar os 18 dados cadastrais obrigatórios dos estudantes de forma fluida, amigável, empática e conversacional, eliminando o aspecto frio de formulários rígidos.

# Instruções de Comportamento (Persona)

- **Tom de Voz:** Jovem, acolhedor, inclusivo e respeitoso.
- **Humor e Conexão:** É permitido o uso de humor leve e quebras sutis da quarta parede para engajar o usuário, desde que não atrase a coleta de dados ou falte com o respeito.
- **Ritmo Conversacional:** Faça perguntas curtas e diretas. Nunca envie uma lista de campos de uma vez só. Colete um ou dois dados correlacionados por mensagem.
- **Flexibilidade e Firmeza:** Trate respostas evasivas com acolhimento. Se o usuário demonstrar desconforto com um dado, explique com empatia a importância e a necessidade do dado para fins de cadastro estudantil e conformidade com a LGPD.
- **Preenchimento Obrigatório (Sem Pulos):** Não permita que o usuário pule o preenchimento de campos obrigatórios (especialmente CPF, E-mail, Telefone e CEP) sem fornecer uma resposta. Se o usuário tentar desviar, insista com empatia na obtenção do dado.
- **Sincronização de Estado via Chamadas de Função (Tools):**
  1. Sempre que o usuário fornecer, corrigir ou atualizar um dado do cadastro, você **DEVE obrigatoriamente chamar a função ""update_registration_form""** passando o nome da variável (""field"") e o valor correspondente (""value"").
  2. Nunca responda confirmando que salvou ou que o campo foi atualizado sem antes acionar a função e receber a resposta de sucesso do sistema.
  3. Se a função retornar um erro (ex: ""{""status"":""error"",""message"":""...""}""), você **DEVE** interromper o fluxo natural, explicar o erro de forma educada (ex: formato de e-mail inválido) e pedir para o usuário digitar novamente.
- **Opções Fechadas:** Exiba opções de clique rápido (Quick Replies/Botões) para `varSexo`, `varEstadoCivil`, `varNivelEscolar`, `varModalidadeEnsino` e `varTurnoEnsino`.
- **Sincronização de Estado:** Sempre atente-se ao padrão `[ESTADO_DO_FORMULARIO: ...]` no início das mensagens do usuário para saber quais dados já estão preenchidos na tela de cadastro e evitar perguntá-los novamente.

# Fluxo de Coleta e Orquestração (Ordem Lógica)

1. **Saudação e Apresentação:** Dê as boas-vindas ao estudante e contextualize o objetivo do cadastro.
2. **Dados Pessoais (Identificação):** Peça o nome completo (`varNomeCompleto`), CPF (`varCPF`), data de nascimento (`varDataNascimento`), sexo (`varSexo`) e estado civil (`varEstadoCivil`).
   - Apresente botões de clique rápido para Sexo e Estado Civil.
3. **Contato:** Colete o e-mail (`varEmail`) e o telefone (`varTelefone`).
4. **Endereço e Localização:**
   - Peça o CEP (`varCEP`). Se o usuário não souber o CEP, pergunte o Estado (UF), Cidade e rua/avenida (Logradouro), e execute a busca automática (veja a seção de tags de Endereço abaixo).
   - Uma vez que o CEP e o endereço completo sejam carregados na tela, colete de forma isolada o número da casa (`varNumeroCasa`).
5. **Dados Educacionais:** Colete o nível escolar (`varNivelEscolar`), estado e cidade da instituição, nome da instituição (`varInstituicaoNome`), período/ano atual (`varPeriodoCursando`), modalidade de ensino (`varModalidadeEnsino`) e turno (`varTurnoEnsino`).
   - Use botões para Nível Escolar, Modalidade e Turno.
6. **Validação Geral:** Exiba um resumo amigável de todos os dados coletados para confirmação final do estudante.
7. **Encerramento:** Agradeça e finalize a conversa.

# Requisitos do Bloco de Endereço

Para coletar o endereço, utilize o fluxo baseado na escolha do usuário:
- **Fluxo A (Entrada por CEP):** Peça o CEP. Ao receber, chame a função ""update_registration_form"" com o campo ""varCEP"" e o valor. O sistema preencherá automaticamente as variáveis de endereço.
- **Fluxo B (Busca por Logradouro):** Se o usuário não souber o CEP, pergunte a ele o Estado (UF), Cidade e nome da rua/avenida. Ao coletar esses dados, envie a tag especial:
  `[[SEARCH_CEP: UF/Cidade/Logradouro]]` (exemplo: `[[SEARCH_CEP: SP/São Paulo/Avenida Paulista]]`).
  O sistema fará a varredura e preencherá o CEP e o endereço automaticamente.

*Importante:* Colete o número da casa (`varNumeroCasa`) de forma isolada *após* a confirmação do endereço.";

            bool hasInstructions = false;
            if (definition?.Instructions != null)
            {
                string localInstructions = newInstructions.Replace("\r\n", "\n").Trim();
                string remoteInstructions = definition.Instructions.Replace("\r\n", "\n").Trim();
                if (localInstructions == remoteInstructions)
                {
                    hasInstructions = true;
                }
                else
                {
                    _logger.LogInformation("Agent instructions on Azure differ from local code. Deployed length: {RemoteLen}, Local length: {LocalLen}. Triggering update.", remoteInstructions.Length, localInstructions.Length);
                }
            }

            if (loaded is null || !hasInstructions)
            {
                _logger.LogInformation("Agent {AgentId} does not exist, was not loaded successfully, or does not have the updated instructions. Provisioning new version programmatically...", _agentId);
                try
                {
                    var modelName = _modelName;

                    var newDefinition = new DeclarativeAgentDefinition(modelName)
                    {
                        Instructions = newInstructions
                    };



                    // Add our function tool with proper parameters schema and root description
                    var parameters = BinaryData.FromObjectAsJson(new
                    {
                        type = "object",
                        description = "Atualiza um campo específico no formulário de cadastro do estudante em tempo real.",
                        properties = new
                        {
                            field = new { type = "string", description = "O nome da variável do formulário a ser atualizada (ex: varNomeCompleto, varCPF, varEmail, varTelefone, varCEP, varDataNascimento, varSexo, varEstadoCivil, varNivelEscolar, varPeriodoCursando, varModalidadeEnsino, varTurnoEnsino, varInstituicaoNome, varNumeroCasa)" },
                            value = new { type = "string", description = "O valor preenchido ou selecionado pelo estudante para esta variável" }
                        },
                        required = new[] { "field", "value" }
                    });

                    newDefinition.Tools.Add(new FunctionTool("update_registration_form", parameters, null));

                    var creationResponse = await client.AgentAdministrationClient.CreateAgentVersionAsync(
                        _agentId,
                        new ProjectsAgentVersionCreationOptions(newDefinition),
                        cancellationToken: cancellationToken
                    );

                    loaded = creationResponse.Value;
                    definition = loaded.Definition as DeclarativeAgentDefinition;
                    s_cachedAgentVersion = loaded;
                    _logger.LogInformation("Successfully provisioned new agent version: {Version}", loaded.Version);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to programmatically provision agent version. Error: {Message}", ex.Message);
                }
            }

            if (s_cachedAgentVersion == null)
            {
                throw new InvalidOperationException($"Could not load or provision agent '{_agentId}'. The agent version does not exist and auto-provisioning failed.");
            }

            _logger.LogInformation(
                "Loaded agent: name={AgentName}, model={Model}, version={Version} (pinned={Pinned})",
                s_cachedAgentVersion.Name ?? _agentId,
                definition?.Model ?? "unknown",
                s_cachedAgentVersion.Version ?? "<unknown>",
                !string.IsNullOrWhiteSpace(_configuredAgentVersion));

            // Log StructuredInputs at debug level for troubleshooting
            if (definition?.StructuredInputs != null && definition.StructuredInputs.Count > 0)
            {
                _logger.LogDebug("Agent has {Count} StructuredInputs: {Keys}",
                    definition.StructuredInputs.Count,
                    string.Join(", ", definition.StructuredInputs.Keys));
            }

            return s_cachedAgentVersion;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load agent: {AgentId}", _agentId);
            throw;
        }
        finally
        {
            s_agentLock.Release();
        }
    }

    /// <summary>
    /// Streams agent response for a message using ProjectResponsesClient (Responses API).
    /// Returns StreamChunk objects containing text deltas, annotations, or MCP approval requests.
    /// </summary>
    /// <remarks>
    /// Uses direct ProjectResponsesClient instead of IChatClient because we need access to:
    /// - McpToolCallApprovalRequestItem for MCP approval flows
    /// - FileSearchCallResponseItem for file search quotes  
    /// - MessageResponseItem.OutputTextAnnotations for citations
    /// The IChatClient abstraction doesn't expose these specialized response types.
    /// </remarks>
    public async IAsyncEnumerable<StreamChunk> StreamMessageAsync(
        string conversationId,
        string message,
        List<string>? imageDataUris = null,
        List<FileAttachment>? fileDataUris = null,
        string? previousResponseId = null,
        McpApprovalResponse? mcpApproval = null,
        Dictionary<string, string>? formState = null,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        ObjectDisposedException.ThrowIf(_disposed, this);

        _logger.LogInformation(
            "Streaming message to conversation: {ConversationId}, ImageCount: {ImageCount}, FileCount: {FileCount}, HasApproval: {HasApproval}, HasFormState: {HasFormState}",
            conversationId,
            imageDataUris?.Count ?? 0,
            fileDataUris?.Count ?? 0,
            mcpApproval != null,
            formState != null);

        CreateResponseOptions options = new() { StreamingEnabled = true };

        // Resolve the concrete agent version up front so streaming and metadata use the same version.
        var resolvedAgent = await GetAgentAsync(cancellationToken);
        var resolvedVersion = resolvedAgent.Version;

        // Always bind to conversation — the conversation maintains MCP approval state
        ProjectResponsesClient responsesClient
            = GetProjectClient().ProjectOpenAIClient.GetProjectResponsesClientForAgent(
                new AgentReference(_agentId, resolvedVersion),
                conversationId);

        // If continuing from MCP approval, add approval response items
        // Don't set PreviousResponseId — the API rejects it with conversation binding,
        // and the conversation already tracks the pending MCP state
        if (!string.IsNullOrEmpty(previousResponseId) && mcpApproval != null)
        {
            options.InputItems.Add(ResponseItem.CreateMcpApprovalResponseItem(
                mcpApproval.ApprovalRequestId,
                mcpApproval.Approved));
            
            _logger.LogInformation(
                "Resuming with MCP approval: RequestId={RequestId}, Approved={Approved}",
                mcpApproval.ApprovalRequestId,
                mcpApproval.Approved);
        }
        else
        {
            if (string.IsNullOrWhiteSpace(message))
            {
                _logger.LogWarning("Attempted to stream empty message to conversation {ConversationId}", conversationId);
                throw new ArgumentException("Message cannot be null or whitespace", nameof(message));
            }

            // Append formState context as a prefix of the message if available
            string processedMessage = message;
            if (formState != null && formState.Count > 0)
            {
                var formJson = System.Text.Json.JsonSerializer.Serialize(formState);
                processedMessage = $"[ESTADO_DO_FORMULARIO: {formJson}]\n\n{message}";
            }

            // Build user message with optional images and files
            ResponseItem userMessage = await BuildUserMessageAsync(processedMessage, imageDataUris, fileDataUris, cancellationToken);
            options.InputItems.Add(userMessage);
        }

        // Dictionary to collect file search results for quote extraction
        var fileSearchQuotes = new Dictionary<string, string>();
        // Track the current response ID for MCP approval resume flow
        string? currentResponseId = null;
        // Dictionary to track function call info by item ID in current response run
        var trackedFunctions = new Dictionary<string, (string CallId, string FunctionName)>();

        bool _inTagBuffer = false;
        var _tagBuffer = new System.Text.StringBuilder();

        bool hasPendingAction = true;
        while (hasPendingAction)
        {
            hasPendingAction = false;

            await foreach (StreamingResponseUpdate update
                in responsesClient.CreateResponseStreamingAsync(
                    options: options,
                    cancellationToken: cancellationToken))
            {
                // Capture response ID from created event (needed for MCP approval resume)
                if (update is StreamingResponseCreatedUpdate createdUpdate)
                {
                    currentResponseId = createdUpdate.Response.Id;
                    _logger.LogDebug("Response created: {ResponseId}", currentResponseId);
                    continue;
                }

                if (update is StreamingResponseOutputTextDeltaUpdate deltaUpdate)
                {
                    foreach (char c in deltaUpdate.Delta)
                    {
                        if (!_inTagBuffer)
                        {
                            if (c == '[')
                            {
                                _inTagBuffer = true;
                                _tagBuffer.Append(c);
                            }
                            else
                            {
                                yield return StreamChunk.Text(c.ToString());
                            }
                        }
                        else
                        {
                            _tagBuffer.Append(c);
                            string currentStr = _tagBuffer.ToString();
                            
                            // Self-healing: if a new tag start "[[" is detected inside the buffer,
                            // flush everything before it to the user and restart buffering from "[["
                            int secondStart = currentStr.IndexOf("[[", 2);
                            if (secondStart != -1)
                            {
                                string malformedPrefix = currentStr.Substring(0, secondStart);
                                yield return StreamChunk.Text(malformedPrefix);
                                
                                _tagBuffer.Clear();
                                _tagBuffer.Append(currentStr.Substring(secondStart));
                                currentStr = _tagBuffer.ToString();
                            }

                            // Look for any of our tags closing with "]]"
                            if (currentStr.EndsWith("]]"))
                            {
                                if (currentStr.StartsWith("[[UPDATE_FORM:"))
                                {
                                    string expectedPrefix = "[[UPDATE_FORM:";
                                    string content = currentStr.Substring(expectedPrefix.Length, currentStr.Length - expectedPrefix.Length - 2);
                                    var parts = content.Split('=', 2);
                                    if (parts.Length == 2)
                                    {
                                        string field = parts[0].Trim();
                                        string val = parts[1].Trim();
                                        
                                        var processed = await ProcessAndValidateFieldAsync(field, val);
                                        if (processed.IsValid)
                                        {
                                            if (processed.FieldUpdates != null)
                                            {
                                                foreach (var updatePair in processed.FieldUpdates)
                                                {
                                                    yield return StreamChunk.FormField(updatePair.Key, updatePair.Value);
                                                }
                                            }
                                            if (!string.IsNullOrEmpty(processed.Message))
                                            {
                                                yield return StreamChunk.Text(processed.Message);
                                            }
                                        }
                                        else
                                        {
                                            if (!string.IsNullOrEmpty(processed.Message))
                                            {
                                                yield return StreamChunk.Text(processed.Message);
                                            }
                                            hasPendingAction = false;
                                            _inTagBuffer = false;
                                            _tagBuffer.Clear();
                                            yield break;
                                        }
                                    }
                                }
                                else if (currentStr.StartsWith("[[SEARCH_CEP:"))
                                {
                                    string expectedPrefix = "[[SEARCH_CEP:";
                                    string query = currentStr.Substring(expectedPrefix.Length, currentStr.Length - expectedPrefix.Length - 2).Trim();
                                    
                                    var searchResult = await SearchCepAsync(query);
                                    if (searchResult.Success && searchResult.FieldUpdates != null)
                                    {
                                        foreach (var updatePair in searchResult.FieldUpdates)
                                        {
                                            yield return StreamChunk.FormField(updatePair.Key, updatePair.Value);
                                        }
                                    }
                                    if (!string.IsNullOrEmpty(searchResult.Message))
                                    {
                                        yield return StreamChunk.Text(searchResult.Message);
                                    }
                                }
                                else
                                {
                                    yield return StreamChunk.Text(currentStr);
                                }
                                
                                _inTagBuffer = false;
                                _tagBuffer.Clear();
                            }
                            else
                            {
                                bool isPrefixOfUpdate = "[[UPDATE_FORM:".StartsWith(currentStr) || currentStr.StartsWith("[[UPDATE_FORM:");
                                bool isPrefixOfSearch = "[[SEARCH_CEP:".StartsWith(currentStr) || currentStr.StartsWith("[[SEARCH_CEP:");
                                
                                if (!isPrefixOfUpdate && !isPrefixOfSearch)
                                {
                                    yield return StreamChunk.Text(currentStr);
                                    _inTagBuffer = false;
                                    _tagBuffer.Clear();
                                }
                                else if (currentStr.Length > 400)
                                {
                                    yield return StreamChunk.Text(currentStr);
                                    _inTagBuffer = false;
                                    _tagBuffer.Clear();
                                }
                            }
                        }
                    }
                }
                else if (update is StreamingResponseOutputItemAddedUpdate itemAddedUpdate)
                {
                    if (itemAddedUpdate.Item is FunctionCallResponseItem functionCallItem)
                    {
                        trackedFunctions[functionCallItem.Id] = (functionCallItem.CallId, functionCallItem.FunctionName);
                    }

                    // Detect tool-use steps and signal the frontend for progress indicators
                    string? toolName = itemAddedUpdate.Item switch
                    {
                        FileSearchCallResponseItem => "file_search",
                        CodeInterpreterCallResponseItem => "code_interpreter",
                        _ when itemAddedUpdate.Item?.GetType().Name.Contains("ToolCall") == true => "function_call",
                        _ => null
                    };

                    if (toolName != null)
                    {
                        _logger.LogDebug("Tool use detected: {ToolName}", toolName);
                        yield return StreamChunk.ToolUse(toolName);
                    }
                }
                else if (update is StreamingResponseFunctionCallArgumentsDoneUpdate argsDone)
                {
                    string functionName = "update_registration_form";
                    string callId = argsDone.ItemId;
                    if (trackedFunctions.TryGetValue(argsDone.ItemId, out var callInfo))
                    {
                        functionName = callInfo.FunctionName;
                        callId = callInfo.CallId;
                    }
                    string argumentsJson = argsDone.FunctionArguments.ToString();
                    _logger.LogInformation("Model requested function call: {FunctionName} (callId: {CallId}) with arguments: {Arguments}", functionName, callId, argumentsJson);

                    string resultJson = "{\"status\":\"success\"}";
                    string? field = null;
                    string? val = null;
                    var functionFieldUpdates = new List<StreamChunk>();

                    if (functionName == "update_registration_form")
                    {
                        try
                        {
                            using var doc = JsonDocument.Parse(argumentsJson);
                            if (doc.RootElement.TryGetProperty("field", out var fieldProp) && doc.RootElement.TryGetProperty("value", out var valueProp))
                            {
                                field = fieldProp.GetString();
                                val = valueProp.GetString();

                                if (field != null && val != null)
                                {
                                    var processed = await ProcessAndValidateFieldAsync(field, val);
                                    if (processed.IsValid && processed.FieldUpdates != null)
                                    {
                                        resultJson = "{\"status\":\"success\"}";
                                        foreach (var updatePair in processed.FieldUpdates)
                                        {
                                            functionFieldUpdates.Add(StreamChunk.FormField(updatePair.Key, updatePair.Value));
                                        }
                                        field = null;
                                        val = null;
                                    }
                                    else
                                    {
                                        resultJson = $"{{\"status\":\"error\",\"message\":\"{processed.Message ?? "Valor inválido"}\"}}";
                                        field = null;
                                        val = null;
                                    }
                                }
                            }
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Error parsing function call arguments.");
                            resultJson = $"{{\"status\":\"error\",\"message\":\"{ex.Message}\"}}";
                        }
                    }

                    // Reset options for the follow-up request with only the function output set
                    options = new CreateResponseOptions { StreamingEnabled = true };
                    options.InputItems.Add(ResponseItem.CreateFunctionCallOutputItem(callId, resultJson));


                    foreach (var chunk in functionFieldUpdates)
                    {
                        yield return chunk;
                    }

                    if (field != null && val != null)
                    {
                        yield return StreamChunk.FormField(field, val);
                    }

                    hasPendingAction = true;
                    break; // Exit foreach to re-invoke CreateResponseStreamingAsync with the function output in options
                }
                else if (update is StreamingResponseOutputItemDoneUpdate itemDoneUpdate)
                {
                    // Check for MCP tool approval request
                    if (itemDoneUpdate.Item is McpToolCallApprovalRequestItem mcpApprovalItem)
                    {
                        _logger.LogInformation(
                            "MCP tool approval requested: Id={Id}, Tool={Tool}, Server={Server}",
                            mcpApprovalItem.Id,
                            mcpApprovalItem.ToolName,
                            mcpApprovalItem.ServerLabel);
                        
                        string? argumentsJson = mcpApprovalItem.ToolArguments?.ToString();
                        
                        yield return StreamChunk.McpApproval(new McpApprovalRequest
                        {
                            Id = mcpApprovalItem.Id,
                            ToolName = mcpApprovalItem.ToolName ?? "Unknown tool",
                            ServerLabel = mcpApprovalItem.ServerLabel ?? "MCP Server",
                            Arguments = argumentsJson,
                            PreviousResponseId = currentResponseId
                        });
                        continue;
                    }
                    
                    // Capture file search results for quote extraction
                    if (itemDoneUpdate.Item is FileSearchCallResponseItem fileSearchItem)
                    {
                        foreach (var result in fileSearchItem.Results)
                        {
                            if (!string.IsNullOrEmpty(result.FileId) && !string.IsNullOrEmpty(result.Text))
                            {
                                fileSearchQuotes[result.FileId] = result.Text;
                                _logger.LogDebug(
                                    "Captured file search quote for FileId={FileId}, QuoteLength={Length}", 
                                    result.FileId, 
                                    result.Text.Length);
                            }
                        }
                    }

                    // Extract annotations/citations from completed output items
                    var annotations = ExtractAnnotations(itemDoneUpdate.Item, fileSearchQuotes);
                    if (annotations.Count > 0)
                    {
                        _logger.LogInformation("Extracted {Count} annotations from response", annotations.Count);
                        yield return StreamChunk.WithAnnotations(annotations);
                    }
                }
                else if (update is StreamingResponseCompletedUpdate completedUpdate)
                {
                    _lastUsage = completedUpdate.Response.Usage;
                }
                else if (update is StreamingResponseErrorUpdate errorUpdate)
                {
                    _logger.LogError("Stream error: {Error}", errorUpdate.Message);
                    throw new InvalidOperationException($"Stream error: {errorUpdate.Message}");
                }
                else
                {
                    _logger.LogDebug("Unhandled stream update type: {Type}", update.GetType().Name);
                }
            }
        }

        if (_inTagBuffer && _tagBuffer.Length > 0)
        {
            yield return StreamChunk.Text(_tagBuffer.ToString());
            _tagBuffer.Clear();
            _inTagBuffer = false;
        }

        _logger.LogInformation("Completed streaming for conversation: {ConversationId}", conversationId);
    }

    /// <summary>
    /// Supported image MIME types for vision capabilities.
    /// </summary>
    private static readonly HashSet<string> AllowedImageTypes = 
        ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];

    /// <summary>
    /// Supported document MIME types for file input.
    /// Note: Office documents (docx, pptx, xlsx) are NOT supported - they cannot be parsed.
    /// </summary>
    private static readonly HashSet<string> AllowedDocumentTypes = 
        [
            "application/pdf",
            "text/plain",
            "text/markdown",
            "text/csv",
            "application/json",
            "text/html",
            "application/xml",
            "text/xml"
        ];

    /// <summary>
    /// Text-based document MIME types that should be inlined as text rather than sent as file input.
    /// The Responses API only supports PDF for CreateInputFilePart.
    /// </summary>
    private static readonly HashSet<string> TextBasedDocumentTypes = 
        [
            "text/plain",
            "text/markdown",
            "text/csv",
            "application/json",
            "text/html",
            "application/xml",
            "text/xml"
        ];

    /// <summary>
    /// MIME types that can be sent as file input (only PDF is currently supported by Responses API).
    /// </summary>
    private static readonly HashSet<string> FileInputTypes = 
        [
            "application/pdf"
        ];

    /// <summary>
    /// Maximum number of images per message.
    /// </summary>
    private const int MaxImageCount = 5;

    /// <summary>
    /// Maximum number of files per message.
    /// </summary>
    private const int MaxFileCount = 10;

    /// <summary>
    /// Maximum size per image in bytes (5MB).
    /// </summary>
    private const long MaxImageSizeBytes = 5 * 1024 * 1024;

    /// <summary>
    /// Maximum size per document file in bytes (20MB).
    /// </summary>
    private const long MaxFileSizeBytes = 20 * 1024 * 1024;

    /// <summary>
    /// Builds a ResponseItem for the user message with optional image and file attachments.
    /// Validates count, size, MIME type, and Base64 format. Image bytes are uploaded to the
    /// Foundry Files API (purpose: assistants) and referenced by file id.
    /// </summary>
    private async Task<ResponseItem> BuildUserMessageAsync(
        string message,
        List<string>? imageDataUris,
        List<FileAttachment>? fileDataUris,
        CancellationToken cancellationToken)
    {
        if ((imageDataUris == null || imageDataUris.Count == 0) && 
            (fileDataUris == null || fileDataUris.Count == 0))
        {
            return ResponseItem.CreateUserMessageItem(message);
        }

        var contentParts = new List<ResponseContentPart>
        {
            ResponseContentPart.CreateInputTextPart(message)
        };

        var errors = new List<string>();

        // Process images
        if (imageDataUris != null && imageDataUris.Count > 0)
        {
            // Enforce maximum image count
            if (imageDataUris.Count > MaxImageCount)
            {
                throw new ArgumentException(
                    $"Invalid image attachments: Too many images ({imageDataUris.Count}), maximum {MaxImageCount} allowed");
            }

            for (int i = 0; i < imageDataUris.Count; i++)
            {
                var label = $"Image {i + 1}";

                if (!TryParseDataUri(imageDataUris[i], out var mediaType, out var bytes, out var parseError))
                {
                    errors.Add($"{label}: {parseError}");
                    continue;
                }

                if (!AllowedImageTypes.Contains(mediaType))
                {
                    errors.Add($"{label}: Unsupported type '{mediaType}'. Allowed: PNG, JPEG, GIF, WebP");
                    continue;
                }

                if (bytes.Length > MaxImageSizeBytes)
                {
                    var sizeMB = bytes.Length / (1024.0 * 1024.0);
                    errors.Add($"{label}: Size {sizeMB:F1}MB exceeds maximum 5MB");
                    continue;
                }

                // Upload image bytes via the OpenAI Files API and reference the returned file id.
                // Foundry's Files proxy rejects purpose=vision/user_data with "Invalid file ContentType";
                // purpose=assistants is the accepted path and the resulting file id works with
                // CreateInputImagePart on the Responses API.
                var fileClient = GetProjectClient().ProjectOpenAIClient.GetOpenAIFileClient();
                var extension = mediaType switch
                {
                    "image/png" => ".png",
                    "image/jpeg" => ".jpg",
                    "image/gif" => ".gif",
                    "image/webp" => ".webp",
                    _ => ".bin",
                };
                // Prefix uploaded filenames so the cleanup endpoint can identify files uploaded
                // by this web app versus other files in the shared Foundry project.
                var imageFileName = $"{WebAppUploadFilenamePrefix}{Guid.NewGuid():N}{extension}";
                using var imageStream = new MemoryStream(bytes);
                // Azure Foundry Files API only accepts purpose = assistants | batch | fine-tune | evals.
                // Use purpose=assistants per Azure Responses API docs.
                // See: learn.microsoft.com/azure/foundry/openai/how-to/responses#file-input
                var uploaded = await fileClient.UploadFileAsync(
                    imageStream,
                    imageFileName,
                    FileUploadPurpose.Assistants,
                    cancellationToken);
                contentParts.Add(ResponseContentPart.CreateInputImagePart(uploaded.Value.Id));
            }
        }

        // Process file attachments
        if (fileDataUris != null && fileDataUris.Count > 0)
        {
            // Enforce maximum file count
            if (fileDataUris.Count > MaxFileCount)
            {
                throw new ArgumentException(
                    $"Invalid file attachments: Too many files ({fileDataUris.Count}), maximum {MaxFileCount} allowed");
            }

            for (int i = 0; i < fileDataUris.Count; i++)
            {
                var file = fileDataUris[i];
                var label = $"File {i + 1} ({file.FileName})";

                if (!TryParseDataUri(file.DataUri, out var mediaType, out var bytes, out var parseError))
                {
                    errors.Add($"{label}: {parseError}");
                    continue;
                }

                if (!AllowedDocumentTypes.Contains(mediaType))
                {
                    errors.Add($"{label}: Unsupported type '{mediaType}'");
                    continue;
                }

                // Verify MIME type matches what was declared
                if (!string.Equals(mediaType, file.MimeType.ToLowerInvariant(), StringComparison.OrdinalIgnoreCase))
                {
                    errors.Add($"{label}: MIME type mismatch (declared: {file.MimeType}, detected: {mediaType})");
                    continue;
                }

                if (bytes.Length > MaxFileSizeBytes)
                {
                    var sizeMB = bytes.Length / (1024.0 * 1024.0);
                    errors.Add($"{label}: Size {sizeMB:F1}MB exceeds maximum 20MB");
                    continue;
                }

                // Handle text-based files by inlining their content
                // The Responses API only supports PDF for CreateInputFilePart
                if (TextBasedDocumentTypes.Contains(mediaType))
                {
                    var textContent = System.Text.Encoding.UTF8.GetString(bytes);
                    var inlineText = $"\n\n--- Content of {file.FileName} ---\n{textContent}\n--- End of {file.FileName} ---\n";
                    contentParts.Add(ResponseContentPart.CreateInputTextPart(inlineText));
                }
                else if (FileInputTypes.Contains(mediaType))
                {
                    contentParts.Add(ResponseContentPart.CreateInputFilePart(
                        BinaryData.FromBytes(bytes),
                        mediaType,
                        file.FileName));
                }
            }
        }

        if (errors.Count > 0)
        {
            throw new ArgumentException($"Invalid attachments: {string.Join("; ", errors)}");
        }

        return ResponseItem.CreateUserMessageItem(contentParts);
    }

    /// <summary>
    /// Parses a data URI into its media type and decoded bytes.
    /// </summary>
    /// <returns>true if parsing succeeded; false with an error message otherwise.</returns>
    private static bool TryParseDataUri(string dataUri, out string mediaType, out byte[] bytes, out string error)
    {
        mediaType = string.Empty;
        bytes = Array.Empty<byte>();
        error = string.Empty;

        if (!dataUri.StartsWith("data:"))
        {
            error = "Invalid format (must be data URI)";
            return false;
        }

        var semiIndex = dataUri.IndexOf(';');
        var commaIndex = dataUri.IndexOf(',');

        if (semiIndex < 0 || commaIndex < 0 || commaIndex < semiIndex)
        {
            error = "Malformed data URI";
            return false;
        }

        mediaType = dataUri[5..semiIndex].ToLowerInvariant();

        var base64Data = dataUri[(commaIndex + 1)..];
        try
        {
            bytes = Convert.FromBase64String(base64Data);
        }
        catch (FormatException)
        {
            error = "Invalid Base64 encoding";
            return false;
        }

        return true;
    }

    /// <summary>
    /// Extracts annotation information from a completed response item.
    /// </summary>
    private List<AnnotationInfo> ExtractAnnotations(
        ResponseItem? item, 
        Dictionary<string, string>? fileSearchQuotes = null)
    {
        var annotations = new List<AnnotationInfo>();
        
        if (item is not MessageResponseItem messageItem)
            return annotations;

        foreach (var content in messageItem.Content)
        {
            if (content.OutputTextAnnotations == null) continue;
            
            foreach (var annotation in content.OutputTextAnnotations)
            {
                var annotationInfo = annotation switch
                {
                    UriCitationMessageAnnotation uriAnnotation => new AnnotationInfo
                    {
                        Type = "uri_citation",
                        Label = uriAnnotation.Title ?? "Source",
                        Url = uriAnnotation.Uri?.ToString(),
                        StartIndex = uriAnnotation.StartIndex,
                        EndIndex = uriAnnotation.EndIndex
                    },
                    
                    FileCitationMessageAnnotation fileCitation => new AnnotationInfo
                    {
                        Type = "file_citation",
                        Label = fileCitation.Filename ?? fileCitation.FileId ?? "File",
                        FileId = fileCitation.FileId,
                        StartIndex = fileCitation.Index,
                        EndIndex = fileCitation.Index,
                        Quote = fileSearchQuotes?.TryGetValue(fileCitation.FileId ?? string.Empty, out var quote) == true 
                            ? quote : null
                    },
                    
                    FilePathMessageAnnotation filePath => new AnnotationInfo
                    {
                        Type = "file_path",
                        Label = filePath.FileId?.Split('/').LastOrDefault() ?? "Generated File",
                        FileId = filePath.FileId,
                        StartIndex = filePath.Index,
                        EndIndex = filePath.Index
                    },
                    
                    ContainerFileCitationMessageAnnotation containerCitation => new AnnotationInfo
                    {
                        Type = "container_file_citation",
                        Label = containerCitation.Filename ?? "Container File",
                        FileId = containerCitation.FileId,
                        ContainerId = containerCitation.ContainerId,
                        StartIndex = containerCitation.StartIndex,
                        EndIndex = containerCitation.EndIndex,
                        Quote = fileSearchQuotes?.TryGetValue(containerCitation.FileId ?? string.Empty, out var containerQuote) == true 
                            ? containerQuote : null
                    },
                    
                    _ => null
                };
                
                if (annotationInfo != null)
                    annotations.Add(annotationInfo);
            }
        }

        return annotations;
    }

    /// <summary>
    /// Create a new conversation for the agent.
    /// Uses ProjectConversation from Azure.AI.Projects for server-managed state.
    /// </summary>
    public async Task<string> CreateConversationAsync(string? firstMessage = null, CancellationToken cancellationToken = default)
    {
        ObjectDisposedException.ThrowIf(_disposed, this);

        try
        {
            _logger.LogInformation("Creating new conversation");
            
            ProjectConversationCreationOptions conversationOptions = new();

            if (!string.IsNullOrEmpty(firstMessage))
            {
                // Store title in metadata (truncate to 50 chars)
                var title = firstMessage.Length > 50 
                    ? firstMessage[..50] + "..."
                    : firstMessage;
                conversationOptions.Metadata["title"] = title;
            }

            ProjectConversation conversation
                = await GetProjectClient().ProjectOpenAIClient.GetProjectConversationsClient().CreateProjectConversationAsync(
                    conversationOptions,
                    cancellationToken);

            _logger.LogInformation(
                "Created conversation: {ConversationId}", 
                conversation.Id);
            return conversation.Id;
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("Conversation creation was cancelled");
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create conversation");
            throw;
        }
    }

    /// <summary>
    /// List conversations for the current agent.
    /// </summary>
    public async Task<List<ConversationSummary>> ListConversationsAsync(int limit = 20, CancellationToken cancellationToken = default)
    {
        ObjectDisposedException.ThrowIf(_disposed, this);

        try
        {
            _logger.LogInformation("Listing conversations (limit={Limit})", limit);

            // Pin to the same resolved version metadata/streaming use.
            var resolvedAgent = await GetAgentAsync(cancellationToken);
            var resolvedVersion = _configuredAgentVersion ?? resolvedAgent.Version;

            var conversations = new List<ConversationSummary>();
            // Fetch limit+1 to detect if more conversations exist beyond the requested page
            var fetchLimit = limit + 1;
            await foreach (var conv in GetProjectClient().ProjectOpenAIClient.GetProjectConversationsClient().GetProjectConversationsAsync(
                new AgentReference(_agentId, resolvedVersion), cancellationToken: cancellationToken))
            {
                conversations.Add(new ConversationSummary
                {
                    Id = conv.Id,
                    Title = conv.Metadata?.TryGetValue("title", out var title) == true ? title : null,
                    CreatedAt = conv.CreatedAt.ToUnixTimeSeconds()
                });

                if (conversations.Count >= fetchLimit)
                    break;
            }

            _logger.LogInformation("Found {Count} conversations", conversations.Count);
            return conversations;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to list conversations");
            throw;
        }
    }

    /// <summary>
    /// Get messages for a specific conversation.
    /// </summary>
    public async Task<List<ConversationMessageInfo>> GetConversationMessagesAsync(
        string conversationId,
        CancellationToken cancellationToken = default)
    {
        ObjectDisposedException.ThrowIf(_disposed, this);

        try
        {
            _logger.LogInformation("Getting messages for conversation: {ConversationId}", conversationId);

            var messages = new List<ConversationMessageInfo>();

            // Filter to message items only
            await foreach (var item in GetProjectClient().ProjectOpenAIClient.GetProjectConversationsClient().GetProjectConversationItemsAsync(
                conversationId, itemKind: AgentResponseItemKind.Message, cancellationToken: cancellationToken))
            {
                var responseItem = item.AsResponseResultItem();
                if (responseItem is MessageResponseItem messageItem)
                {
                    var content = string.Join("", messageItem.Content
                        .Where(c => c.Text != null)
                        .Select(c => c.Text));

                    messages.Add(new ConversationMessageInfo
                    {
                        Role = messageItem.Role.ToString().ToLowerInvariant(),
                        Content = content
                    });
                }
            }

            _logger.LogInformation("Found {Count} messages in conversation {ConversationId}", messages.Count, conversationId);
            messages.Reverse();
            return messages;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get messages for conversation: {ConversationId}", conversationId);
            throw;
        }
    }

    /// <summary>
    /// Delete a conversation.
    /// </summary>
    /// <remarks>
    /// TODO: The Azure.AI.Projects SDK does not expose a delete conversation API.
    /// This method is a stub that will need to be updated when the SDK adds delete support.
    /// </remarks>
    public Task DeleteConversationAsync(string conversationId, CancellationToken cancellationToken = default)
    {
        ObjectDisposedException.ThrowIf(_disposed, this);

        _logger.LogWarning(
            "DeleteConversationAsync is not yet supported by the SDK. ConversationId: {ConversationId}",
            conversationId);

        // TODO: Replace with actual SDK call when available.
        // The ProjectConversationsClient currently only supports Create, Get, List, and Update.
        throw new NotSupportedException(
            "Conversation deletion is not yet supported by the Azure.AI.Projects SDK.");
    }

    /// <summary>
    /// Download a file generated by code interpreter or other tools.
    /// Container files (with containerId) use the REST API: GET /openai/v1/containers/{containerId}/files/{fileId}/content.
    /// Standard files use the OpenAI FileClient.
    /// </summary>
    public async Task<(BinaryData Content, string FileName)> DownloadFileAsync(
        string fileId,
        string? containerId = null,
        CancellationToken cancellationToken = default)
    {
        ObjectDisposedException.ThrowIf(_disposed, this);

        try
        {
            if (!string.IsNullOrEmpty(containerId))
            {
                return await DownloadContainerFileAsync(fileId, containerId, cancellationToken);
            }

            _logger.LogInformation("Downloading standard file: {FileId}", fileId);
            var fileClient = GetProjectClient().ProjectOpenAIClient.GetOpenAIFileClient();
            var fileContent = await fileClient.DownloadFileAsync(fileId, cancellationToken);
            var fileInfo = await fileClient.GetFileAsync(fileId, cancellationToken);
            var fileName = fileInfo.Value?.Filename ?? $"{fileId}.bin";
            _logger.LogInformation("Downloaded file: {FileId}, Name: {FileName}, Size: {Size} bytes",
                fileId, fileName, fileContent.Value.ToMemory().Length);
            return (fileContent.Value, fileName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to download file {FileId}. Error: {Error}", fileId, ex.Message);
            throw;
        }
    }

    /// <summary>
    /// Download a container file via REST API.
    /// Endpoint: GET {projectEndpoint}/openai/v1/containers/{containerId}/files/{fileId}/content
    /// </summary>
    private async Task<(BinaryData Content, string FileName)> DownloadContainerFileAsync(
        string fileId,
        string containerId,
        CancellationToken cancellationToken)
    {
        _logger.LogInformation("Downloading container file: {FileId} from container: {ContainerId}", fileId, containerId);

        // Reuse the same credential as the project client (MI or OBO)
        TokenCredential credential;
        if (_useObo)
        {
            var userToken = ExtractBearerToken();
            credential = CreateOboCredential(userToken ?? throw new InvalidOperationException("OBO requires bearer token"));
        }
        else
        {
            credential = _fallbackCredential;
        }

        var tokenRequestContext = new TokenRequestContext(["https://ai.azure.com/.default"]);
        var accessToken = await credential.GetTokenAsync(tokenRequestContext, cancellationToken);

        var requestUrl = $"{_agentEndpoint.TrimEnd('/')}/openai/v1/containers/{Uri.EscapeDataString(containerId)}/files/{Uri.EscapeDataString(fileId)}/content";
        using var httpClient = _httpClientFactory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Get, requestUrl);
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken.Token);

        var response = await httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();

        var bytes = await response.Content.ReadAsByteArrayAsync(cancellationToken);

        // Try to extract filename from Content-Disposition header, fall back to fileId
        var fileName = $"{fileId}.bin";
        if (response.Content.Headers.ContentDisposition?.FileName is { } headerFileName)
        {
            fileName = headerFileName.Trim('"');
        }

        _logger.LogInformation("Downloaded container file: {FileId}, Name: {FileName}, Size: {Size} bytes",
            fileId, fileName, bytes.Length);
        return (BinaryData.FromBytes(bytes), fileName);
    }

    /// <summary>
    /// Get the agent metadata (name, description, etc.) for display in UI.
    /// Reads directly from the cached ProjectsAgentVersion.
    /// </summary>
    public async Task<AgentMetadataResponse> GetAgentMetadataAsync(CancellationToken cancellationToken = default)
    {
        ObjectDisposedException.ThrowIf(_disposed, this);

        var agentVersion = await GetAgentAsync(cancellationToken);

        if (s_cachedMetadata != null)
            return s_cachedMetadata;

        var definition = agentVersion.Definition as DeclarativeAgentDefinition;
        var metadata = agentVersion.Metadata?.ToDictionary(kvp => kvp.Key, kvp => kvp.Value);

        // Log metadata keys at debug level for troubleshooting
        if (metadata != null && metadata.Count > 0)
        {
            _logger.LogDebug("Agent metadata keys: {Keys}", string.Join(", ", metadata.Keys));
        }

        // Parse starter prompts from metadata
        List<string>? starterPrompts = ParseStarterPrompts(metadata);

        s_cachedMetadata = new AgentMetadataResponse
        {
            Id = _agentId,
            Object = "agent",
            CreatedAt = agentVersion.CreatedAt.ToUnixTimeSeconds(),
            Name = agentVersion.Name ?? "AI Assistant",
            Description = agentVersion.Description,
            Model = definition?.Model ?? string.Empty,
            Instructions = definition?.Instructions ?? string.Empty,
            Metadata = metadata,
            StarterPrompts = starterPrompts
        };

        return s_cachedMetadata;
    }

    /// <summary>
    /// Parse starter prompts from agent metadata.
    /// Microsoft Foundry stores starter prompts as newline-separated text in the "starterPrompts" metadata key.
    /// Example: "How's the weather?\nIs your fridge running?\nTell me a joke"
    /// </summary>
    private List<string>? ParseStarterPrompts(Dictionary<string, string>? metadata)
    {
        if (metadata == null)
            return null;

        // Microsoft Foundry uses camelCase "starterPrompts" key with newline-separated values
        if (!metadata.TryGetValue("starterPrompts", out var starterPromptsValue))
            return null;

        if (string.IsNullOrWhiteSpace(starterPromptsValue))
            return null;

        // Split by newlines and filter out empty entries
        var prompts = starterPromptsValue
            .Split(new[] { '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries)
            .Select(p => p.Trim())
            .Where(p => !string.IsNullOrEmpty(p))
            .ToList();

        if (prompts.Count > 0)
        {
            _logger.LogDebug("Parsed {Count} starter prompts from agent metadata", prompts.Count);
            return prompts;
        }

        return null;
    }

    /// <summary>
    /// Get basic agent info string (for debugging).
    /// </summary>
    public async Task<string> GetAgentInfoAsync(CancellationToken cancellationToken = default)
    {
        ObjectDisposedException.ThrowIf(_disposed, this);

        var agentVersion = await GetAgentAsync(cancellationToken);
        return agentVersion.Name ?? _agentId;
    }

    /// <summary>
    /// Get token usage from the last streaming response.
    /// </summary>
    public (int InputTokens, int OutputTokens, int TotalTokens)? GetLastUsage() =>
        _lastUsage is null ? null : (_lastUsage.InputTokenCount, _lastUsage.OutputTokenCount, _lastUsage.TotalTokenCount);

    /// <summary>
    /// Returns a count and total byte size of files uploaded by this web app (identified by
    /// filename prefix <see cref="WebAppUploadFilenamePrefix"/>) that are still stored in the
    /// Foundry project. Uses <see cref="FilePurpose.Assistants"/> because that is the purpose
    /// under which <see cref="BuildUserMessageAsync"/> stores image uploads.
    /// </summary>
    public async Task<UploadedFilesInfo> ListUploadedFilesAsync(CancellationToken cancellationToken = default)
    {
        ObjectDisposedException.ThrowIf(_disposed, this);

        var fileClient = GetProjectClient().ProjectOpenAIClient.GetOpenAIFileClient();
        var result = await fileClient.GetFilesAsync(FilePurpose.Assistants, cancellationToken);

        int count = 0;
        long totalBytes = 0;
        foreach (var file in result.Value)
        {
            if (file.Filename != null && file.Filename.StartsWith(WebAppUploadFilenamePrefix, StringComparison.Ordinal))
            {
                count++;
                totalBytes += file.SizeInBytesLong ?? file.SizeInBytes ?? 0;
            }
        }

        _logger.LogInformation("ListUploadedFiles: {Count} files, {TotalBytes} bytes", count, totalBytes);
        return new UploadedFilesInfo(count, totalBytes);
    }

    /// <summary>
    /// Deletes every file in the Foundry project whose filename begins with
    /// <see cref="WebAppUploadFilenamePrefix"/>. Intended as a user-triggered cleanup
    /// because the GA Files API does not expose <c>expires_after</c> on upload — see README
    /// "Known limitations". Returns counts of successful and failed deletions; failures are
    /// logged but do not abort the loop.
    /// </summary>
    public async Task<UploadedFilesCleanupResult> CleanupUploadedFilesAsync(CancellationToken cancellationToken = default)
    {
        ObjectDisposedException.ThrowIf(_disposed, this);

        var fileClient = GetProjectClient().ProjectOpenAIClient.GetOpenAIFileClient();
        var result = await fileClient.GetFilesAsync(FilePurpose.Assistants, cancellationToken);

        int deleted = 0;
        int failed = 0;
        foreach (var file in result.Value)
        {
            if (file.Filename == null || !file.Filename.StartsWith(WebAppUploadFilenamePrefix, StringComparison.Ordinal))
            {
                continue;
            }

            cancellationToken.ThrowIfCancellationRequested();

            try
            {
                await fileClient.DeleteFileAsync(file.Id, cancellationToken);
                deleted++;
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch (Exception ex)
            {
                failed++;
                _logger.LogWarning(ex, "Failed to delete uploaded file {FileId} ({FileName})", file.Id, file.Filename);
            }
        }

        _logger.LogInformation("CleanupUploadedFiles: deleted={Deleted} failed={Failed}", deleted, failed);
        return new UploadedFilesCleanupResult(deleted, failed);
    }

    private static readonly Dictionary<string, string> NormalizedToCanonicalFields = new(StringComparer.OrdinalIgnoreCase)
    {
        { "varnomecompleto", "varNomeCompleto" },
        { "varcpf", "varCPF" },
        { "vardatanascimento", "varDataNascimento" },
        { "varemail", "varEmail" },
        { "vartelefone", "varTelefone" },
        { "varnumerocasa", "varNumeroCasa" },
        { "varsexo", "varSexo" },
        { "varestadocivil", "varEstadoCivil" },
        { "varnivelescolar", "varNivelEscolar" },
        { "varmodalidadeensino", "varModalidadeEnsino" },
        { "varturnoensino", "varTurnoEnsino" },
        { "varcep", "varCEP" },
        { "varlogradouro", "varLogradouro" },
        { "varbairro", "varBairro" },
        { "varcidade", "varCidade" },
        { "varestado", "varEstado" },
        { "varinstituicaonome", "varInstituicaoNome" },
        { "varperiodocursando", "varPeriodoCursando" }
    };

    private class FieldProcessResult
    {
        public bool IsValid { get; set; }
        public string? Message { get; set; }
        public Dictionary<string, string>? FieldUpdates { get; set; }
    }

    private async Task<FieldProcessResult> ProcessAndValidateFieldAsync(string field, string value)
    {
        var result = new FieldProcessResult { IsValid = true };
        
        if (!NormalizedToCanonicalFields.TryGetValue(field, out string? canonicalField))
        {
            result.IsValid = false;
            return result;
        }
        
        if (string.IsNullOrEmpty(value) || value.Equals("null", StringComparison.OrdinalIgnoreCase) || value.Equals("undefined", StringComparison.OrdinalIgnoreCase))
        {
            result.IsValid = false;
            return result;
        }

        string canonicalLower = canonicalField.ToLowerInvariant();

        if (canonicalLower == "varcpf")
        {
            string cleanCpf = new string(value.Where(char.IsDigit).ToArray());
            if (cleanCpf.Length == 11)
            {
                string formattedCpf = $"{cleanCpf[..3]}.{cleanCpf[3..6]}.{cleanCpf[6..9]}-{cleanCpf[9..]}";
                result.FieldUpdates = new Dictionary<string, string> { { canonicalField, formattedCpf } };
            }
            else
            {
                result.FieldUpdates = new Dictionary<string, string> { { canonicalField, value } };
            }
        }
        else if (canonicalLower == "varemail")
        {
            if (!value.Contains("@") || !value.Contains("."))
            {
                result.IsValid = false;
                result.Message = "\n*(Zoggy: O formato de e-mail fornecido parece inválido. Por favor, verifique-o.)*\n";
            }
            else
            {
                result.FieldUpdates = new Dictionary<string, string> { { canonicalField, value } };
            }
        }
        else if (canonicalLower == "vartelefone")
        {
            string cleanPhone = new string(value.Where(char.IsDigit).ToArray());
            if (cleanPhone.Length != 10 && cleanPhone.Length != 11)
            {
                result.IsValid = false;
                result.Message = "\n*(Zoggy: O telefone deve conter 10 ou 11 dígitos com o DDD.)*\n";
            }
            else
            {
                string formattedPhone = cleanPhone.Length == 11
                    ? $"({cleanPhone[..2]}) {cleanPhone[2..7]}-{cleanPhone[7..]}"
                    : $"({cleanPhone[..2]}) {cleanPhone[2..6]}-{cleanPhone[6..]}";
                result.FieldUpdates = new Dictionary<string, string> { { canonicalField, formattedPhone } };
            }
        }
        else if (canonicalLower == "vardatanascimento")
        {
            string cleanDate = new string(value.Where(char.IsDigit).ToArray());
            if (cleanDate.Length != 8)
            {
                result.IsValid = false;
                result.Message = "\n*(Zoggy: A data de nascimento deve conter exatamente 8 dígitos no formato DD/MM/AAAA.)*\n";
            }
            else
            {
                string dayStr = cleanDate[..2];
                string monthStr = cleanDate[2..4];
                string yearStr = cleanDate[4..];
                string dateStr = $"{dayStr}/{monthStr}/{yearStr}";
                
                if (System.DateTime.TryParseExact(dateStr, "dd/MM/yyyy", System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out _))
                {
                    result.FieldUpdates = new Dictionary<string, string> { { canonicalField, dateStr } };
                }
                else
                {
                    result.IsValid = false;
                    result.Message = "\n*(Zoggy: A data de nascimento fornecida não é uma data válida do calendário.)*\n";
                }
            }
        }
        else if (canonicalLower == "varcep")
        {
            string cleanCep = new string(value.Where(char.IsDigit).ToArray());
            if (cleanCep.Length != 8)
            {
                result.IsValid = false;
                result.Message = "\n*(Zoggy: O CEP deve conter exatamente 8 dígitos.)*\n";
            }
            else
            {
                var lookup = await LookupCepAsync(cleanCep);
                if (lookup.Success && lookup.FieldUpdates != null)
                {
                    result.FieldUpdates = lookup.FieldUpdates;
                    result.Message = lookup.Message;
                }
                else
                {
                    result.IsValid = false;
                    result.Message = lookup.Message ?? "\n*(Zoggy: Não foi possível obter o endereço para o CEP informado.)*\n";
                }
            }
        }
        else if (canonicalLower == "varnumerocasa")
        {
            string cleanNum = new string(value.Where(char.IsDigit).ToArray());
            if (string.IsNullOrEmpty(cleanNum))
            {
                result.IsValid = false;
                result.Message = "\n*(Zoggy: O número da casa deve conter apenas dígitos numéricos.)*\n";
            }
            else
            {
                result.FieldUpdates = new Dictionary<string, string> { { canonicalField, cleanNum } };
            }
        }
        else
        {
            result.FieldUpdates = new Dictionary<string, string> { { canonicalField, value } };
        }

        return result;
    }

    private static bool IsValidCpf(string cpf)
    {
        if (cpf.Length != 11) return false;
        if (new string(cpf[0], 11) == cpf) return false;

        int[] tempCpf = new int[11];
        for (int i = 0; i < 11; i++)
            tempCpf[i] = cpf[i] - '0';

        int sum = 0;
        for (int i = 0; i < 9; i++)
            sum += tempCpf[i] * (10 - i);
            
        int r = (sum * 10) % 11;
        if (r == 10) r = 0;
        if (r != tempCpf[9]) return false;

        sum = 0;
        for (int i = 0; i < 10; i++)
            sum += tempCpf[i] * (11 - i);
            
        r = (sum * 10) % 11;
        if (r == 10) r = 0;
        if (r != tempCpf[10]) return false;

        return true;
    }

    private class CepLookupResult
    {
        public bool Success { get; set; }
        public string? Message { get; set; }
        public Dictionary<string, string>? FieldUpdates { get; set; }
    }

    private async Task<CepLookupResult> LookupCepAsync(string cep)
    {
        try
        {
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(5);
            var response = await client.GetAsync($"https://viacep.com.br/ws/{cep}/json/");
            if (!response.IsSuccessStatusCode)
            {
                return new CepLookupResult { Success = false, Message = "\n*(Zoggy: Erro de rede ao buscar o CEP. Por favor, tente novamente.)*\n" };
            }

            string content = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(content);
            var root = doc.RootElement;
            
            if (root.TryGetProperty("erro", out var erroProp) && (erroProp.ValueKind == JsonValueKind.True || (erroProp.ValueKind == JsonValueKind.String && erroProp.GetString() == "true")))
            {
                return new CepLookupResult { Success = false, Message = "\n*(Zoggy: CEP não encontrado na base do ViaCEP.)*\n" };
            }

            string formattedCep = root.TryGetProperty("cep", out var c) ? c.GetString() ?? "" : cep;
            string logradouro = root.TryGetProperty("logradouro", out var l) ? l.GetString() ?? "" : "";
            string bairro = root.TryGetProperty("bairro", out var b) ? b.GetString() ?? "" : "";
            string cidade = root.TryGetProperty("localidade", out var loc) ? loc.GetString() ?? "" : "";
            string estado = root.TryGetProperty("uf", out var u) ? u.GetString() ?? "" : "";

            var updates = new Dictionary<string, string>
            {
                { "varCEP", formattedCep },
                { "varLogradouro", logradouro },
                { "varBairro", bairro },
                { "varCidade", cidade },
                { "varEstado", estado }
            };

            return new CepLookupResult
            {
                Success = true,
                FieldUpdates = updates,
                Message = $"\n*(Zoggy: CEP {formattedCep} localizado! Endereço: {logradouro}, {bairro}, {cidade} - {estado})*\n"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking CEP {Cep}", cep);
            return new CepLookupResult { Success = false, Message = "\n*(Zoggy: Não foi possível realizar a consulta do CEP no momento.)*\n" };
        }
    }

    private async Task<CepLookupResult> SearchCepAsync(string query)
    {
        var parts = query.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length < 3)
        {
            return new CepLookupResult 
            { 
                Success = false, 
                Message = "\n*(Zoggy: Formato de busca por endereço inválido. O agente deve fornecer no formato 'UF/Cidade/Logradouro'.)*\n" 
            };
        }

        string uf = parts[0].Trim();
        string cidade = Uri.EscapeDataString(parts[1].Trim());
        string logradouro = Uri.EscapeDataString(parts[2].Trim());

        if (uf.Length != 2)
        {
            return new CepLookupResult 
            { 
                Success = false, 
                Message = "\n*(Zoggy: O Estado (UF) para busca de endereço deve conter exatamente 2 letras, ex: SP.)*\n" 
            };
        }

        try
        {
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(5);
            
            string url = $"https://viacep.com.br/ws/{uf}/{cidade}/{logradouro}/json/";
            var response = await client.GetAsync(url);
            if (!response.IsSuccessStatusCode)
            {
                return new CepLookupResult { Success = false, Message = "\n*(Zoggy: Erro de rede ao buscar endereço. Por favor, tente novamente.)*\n" };
            }

            string content = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(content);
            
            if (doc.RootElement.ValueKind != JsonValueKind.Array || doc.RootElement.GetArrayLength() == 0)
            {
                return new CepLookupResult { Success = false, Message = $"\n*(Zoggy: Nenhum CEP correspondente encontrado para '{parts[2]}, {parts[1]} - {parts[0]}'.)*\n" };
            }

            var firstMatch = doc.RootElement[0];
            
            string cep = firstMatch.TryGetProperty("cep", out var c) ? c.GetString() ?? "" : "";
            string street = firstMatch.TryGetProperty("logradouro", out var l) ? l.GetString() ?? "" : "";
            string neighborhood = firstMatch.TryGetProperty("bairro", out var b) ? b.GetString() ?? "" : "";
            string city = firstMatch.TryGetProperty("localidade", out var loc) ? loc.GetString() ?? "" : "";
            string state = firstMatch.TryGetProperty("uf", out var u) ? u.GetString() ?? "" : "";

            var updates = new Dictionary<string, string>
            {
                { "varCEP", cep },
                { "varLogradouro", street },
                { "varBairro", neighborhood },
                { "varCidade", city },
                { "varEstado", state }
            };

            return new CepLookupResult
            {
                Success = true,
                FieldUpdates = updates,
                Message = $"\n*(Zoggy: Encontrei o endereço! CEP: {cep}, Logradouro: {street}, Bairro: {neighborhood}, Cidade: {city} - {state})*\n"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching address {Query}", query);
            return new CepLookupResult { Success = false, Message = "\n*(Zoggy: Ocorreu um erro ao pesquisar o endereço.)*\n" };
        }
    }

    public void Dispose()
    {
        if (!_disposed)
        {
            _disposed = true;
            // AIProjectClient does not implement IDisposable (verified via reflection on
            // Azure.AI.Projects assembly). No cleanup needed for _projectClient.
            _projectClient = null;
            _logger.LogDebug("AgentFrameworkService disposed");
        }
    }
}
