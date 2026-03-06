import React from 'react';

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

export interface SuggestedPrompt {
    icon: string | React.ReactNode;
    text: string;
}

// ─── Admin / Analytics Types ────────────────────────────────────────────────

export interface BotConfig {
    system_prompt: string;
    model: string;
    temperature: string;
    max_tokens: string;
    rate_limit_per_minute: string;
    max_messages_per_conversation: string;
    welcome_message: string;
    welcome_subtitle: string;
    [key: string]: string;
}

export interface DbConversation {
    id: string;
    session_id: string;
    title: string;
    created_at: string;
    updated_at: string;
    message_count: number;
    ip_address: string | null;
    user_agent: string | null;
}

export interface DbMessage {
    id: string;
    conversation_id: string;
    role: 'user' | 'assistant';
    content: string;
    tokens_used: number | null;
    created_at: string;
}

export interface DashboardSummary {
    total_conversations: number;
    total_messages: number;
    user_messages: number;
    assistant_messages: number;
    unique_users: number;
    conversations_today: number;
    messages_today: number;
}

export interface DailyMetric {
    date: string;
    new_conversations: number;
    total_messages: number;
    unique_users: number;
    errors: number;
}

export interface FrequentQuestion {
    content: string;
    frequency: number;
    last_asked: string;
}

export interface AnalyticsResponse {
    summary: DashboardSummary;
    daily: DailyMetric[];
    frequent_questions: FrequentQuestion[];
}
