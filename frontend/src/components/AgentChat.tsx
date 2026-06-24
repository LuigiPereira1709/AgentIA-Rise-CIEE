import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Avatar, Popover, PopoverTrigger, PopoverSurface, Button, Text } from '@fluentui/react-components';
import { Navigation24Regular, Map24Regular, ChatAdd24Regular, ArrowLeft24Regular } from '@fluentui/react-icons';
import { ChatInterface } from './ChatInterface';
import { ConversationSidebar } from './ConversationSidebar';
import { SettingsPanel } from './core/SettingsPanel';
import { AgentIcon } from './core/AgentIcon';
import { AuxiliaryChatSidebar } from './chat/AuxiliaryChatSidebar';
import { GooseJourney } from './GooseJourney';
import { useAppState } from '../hooks/useAppState';
import { useAuth } from '../hooks/useAuth';
import { ChatService } from '../services/chatService';
import { useAppContext } from '../contexts/AppContext';
import { exportAsMarkdown, downloadMarkdown } from '../utils/exportConversation';
import { trackFeedback } from '../services/telemetry';
import { playMessageSentSound, playMessageReceivedSound } from '../utils/sounds';
import type { IChatItem } from '../types/chat';
import styles from './AgentChat.module.css';

interface AgentChatProps {
  agentId?: string;
  agentName?: string;
  agentDescription?: string;
  agentLogo?: string;
  starterPrompts?: string[];
  onNavigateToRegister?: () => void;
  onBack?: () => void;
}

