export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

export interface Conversation {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    messages: Message[];
}

export interface ChatRequest {
    messages: { role: 'user' | 'assistant' | 'system'; content: string }[];
}

import React from 'react';

export interface SuggestedPrompt {
    icon: string | React.ReactNode;
    text: string;
}
