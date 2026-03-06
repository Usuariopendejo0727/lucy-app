'use client';

import { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message } from '@/types';
import { showToast } from '@/components/UI/Toast';

interface UseChatOptions {
    onMessageAdded?: (conversationId: string, message: Message) => void;
    onAssistantUpdate?: (conversationId: string, content: string) => void;
    onTitleGenerated?: (conversationId: string, title: string) => void;
}

export function useChat(options: UseChatOptions) {
    const [isStreaming, setIsStreaming] = useState(false);

    // Bug #9 fix: Use ref to avoid re-creating sendMessage when options change
    const optionsRef = useRef(options);
    optionsRef.current = options;

    const sendMessage = useCallback(
        async (
            conversationId: string,
            content: string,
            existingMessages: Message[]
        ) => {
            setIsStreaming(true);

            // Add user message
            const userMessage: Message = {
                id: uuidv4(),
                role: 'user',
                content,
                timestamp: new Date().toISOString(),
            };
            optionsRef.current.onMessageAdded?.(conversationId, userMessage);

            // Add placeholder assistant message
            const assistantMessage: Message = {
                id: uuidv4(),
                role: 'assistant',
                content: '',
                timestamp: new Date().toISOString(),
            };
            optionsRef.current.onMessageAdded?.(conversationId, assistantMessage);

            try {
                const allMessages = [...existingMessages, userMessage];
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        messages: allMessages.map((m) => ({
                            role: m.role,
                            content: m.content,
                        })),
                        sessionId: conversationId,
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(
                        errorData.error || `Error del servidor (${response.status})`
                    );
                }

                if (!response.body) {
                    throw new Error('No se recibió respuesta del servidor');
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let fullContent = '';
                // Bug #5 fix: Use a buffer to handle SSE chunks that arrive split
                let buffer = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    // Keep the last (potentially incomplete) line in the buffer
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6);
                            if (data === '[DONE]') continue;
                            try {
                                const parsed = JSON.parse(data);
                                const delta = parsed.choices?.[0]?.delta?.content;
                                if (delta) {
                                    fullContent += delta;
                                    optionsRef.current.onAssistantUpdate?.(conversationId, fullContent);
                                }
                            } catch {
                                // Skip malformed JSON chunks
                            }
                        }
                    }
                }

                // Auto-generate title from first user message
                if (existingMessages.length === 0) {
                    const title = generateTitle(content);
                    optionsRef.current.onTitleGenerated?.(conversationId, title);
                }
            } catch (e) {
                const errorMessage =
                    e instanceof Error ? e.message : 'Error inesperado';
                // Bug #10 fix: Show error as a Toast notification instead of unused state
                showToast(errorMessage, 'error');
                optionsRef.current.onAssistantUpdate?.(
                    conversationId,
                    `⚠️ ${errorMessage}. Por favor, intenta de nuevo.`
                );
            } finally {
                setIsStreaming(false);
            }
        },
        [] // Bug #9 fix: Empty deps — options accessed via ref
    );

    return { sendMessage, isStreaming };
}

function generateTitle(firstMessage: string): string {
    // Create a title from the first user message
    const cleaned = firstMessage.replace(/[¿?¡!]/g, '').trim();
    if (cleaned.length <= 40) return cleaned;
    return cleaned.slice(0, 40).trim() + '...';
}