export const AgentChat: React.FC<AgentChatProps> = ({ agentName = 'Assistente CIEE', agentDescription, agentLogo, starterPrompts, onNavigateToRegister, onBack }) => {
  const { chat, state } = useAppState();
  const { dispatch } = useAppContext();
  const { getAccessToken, login } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuxSidebarOpen, setIsAuxSidebarOpen] = useState(false);
  const [isJourneyOpen, setIsJourneyOpen] = useState(false);

  // Form state for Journey
  const [journeyFormData, setJourneyFormData] = useState({
    varNomeCompleto: '',
    varCPF: '',
    varDataNascimento: '',
    varEmail: '',
    varTelefone: '',
    varSexo: '',
    varEstadoCivil: '',
    varCEP: '',
    varLogradouro: '',
    varBairro: '',
    varCidade: '',
    varEstado: '',
    varNumeroCasa: '',
    varNivelEscolar: '',
    varInstituicaoNome: '',
    varPeriodoCursando: '',
    varModalidadeEnsino: '',
    varTurnoEnsino: ''
  });

  const journeyStep = useMemo(() => {
    const p0Fields = ['varNomeCompleto', 'varCPF', 'varDataNascimento', 'varSexo', 'varEstadoCivil'];
    const p1Fields = ['varEmail', 'varTelefone', 'varCEP', 'varLogradouro', 'varBairro', 'varCidade', 'varEstado', 'varNumeroCasa'];
    const p2Fields = ['varNivelEscolar', 'varInstituicaoNome', 'varPeriodoCursando', 'varModalidadeEnsino', 'varTurnoEnsino'];

    const p0Done = p0Fields.every(f => (journeyFormData as any)[f]?.trim() !== '');
    const p1Done = p1Fields.every(f => (journeyFormData as any)[f]?.trim() !== '');
    const p2Done = p2Fields.every(f => (journeyFormData as any)[f]?.trim() !== '');

    if (p0Done && p1Done && p2Done) return 3;
    if (p0Done && p1Done) return 2;
    if (p0Done) return 1;
    return 0;
  }, [journeyFormData]);

  const handleJourneyFieldChange = (field: string, value: string) => {
    setJourneyFormData(prev => ({ ...prev, [field]: value }));
  };

  // Create service instances
  const apiUrl = import.meta.env.VITE_API_URL || '/api';
  
  const chatService = useMemo(() => {
    const service = new ChatService(apiUrl, getAccessToken, dispatch);
    service.onFormUpdate = (field, value) => {
      handleJourneyFieldChange(field, value);
    };
    service.getFormState = () => journeyFormData;
    service.onLogin = login;
    return service;
  }, [apiUrl, getAccessToken, dispatch, journeyFormData, login]);

  const prevMessagesLengthRef = useRef(chat.messages.length);
  useEffect(() => {
    if (chat.messages.length > prevMessagesLengthRef.current) {
      const lastMessage = chat.messages[chat.messages.length - 1];
      if (lastMessage.role === 'assistant') {
        playMessageReceivedSound();
      }
    }
    prevMessagesLengthRef.current = chat.messages.length;
  }, [chat.messages]);

  const handleSendMessage = async (text: string, files?: File[]) => {
    playMessageSentSound();
    if (chat.status === 'streaming' || chat.status === 'sending') {
      dispatch({ type: 'CHAT_QUEUE_MESSAGE', text, files });
      return;
    }
    await chatService.sendMessage(text, chat.currentConversationId, files);
  };

  // Drain the queue when the stream completes
  const pendingRef = useRef(chat.pendingMessages);
  pendingRef.current = chat.pendingMessages;

  useEffect(() => {
    if (chat.status === 'idle' && pendingRef.current.length > 0) {
      const combinedText = pendingRef.current.map(m => m.text).join('\n\n');
      const combinedFiles = pendingRef.current.flatMap(m => m.files || []);
      dispatch({ type: 'CHAT_CLEAR_QUEUE' });
      chatService.sendMessage(
        combinedText,
        chat.currentConversationId,
        combinedFiles.length > 0 ? combinedFiles : undefined
      );
    }
  }, [chat.status, chat.currentConversationId, chatService, dispatch]);

  const handleDequeueMessage = (index: number) => {
    dispatch({ type: 'CHAT_DEQUEUE_MESSAGE', index });
  };

  const handleClearError = () => {
    chatService.clearError();
  };

  const handleNewChat = () => {
    chatService.cancelStream();
    chatService.clearChat();
  };

  const handleCancelStream = () => {
    chatService.cancelStream();
  };

  const handleRecoveredInputConsumed = () => {
    dispatch({ type: 'CHAT_CONSUMED_RECOVERED_INPUT' });
  };

  const handleRegenerate = useCallback(() => {
    chatService.cancelStream();
    dispatch({ type: 'CHAT_REGENERATE' });
  }, [chatService, dispatch]);



  const handleFeedback = useCallback((messageId: string, rating: 'positive' | 'negative') => {
    trackFeedback(messageId, chat.currentConversationId, rating);
  }, [chat.currentConversationId]);

  const handleCancelEdit = useCallback(() => {
    dispatch({ type: 'CHAT_CANCEL_EDIT' });
  }, [dispatch]);

  const handleDownloadFile = useCallback(async (fileId: string, fileName: string, containerId?: string) => {
    try {
      await chatService.downloadFile(fileId, fileName, containerId);
    } catch (err) {
      dispatch({
        type: 'CHAT_ERROR',
        error: { code: 'NETWORK', message: `Failed to download ${fileName}: ${err instanceof Error ? err.message : 'Unknown error'}`, recoverable: true },
      });
    }
  }, [chatService, dispatch]);

  // Auto-send when regenerateText is set (from regenerate or edit actions)
  useEffect(() => {
    if (chat.regenerateText?.trim() && chat.status === 'idle') {
      const text = chat.regenerateText;
      dispatch({ type: 'CHAT_CONSUMED_REGENERATE' });
      chatService.sendMessage(text, chat.currentConversationId);
    }
  }, [chat.regenerateText, chat.status, chat.currentConversationId, chatService, dispatch]);

  const handleMcpApproval = async (
    approvalRequestId: string,
    approved: boolean,
    previousResponseId: string,
    conversationId: string
  ) => {
    dispatch({ type: 'CHAT_MCP_APPROVAL_RESOLVED', approvalRequestId, resolved: approved ? 'approved' : 'rejected' });
    try {
      await chatService.sendMcpApproval(approvalRequestId, approved, previousResponseId, conversationId);
    } catch {
      // Rollback so user can retry — clears resolved state, restoring buttons
      dispatch({ type: 'CHAT_MCP_APPROVAL_RESOLVED', approvalRequestId, resolved: undefined });
    }
  };

  const handleExportConversation = useCallback(() => {
    const md = exportAsMarkdown(chat.messages, agentName);
    downloadMarkdown(md);
  }, [chat.messages, agentName]);

  const handleToggleSidebar = useCallback(async () => {
    const willOpen = !state.conversations.sidebarOpen;
    dispatch({ type: 'CONVERSATIONS_TOGGLE_SIDEBAR' });
    if (willOpen) {
      dispatch({ type: 'CONVERSATIONS_LOADING' });
      try {
        const result = await chatService.listConversations();
        dispatch({ type: 'CONVERSATIONS_SET_LIST', conversations: result.conversations, hasMore: result.hasMore });
      } catch (error) {
        console.error('Failed to load conversations:', error);
        dispatch({ type: 'CONVERSATIONS_SET_LIST', conversations: [], hasMore: false });
      }
    }
  }, [state.conversations.sidebarOpen, dispatch, chatService]);

  const handleSidebarOpenChange = useCallback((open: boolean) => {
    if (!open && state.conversations.sidebarOpen) {
      dispatch({ type: 'CONVERSATIONS_TOGGLE_SIDEBAR' });
    }
  }, [state.conversations.sidebarOpen, dispatch]);

  const handleLoadMoreConversations = useCallback(async () => {
    dispatch({ type: 'CONVERSATIONS_LOADING' });
    try {
      const currentCount = state.conversations.list.length;
      const result = await chatService.listConversations(currentCount + 20);
      // Slice off items we already have and append only new ones
      const newItems = result.conversations.slice(currentCount);
      // If no new items returned (e.g., backend limit cap), stop pagination
      const hasMore = newItems.length > 0 && result.hasMore;
      dispatch({ type: 'CONVERSATIONS_SET_LIST', conversations: newItems, hasMore, append: true });
    } catch (error) {
      console.error('Failed to load more conversations:', error);
      dispatch({ type: 'CONVERSATIONS_LOADING_DONE' });
    }
  }, [state.conversations.list.length, dispatch, chatService]);

  const handleSelectConversation = useCallback(async (conversationId: string) => {
    try {
      chatService.cancelStream();
      const messages = await chatService.getConversationMessages(conversationId);
      const conv = state.conversations.list.find(c => c.id === conversationId);
      const fallbackTime = conv ? new Date(conv.createdAt).toISOString() : new Date().toISOString();

      const chatItems: IChatItem[] = messages
        .filter(msg => msg.role === 'user' || msg.role === 'assistant')
        .map((msg, index) => ({
          id: `${conversationId}-${index}`,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          more: { time: msg.createdAt ? new Date(msg.createdAt).toISOString() : fallbackTime },
        }));

      dispatch({ type: 'CHAT_LOAD_CONVERSATION', conversationId, messages: chatItems });
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  }, [chatService, dispatch, state.conversations.list]);

  const handleDeleteConversation = useCallback(async (conversationId: string) => {
    // Remove from UI immediately (optimistic)
    dispatch({ type: 'CONVERSATIONS_REMOVE', conversationId });
    if (chat.currentConversationId === conversationId) {
      chatService.clearChat();
    }
    // Attempt server-side delete (may not be supported yet)
    try {
      await chatService.deleteConversation(conversationId);
    } catch (error) {
      // 501 = SDK doesn't support delete yet — item is hidden locally only
      console.warn('Server-side conversation delete not available:', error);
    }
  }, [chatService, dispatch, chat.currentConversationId]);

  return (
    <div className={styles.content}>
      {/* ── Top navbar ── */}
      <header className={styles.chatNavbar}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Popover positioning="below-start" withArrow>
            <PopoverTrigger disableButtonEnhancement>
              <button
                id="btn-open-menu"
                className={styles.backToMenuBtn}
                aria-label="Abrir Menu"
              >
                <Navigation24Regular />
              </button>
            </PopoverTrigger>
            <PopoverSurface style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px', minWidth: '240px' }}>
              <Text weight="semibold" size={400} style={{ marginBottom: '8px' }}>Opções do Cadastro</Text>
              
              <Button
                appearance="primary"
                icon={<ChatAdd24Regular />}
                size="large"
                style={{ width: '100%', justifyContent: 'flex-start' }}
                onClick={handleNewChat}
              >
                Recomeçar Cadastro
              </Button>
              
              {onBack && (
                <Button
                  appearance="outline"
                  icon={<ArrowLeft24Regular />}
                  size="large"
                  style={{ width: '100%', justifyContent: 'flex-start' }}
                  onClick={onBack}
                >
                  Voltar ao Início
                </Button>
              )}
            </PopoverSurface>
          </Popover>
          
          <button
            className={styles.backToMenuBtn}
            onClick={() => setIsJourneyOpen(!isJourneyOpen)}
            aria-label="Progresso da Jornada"
            title="Sua Jornada"
          >
            <Map24Regular />
          </button>
        </div>

          <div className={styles.navbarCenter}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className={styles.navbarAgentName} style={{ marginTop: '4px' }}>
                Assistente
              </span>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <AgentIcon size="small" logoUrl={agentLogo} />
              </div>
            </div>
            <span className={styles.navbarOnlineDot} />
          </div>

        </header>

      <div className={styles.bodyWrapper}>
        <div className={`${styles.mainContent} ${isAuxSidebarOpen ? styles.mainContentShifted : ''}`}>
          <ChatInterface 
            messages={chat.messages}
            status={chat.status}
            error={chat.error}
            streamingMessageId={chat.streamingMessageId}
            recoveredInput={chat.recoveredInput}
            recoveredAttachments={chat.recoveredAttachments}
            onSendMessage={handleSendMessage}
            onClearError={handleClearError}
            onRecoveredInputConsumed={handleRecoveredInputConsumed}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onNewChat={handleNewChat}
            onCancelStream={handleCancelStream}
            onMcpApproval={handleMcpApproval}
            onToggleSidebar={handleToggleSidebar}
            onExportConversation={handleExportConversation}
            onRegenerate={handleRegenerate}
            onCancelEdit={handleCancelEdit}
            isEditing={!!chat.editSnapshot}
            onFeedback={handleFeedback}
            onDownloadFile={handleDownloadFile}
            conversationId={chat.currentConversationId}
            pendingMessages={chat.pendingMessages}
            onDequeueMessage={handleDequeueMessage}
            hasMessages={chat.messages.length > 0}
            disabled={false}
            agentName={agentName}
            agentDescription={agentDescription}
            agentLogo={agentLogo}
            starterPrompts={starterPrompts}
          />
        </div>
        
        <AuxiliaryChatSidebar 
          isOpen={isAuxSidebarOpen} 
          onOpen={() => setIsAuxSidebarOpen(true)}
          onClose={() => setIsAuxSidebarOpen(false)} 
        />

        {isJourneyOpen && (
          <GooseJourney
            currentStep={journeyStep}
            formData={journeyFormData}
            isSubmitted={(journeyFormData as any).submit === 'true'}
            focusedField={null}
            onFieldChange={handleJourneyFieldChange}
          />
        )}
      </div>

      {/* Modals & Panels */}
      <SettingsPanel
        isOpen={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        chatService={chatService}
      />
    </div>
  );
};
