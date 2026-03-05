'use client';

import { useRef, useEffect } from 'react';
import { Conversation } from '@/types';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';
import SuggestedPrompts from './SuggestedPrompts';
import ScrollToBottom from './ScrollToBottom';

interface ChatAreaProps {
    conversation: Conversation | null;
    isStreaming: boolean;
    onSendMessage: (content: string) => void;
    onOpenSidebar: () => void;
}

export default function ChatArea({
    conversation,
    isStreaming,
    onSendMessage,
    onOpenSidebar,
}: ChatAreaProps) {
    const messagesRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [conversation?.messages]);

    const hasMessages = conversation && conversation.messages.length > 0;
    // Check if the last assistant message is still empty (= actively streaming)
    const showTypingIndicator =
        isStreaming &&
        conversation?.messages &&
        conversation.messages.length > 0 &&
        conversation.messages[conversation.messages.length - 1].role === 'assistant' &&
        conversation.messages[conversation.messages.length - 1].content === '';

    return (
        <div className="chat-area">
            {/* Header */}
            <header className="chat-header">
                <button
                    className="hamburger-btn"
                    onClick={onOpenSidebar}
                    aria-label="Abrir menú"
                >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <line x1="3" y1="12" x2="21" y2="12" />
                        <line x1="3" y1="18" x2="21" y2="18" />
                    </svg>
                </button>
                <div className="chat-header-title">
                    <span className="chat-header-name">Lucy</span>
                    <span className="chat-header-badge">by IntegroSuite</span>
                </div>
                <div className="chat-header-spacer" />
            </header>

            {/* Messages area */}
            <div className="chat-messages" ref={messagesRef}>
                {!hasMessages ? (
                    <SuggestedPrompts onSelectPrompt={onSendMessage} />
                ) : (
                    <div className="messages-list">
                        {conversation.messages.map((msg) => {
                            // Skip rendering the empty assistant placeholder while streaming
                            if (msg.role === 'assistant' && msg.content === '' && isStreaming) return null;
                            return <MessageBubble key={msg.id} message={msg} />;
                        })}
                        {showTypingIndicator && <TypingIndicator />}
                        <div ref={messagesEndRef} />
                    </div>
                )}
                <ScrollToBottom containerRef={messagesRef} />
            </div>

            {/* Input */}
            <ChatInput onSend={onSendMessage} disabled={isStreaming} />
        </div>
    );
}
