'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Conversation, Message } from '@/types';
import {
    getConversations,
    saveConversations,
    deleteConversation as deleteFromStorage,
} from '@/utils/storage';

// Bug #6 fix: Debounce timer for localStorage writes
const SAVE_DEBOUNCE_MS = 500;

export function useConversations() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Load conversations from localStorage on mount
    useEffect(() => {
        setConversations(getConversations());
    }, []);

    // Bug #6 fix: Debounced save — writes to localStorage at most once every 500ms
    const debouncedSave = useCallback((updatedConversations: Conversation[]) => {
        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
        }
        saveTimerRef.current = setTimeout(() => {
            saveConversations(updatedConversations);
            saveTimerRef.current = null;
        }, SAVE_DEBOUNCE_MS);
    }, []);

    // Cleanup debounce timer on unmount
    useEffect(() => {
        return () => {
            if (saveTimerRef.current) {
                clearTimeout(saveTimerRef.current);
            }
        };
    }, []);

    const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;

    const createConversation = useCallback((): Conversation => {
        const now = new Date().toISOString();
        const newConversation: Conversation = {
            id: uuidv4(),
            title: 'Nueva conversación',
            createdAt: now,
            updatedAt: now,
            messages: [],
        };
        setConversations((prev) => {
            const updated = [newConversation, ...prev];
            debouncedSave(updated);
            return updated;
        });
        setActiveConversationId(newConversation.id);
        return newConversation;
    }, [debouncedSave]);

    const updateConversation = useCallback(
        (id: string, updates: Partial<Omit<Conversation, 'id'>>) => {
            setConversations((prev) => {
                const updated = prev.map((c) =>
                    c.id === id
                        ? { ...c, ...updates, updatedAt: new Date().toISOString() }
                        : c
                );
                debouncedSave(updated);
                return updated;
            });
        },
        [debouncedSave]
    );

    const addMessage = useCallback(
        (conversationId: string, message: Message) => {
            setConversations((prev) => {
                const updated = prev.map((c) =>
                    c.id === conversationId
                        ? {
                            ...c,
                            messages: [...c.messages, message],
                            updatedAt: new Date().toISOString(),
                        }
                        : c
                );
                debouncedSave(updated);
                return updated;
            });
        },
        [debouncedSave]
    );

    const updateLastAssistantMessage = useCallback(
        (conversationId: string, content: string) => {
            setConversations((prev) => {
                const updated = prev.map((c) => {
                    if (c.id !== conversationId) return c;
                    const messages = [...c.messages];
                    const lastIdx = messages.length - 1;
                    if (lastIdx >= 0 && messages[lastIdx].role === 'assistant') {
                        messages[lastIdx] = { ...messages[lastIdx], content };
                    }
                    return { ...c, messages, updatedAt: new Date().toISOString() };
                });
                debouncedSave(updated);
                return updated;
            });
        },
        [debouncedSave]
    );

    const deleteConversation = useCallback(
        (id: string) => {
            deleteFromStorage(id);
            setConversations((prev) => prev.filter((c) => c.id !== id));
            if (activeConversationId === id) {
                setActiveConversationId(null);
            }
        },
        [activeConversationId]
    );

    const selectConversation = useCallback((id: string | null) => {
        setActiveConversationId(id);
    }, []);

    return {
        conversations,
        activeConversation,
        activeConversationId,
        createConversation,
        updateConversation,
        addMessage,
        updateLastAssistantMessage,
        deleteConversation,
        selectConversation,
    };
}
