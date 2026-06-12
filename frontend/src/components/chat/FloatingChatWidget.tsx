import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@fluentui/react-components';
import { Chat24Regular, Dismiss24Regular, Send24Regular, Delete24Regular } from '@fluentui/react-icons';
import { useLocalChat } from '../../hooks/useLocalChat';
import { Markdown } from '../core/Markdown';
import { GooseHeadIcon } from '../RegistrationForm';
import styles from './FloatingChatWidget.module.css';

// ── Typing indicator (3 animated dots) ───────────────────────────
const TypingIndicator: React.FC = () => (
  <div className={styles.gooseTypingWrapper}>
    <div className={styles.gooseTypingAvatar}>
      <GooseHeadIcon />
    </div>
    <div className={styles.typingBubble}>
      <span className={styles.dot} />
      <span className={styles.dot} />
      <span className={styles.dot} />
    </div>
  </div>
);

// ── Contextual prompts per registration step ──────────────────────
const STEP_PROMPTS: Record<number, { label: string; prompts: string[] }> = {
  0: {
    label: 'Dúvidas sobre Identidade',
    prompts: [
      'Posso usar meu e-mail pessoal?',
      'Qual formato de nome devo usar?',
      'Meu e-mail corporativo é obrigatório?'
    ]
  },
  1: {
    label: 'Dúvidas sobre Localização',
    prompts: [
      'Como preencher o campo Organização?',
      'Devo usar o nome completo da empresa?',
      'Posso colocar mais de uma empresa?'
    ]
  },
  2: {
    label: 'Dúvidas sobre o Cargo',
    prompts: [
      'Quais cargos são aceitos?',
      'E se eu tiver mais de um cargo?',
      'Posso usar cargo em inglês?'
    ]
  },
  3: {
    label: 'Pronto para enviar',
    prompts: [
      'Quanto tempo leva a aprovação?',
      'Como vou saber se fui aprovado?',
      'Posso editar meus dados depois?'
    ]
  }
};

// ── Helper: format timestamp ──────────────────────────────────────
const formatTime = (date: Date) =>
  date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

// ── Component ─────────────────────────────────────────────────────
interface FloatingChatWidgetProps {
  isChaosMode?: boolean;
  currentStep?: number;
}

export const FloatingChatWidget: React.FC<FloatingChatWidgetProps> = ({
  isChaosMode = false,
  currentStep = 0
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const { messages, status, error, sendMessage, clearChat } = useLocalChat();
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const prevMsgCount = useRef(messages.length);

  const isStreaming = status === 'streaming';
  const isBusy = status === 'sending' || isStreaming;
  const showTyping = isBusy && (messages.length === 0 || messages[messages.length - 1]?.role === 'user');

  // Mark unread when new assistant message arrives while closed
  useEffect(() => {
    if (!isOpen && messages.length > prevMsgCount.current) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.role === 'assistant') setHasUnread(true);
    }
    prevMsgCount.current = messages.length;
  }, [messages, isOpen]);

  // Clear unread on open
  useEffect(() => {
    if (isOpen) setHasUnread(false);
  }, [isOpen]);

  // Auto-scroll
  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen, showTyping]);

  // Focus on open
  useEffect(() => {
    if (isOpen) setTimeout(() => textareaRef.current?.focus(), 100);
  }, [isOpen]);

  // Escape + click outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    const handleClickOutside = (e: MouseEvent) => {
      if (widgetRef.current && !widgetRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSend = async () => {
    if (!inputText.trim() || isBusy) return;
    const text = inputText;
    setInputText('');
    window.dispatchEvent(new Event('chat_message_sent'));
    await sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleStarterPrompt = async (prompt: string) => {
    window.dispatchEvent(new Event('chat_message_sent'));
    await sendMessage(prompt);
  };

  const stepKey = Math.min(currentStep, 3) as 0 | 1 | 2 | 3;
  const contextualPrompts = STEP_PROMPTS[stepKey];

  return (
    <div ref={widgetRef} className={styles.widgetContainer}>

      {/* ── FAB ── */}
      <button
        className={`${styles.gooseFab} ${isChaosMode ? styles.chaosFab : ''} ${isOpen ? styles.fabOpen : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Fechar assistente' : 'Abrir assistente'}
        title={isOpen ? 'Fechar assistente' : 'Fala com o Ganso!'}
      >
        {isOpen
          ? <Dismiss24Regular style={{ color: '#ffffff', width: 22, height: 22 }} />
          : <Chat24Regular style={{ color: '#ffffff', width: 24, height: 24 }} />
        }
        {/* Unread badge */}
        {hasUnread && !isOpen && <span className={styles.unreadBadge} />}
      </button>

      {/* ── Chat Popover ── */}
      {isOpen && (
        <div className={`${styles.chatPopover} ${isChaosMode ? styles.chaosWidget : ''}`}>

          {/* Header */}
          <div className={styles.chatHeader}>
            <div className={styles.headerTitle}>
              <div className={styles.avatarWrapper}>
                <div className={styles.headIconContainer}>
                  <GooseHeadIcon isChaos={isChaosMode} />
                </div>
                <span className={styles.onlineDot} />
              </div>
              <div>
                <h4 className={styles.titleText}>
                  {isChaosMode ? 'Assistente em Pânico! 😱' : 'Assistente Virtual'}
                </h4>
                <span className={styles.subtitleText}>
                  {isChaosMode ? 'O ganso dominou o sistema!' : '● Online — Tire suas dúvidas'}
                </span>
              </div>
            </div>
            <div className={styles.headerActions}>
              <Button appearance="subtle" size="small" icon={<Delete24Regular />} onClick={clearChat} title="Limpar histórico" />
              <Button appearance="subtle" size="small" icon={<Dismiss24Regular />} onClick={() => setIsOpen(false)} title="Fechar" />
            </div>
          </div>

          {/* Messages */}
          <div className={styles.messagesList}>
            {messages.length === 0 ? (
              <div className={styles.welcomeContainer}>
                <p className={styles.welcomeText}>
                  Olá! 👋 Estou aqui para te ajudar no cadastro. Tem alguma dúvida?
                </p>
                <div className={styles.starterContainer}>
                  <p className={styles.starterLabel}>{contextualPrompts.label}:</p>
                  {contextualPrompts.prompts.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => handleStarterPrompt(prompt)}
                      className={styles.starterButton}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`${styles.messageWrapper} ${msg.role === 'user' ? styles.userWrapper : styles.assistantWrapper}`}
                >
                  {msg.role === 'assistant' && (
                    <div className={styles.miniAvatar}>
                      <GooseHeadIcon />
                    </div>
                  )}
                  <div className={`${styles.messageBubble} ${msg.role === 'user' ? styles.userBubble : styles.assistantBubble}`}>
                    {msg.role === 'user'
                      ? <span className={styles.userText}>{msg.content}</span>
                      : <Markdown content={msg.content || '...'} />
                    }
                    <span className={styles.timestamp}>{formatTime(new Date(msg.more?.time ?? Date.now()))}</span>
                  </div>
                </div>
              ))
            )}

            {/* 3-dot typing indicator */}
            {showTyping && <TypingIndicator />}

            {error && (
              <div className={styles.errorBubble}>Erro: {error}</div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className={styles.inputArea}>
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua dúvida aqui..."
              rows={2}
              className={styles.textarea}
              disabled={isBusy}
            />
            <button
              onClick={handleSend}
              disabled={!inputText.trim() || isBusy}
              aria-label="Enviar mensagem"
              className={`${styles.sendButton} ${inputText.trim() && !isBusy ? styles.sendActive : ''}`}
            >
              <Send24Regular />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
