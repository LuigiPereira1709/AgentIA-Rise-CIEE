import { useState, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { parseSseLine, splitSseBuffer } from '../utils/sseParser';
import type { IChatItem } from '../types/chat';

export interface UseLocalChatResult {
  messages: IChatItem[];
  status: 'idle' | 'sending' | 'streaming' | 'error';
  error: string | null;
  conversationId: string | null;
  sendMessage: (text: string) => Promise<void>;
  clearChat: () => void;
}

export function useLocalChat(): UseLocalChatResult {
  const { getAccessToken } = useAuth();
  const [messages, setMessages] = useState<IChatItem[]>([]);
  const [status, setStatus] = useState<UseLocalChatResult['status']>('idle');
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const clearChat = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setMessages([]);
    setStatus('idle');
    setError(null);
    setConversationId(null);
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    // 1. Cancel previous stream if active
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setStatus('sending');
    setError(null);

    // 2. Add user message to local state
    const userMessage: IChatItem = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      more: {
        time: new Date().toISOString()
      }
    };

    setMessages((prev) => [...prev, userMessage]);

    // 3. Add placeholder assistant message
    const assistantMessageId = (Date.now() + 1).toString();
    const initialAssistantMessage: IChatItem = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      more: {
        time: new Date().toISOString()
      }
    };
    setMessages((prev) => [...prev, initialAssistantMessage]);

    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('Authentication token not found. Please log in.');
      }

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const apiUrl = import.meta.env.VITE_API_URL || '/api';
      const response = await fetch(`${apiUrl}/chat/stream`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: text,
          conversationId: conversationId,
          imageDataUris: [],
          fileDataUris: []
        }),
        signal: abortController.signal
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Server error (${response.status}): ${errText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) {
        throw new Error('Response stream not readable.');
      }

      setStatus('streaming');
      let buffer = '';
      let currentContent = '';
      let isFirstChunk = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const decodedChunk = decoder.decode(value, { stream: true });
        buffer += decodedChunk;

        const [lines, remaining] = splitSseBuffer(buffer);
        buffer = remaining;

        for (const line of lines) {
          const event = parseSseLine(line);
          if (!event) continue;

          if (event.data?.error) {
            throw new Error(event.data.error.message || 'Error from stream server');
          }

          switch (event.type) {
            case 'conversationId':
              setConversationId(event.data.conversationId);
              break;

            case 'chunk': {
              const contentDelta = event.data.content;
              if (isFirstChunk) {
                currentContent = contentDelta;
                isFirstChunk = false;
              } else {
                currentContent += contentDelta;
              }

              // Update the assistant message in local messages state
              setMessages((prev) => {
                const updated = [...prev];
                const idx = updated.findIndex((m) => m.id === assistantMessageId);
                if (idx !== -1) {
                  updated[idx] = {
                    ...updated[idx],
                    content: currentContent
                  };
                }
                return updated;
              });
              break;
            }

            case 'done':
              setStatus('idle');
              break;

            case 'error':
              throw new Error(event.data.message || 'An error occurred during streaming.');
          }
        }
      }

      setStatus('idle');
      abortControllerRef.current = null;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setStatus('idle');
        return;
      }
      console.error('Error during local chat streaming:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStatus('error');
      
      // Clean up empty assistant message on error if it has no content
      setMessages((prev) => {
        const assistantMsg = prev.find((m) => m.id === assistantMessageId);
        if (assistantMsg && !assistantMsg.content) {
          return prev.filter((m) => m.id !== assistantMessageId);
        }
        return prev;
      });
    }
  }, [conversationId, getAccessToken]);

  return {
    messages,
    status,
    error,
    conversationId,
    sendMessage,
    clearChat
  };
}
