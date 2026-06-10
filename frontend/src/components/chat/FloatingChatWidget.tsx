import React, { useState, useEffect, useRef } from 'react';
import { Button, Card, Textarea, Avatar, Spinner } from '@fluentui/react-components';
import { Chat24Regular, Dismiss24Regular, Send24Regular, Delete24Regular } from '@fluentui/react-icons';
import { useLocalChat } from '../../hooks/useLocalChat';
import { Markdown } from '../core/Markdown';
import styles from './FloatingChatWidget.module.css';

const GooseHeadIcon: React.FC<{ isChaos?: boolean }> = ({ isChaos = false }) => {
  return (
    <svg 
      viewBox="22 20 66 48" 
      width="28" 
      height="22" 
      style={{ overflow: 'visible' }}
    >
      {/* Head */}
      <circle 
        cx="46" 
        cy="44" 
        r="18" 
        fill="#ffffff" 
        stroke="#0c0f1d" 
        strokeWidth="2.5" 
      />
      {/* Cheek / Blush */}
      <circle cx="38" cy="50" r="3.5" fill="rgba(255, 90, 95, 0.4)" />
      
      {/* Eye */}
      {isChaos ? (
        <path d="M 42 38 L 50 44" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" />
      ) : (
        <circle cx="48" cy="40" r="2.5" fill="#000000" />
      )}

      {/* Beak */}
      <path d="M 60 46 Q 74 48 81 48 Q 68 48 60 46 Z" fill="#ff9f1c" stroke="#0c0f1d" strokeWidth="2" />
      <path d="M 60 38 Q 78 40 85 44 Q 70 48 60 46 Z" fill="#ff9f1c" stroke="#0c0f1d" strokeWidth="2" />
    </svg>
  );
};

export const FloatingChatWidget: React.FC<{ isChaosMode?: boolean }> = ({ isChaosMode = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { messages, status, error, sendMessage, clearChat } = useLocalChat();
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);

  const isStreaming = status === 'streaming';
  const isBusy = status === 'sending' || isStreaming;

  // Auto-scroll to the bottom of the chat list
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Escape key and Click Outside listeners to close the widget
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (widgetRef.current && !widgetRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
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
    const textToSend = inputText;
    setInputText('');
    window.dispatchEvent(new Event('chat_message_sent'));
    await sendMessage(textToSend);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStarterPrompt = async (prompt: string) => {
    window.dispatchEvent(new Event('chat_message_sent'));
    await sendMessage(prompt);
  };

  return (
    <div ref={widgetRef} className={styles.widgetContainer}>
      {/* Floating Action Button (FAB) */}
      <Button
        shape="circular"
        appearance="primary"
        size="large"
        className={styles.fabButton}
        icon={isOpen ? <Dismiss24Regular /> : <Chat24Regular />}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Fechar assistente de chat" : "Abrir assistente de chat"}
      />

      {/* Chat Popover Panel */}
      {isOpen && (
        <Card className={`${styles.chatPopover} ${isChaosMode ? styles.chaosWidget : ''}`} appearance="filled">
          {/* Header */}
          <div className={styles.chatHeader}>
            <div className={styles.headerTitle}>
              {isChaosMode ? (
                <div className={styles.chaosAvatarWrapper}>
                  <GooseHeadIcon isChaos={true} />
                </div>
              ) : (
                <Avatar
                  size={28}
                  name="Assistente de Cadastro"
                  className={styles.avatar}
                  image={{ src: '/Avatar_Default.svg' }}
                />
              )}
              <div>
                <h4 className={styles.titleText}>
                  {isChaosMode ? "Assistente em Pânico! 😱" : "Assistente Virtual"}
                </h4>
                <span className={styles.subtitleText}>
                  {isChaosMode ? "O ganso dominou o sistema!" : "Tire suas dúvidas do cadastro"}
                </span>
              </div>
            </div>
            <div className={styles.headerActions}>
              <Button
                appearance="subtle"
                size="small"
                icon={<Delete24Regular />}
                onClick={clearChat}
                title="Limpar histórico"
                aria-label="Limpar histórico do chat"
              />
              <Button
                appearance="subtle"
                size="small"
                icon={<Dismiss24Regular />}
                onClick={() => setIsOpen(false)}
                title="Fechar"
                aria-label="Fechar assistente de chat"
              />
            </div>
          </div>

          {/* Messages Area */}
          <div className={styles.messagesList}>
            {messages.length === 0 ? (
              <div className={styles.welcomeContainer}>
                <p className={styles.welcomeText}>
                  Olá! Sou o assistente virtual. Posso te ajudar a preencher o formulário ou tirar qualquer dúvida sobre o cadastro.
                </p>
                <div className={styles.starterContainer}>
                  <p className={styles.starterLabel}>Perguntas frequentes:</p>
                  <button 
                    onClick={() => handleStarterPrompt("Como preencher o campo Organização?")}
                    className={styles.starterButton}
                  >
                    Como preencher o campo Organização?
                  </button>
                  <button 
                    onClick={() => handleStarterPrompt("Quais cargos são válidos para cadastro?")}
                    className={styles.starterButton}
                  >
                    Quais cargos são válidos?
                  </button>
                  <button 
                    onClick={() => handleStarterPrompt("Preciso de e-mail corporativo?")}
                    className={styles.starterButton}
                  >
                    Preciso de e-mail corporativo?
                  </button>
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`${styles.messageWrapper} ${
                    msg.role === 'user' ? styles.userWrapper : styles.assistantWrapper
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <Avatar
                      size={24}
                      name="Assistente"
                      className={styles.messageAvatar}
                      image={{ src: '/Avatar_Default.svg' }}
                    />
                  )}
                  <div
                    className={`${styles.messageBubble} ${
                      msg.role === 'user' ? styles.userBubble : styles.assistantBubble
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <span className={styles.userText}>{msg.content}</span>
                    ) : (
                      <Markdown content={msg.content || '...'} />
                    )}
                  </div>
                </div>
              ))
            )}

            {/* Loading / Sending Indicator */}
            {status === 'sending' && (
              <div className={styles.loaderContainer}>
                <Spinner size="tiny" label="Enviando..." />
              </div>
            )}
            {status === 'streaming' && messages[messages.length - 1]?.content === '' && (
              <div className={styles.loaderContainer}>
                <Spinner size="tiny" label="Pensando..." />
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className={styles.errorBubble}>
                Erro: {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className={styles.inputArea}>
            <Textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua dúvida aqui..."
              resize="none"
              rows={2}
              className={styles.textarea}
              disabled={status === 'sending'}
            />
            <Button
              appearance="primary"
              icon={<Send24Regular />}
              onClick={handleSend}
              disabled={!inputText.trim() || isBusy}
              aria-label="Enviar mensagem"
              className={styles.sendButton}
            />
          </div>
        </Card>
      )}
    </div>
  );
};
