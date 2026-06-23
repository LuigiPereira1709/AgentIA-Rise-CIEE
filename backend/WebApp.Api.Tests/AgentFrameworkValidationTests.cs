using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using WebApp.Api.Services;

namespace WebApp.Api.Tests;

[TestClass]
public class AgentFrameworkValidationTests
{
    [TestMethod]
    [DataRow("84305766574", true)] // Valid mathematical CPF
    [DataRow("11111111111", false)] // Invalid repeating digits
    [DataRow("12345678900", false)] // Invalid checksum
    [DataRow("123", false)] // Too short
    [DataRow("", false)] // Empty
    public void IsValidCpf_TestCases(string cpf, bool expected)
    {
        var result = AgentFrameworkService.IsValidCpf(cpf);
        Assert.AreEqual(expected, result);
    }

    [TestMethod]
    [DataRow("luigi@gmail.com", true)]
    [DataRow("luigi.pereira@domain.co.uk", true)]
    [DataRow("luigi pereira 1001@gmail.com", false)] // Contains spaces
    [DataRow("luigi@gmail", false)] // Missing TLD dot format in rule
    [DataRow("@domain.com", false)] // Missing user part
    [DataRow("", false)]
    public void IsValidEmail_TestCases(string email, bool expected)
    {
        var result = AgentFrameworkService.IsValidEmail(email);
        Assert.AreEqual(expected, result);
    }

    [TestMethod]
    public async Task SearchCepByAddressAsync_UFNot2Chars_ReturnsErrorMessage()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                { "AI_AGENT_ENDPOINT", "http://dummy" },
                { "AI_AGENT_ID", "dummy" },
                { "AI_AGENT_MODEL", "dummy" },
                { "ASPNETCORE_ENVIRONMENT", "Development" }
            })
            .Build();

        var logger = new Microsoft.Extensions.Logging.Abstractions.NullLogger<AgentFrameworkService>();
        var httpFactory = new DummyHttpClientFactory();

        using var service = new AgentFrameworkService(config, logger, httpFactory);
        var result = await service.SearchCepByAddressAsync("SPP", "São Paulo", "Avenida Paulista");

        Assert.IsFalse(result.Success);
        Assert.IsTrue(result.Message?.Contains("deve conter exatamente 2 letras"));
    }

    private class DummyHttpClientFactory : System.Net.Http.IHttpClientFactory
    {
        public System.Net.Http.HttpClient CreateClient(string name) => new System.Net.Http.HttpClient();
    }
}
