import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@fluentui/react-components';
import { Dismiss24Regular, Send24Regular, Delete24Regular, Headset24Regular } from '@fluentui/react-icons';
import { useLocalChat } from '../../hooks/useLocalChat';
import { Markdown } from '../core/Markdown';
import { GooseHeadIcon } from '../RegistrationForm';
import styles from './AuxiliaryChatSidebar.module.css';

const AUX_PROMPTS = [
  'Me dê dicas do que perguntar',
  'Como uso o modo agente?',
  'Quais as limitações da IA principal?'
];

const formatTime = (date: Date) =>
  date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

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

interface AuxiliaryChatSidebarProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export const AuxiliaryChatSidebar: React.FC<AuxiliaryChatSidebarProps> = ({
  isOpen,
  onOpen,
  onClose
}) => {
  const { messages, status, error, sendMessage, clearChat } = useLocalChat({ apiPath: 'support/stream' });
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isStreaming = status === 'streaming';
  const isBusy = status === 'sending' || isStreaming;
  const showTyping = isBusy && (messages.length === 0 || messages[messages.length - 1]?.role === 'user');

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen, showTyping]);

  useEffect(() => {
    if (isOpen) setTimeout(() => textareaRef.current?.focus(), 100);
  }, [isOpen]);

  const handleSend = () => {
    if (!inputText.trim() || isBusy) return;
    sendMessage(inputText);
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStarterPrompt = (prompt: string) => {
    sendMessage(prompt);
  };

  return (
    <div className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>

      {/* ── Pull Tab (visible when closed) ── */}
      <button
        className={`${styles.pullTab} ${isOpen ? styles.pullTabHidden : ''}`}
        onClick={onOpen}
        aria-label="Abrir Suporte"
        title="Suporte / Ajuda"
      >
        <Headset24Regular className={styles.pullTabIcon} />
      </button>

      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.avatarGlow}>
            <GooseHeadIcon />
          </div>
          <span className={styles.headerTitle}>Lumi Assistente</span>
        </div>
        <div className={styles.headerActions}>
          {messages.length > 0 && (
            <Button
              appearance="subtle"
              icon={<Delete24Regular />}
              onClick={clearChat}
              aria-label="Limpar chat"
              title="Limpar chat"
              className={styles.iconButton}
            />
          )}
          <Button
            appearance="subtle"
            icon={<Dismiss24Regular />}
            onClick={onClose}
            aria-label="Fechar painel"
            className={styles.iconButton}
          />
        </div>
      </div>

      <div className={styles.messagesContainer}>
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>
              Estou aqui para te ajudar a extrair o melhor do Agente Principal! Selecione uma sugestão ou mande sua dúvida:
            </p>
            <div className={styles.starterPrompts}>
              {AUX_PROMPTS.map((prompt) => (
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

        {showTyping && <TypingIndicator />}
        {error && <div className={styles.errorBubble}>Erro: {error}</div>}
        <div ref={messagesEndRef} />
      </div>

      <div className={styles.inputArea}>
        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Peça ajuda à Coruja..."
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
  );
};
