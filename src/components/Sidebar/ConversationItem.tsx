'use client';

import { useState } from 'react';
import { Conversation } from '@/types';

interface ConversationItemProps {
    conversation: Conversation;
    isActive: boolean;
    onSelect: () => void;
    onDelete: () => void;
}

export default function ConversationItem({
    conversation,
    isActive,
    onSelect,
    onDelete,
}: ConversationItemProps) {
    const [showDelete, setShowDelete] = useState(false);

    const lastMessage = conversation.messages[conversation.messages.length - 1];
    const preview = lastMessage
        ? lastMessage.content.slice(0, 50) + (lastMessage.content.length > 50 ? '...' : '')
        : 'Sin mensajes';

    return (
        <div
            className={`conversation-item ${isActive ? 'conversation-item-active' : ''}`}
            onClick={onSelect}
            onMouseEnter={() => setShowDelete(true)}
            onMouseLeave={() => setShowDelete(false)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onSelect();
            }}
        >
            <div className="conversation-item-content">
                <div className="conversation-item-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                </div>
                <div className="conversation-item-text">
                    <span className="conversation-item-title">{conversation.title}</span>
                    <span className="conversation-item-preview">{preview}</span>
                </div>
            </div>
            {showDelete && (
                <button
                    className="conversation-item-delete"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                    aria-label="Eliminar conversación"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                </button>
            )}
        </div>
    );
}
