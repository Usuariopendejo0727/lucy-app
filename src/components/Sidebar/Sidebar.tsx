'use client';

import { Conversation } from '@/types';
import { groupConversationsByDate } from '@/utils/storage';
import ConversationItem from './ConversationItem';

interface SidebarProps {
    conversations: Conversation[];
    activeConversationId: string | null;
    onSelectConversation: (id: string) => void;
    onNewConversation: () => void;
    onDeleteConversation: (id: string) => void;
    isOpen: boolean;
    onClose: () => void;
}

export default function Sidebar({
    conversations,
    activeConversationId,
    onSelectConversation,
    onNewConversation,
    onDeleteConversation,
    isOpen,
    onClose,
}: SidebarProps) {
    const groups = groupConversationsByDate(conversations);

    return (
        <>
            {/* Mobile backdrop */}
            {isOpen && (
                <div className="sidebar-backdrop" onClick={onClose} />
            )}
            <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <div className="logo-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" fill="url(#logoGrad)" />
                                <text
                                    x="12"
                                    y="16"
                                    textAnchor="middle"
                                    fill="white"
                                    fontSize="12"
                                    fontWeight="700"
                                    fontFamily="Inter, sans-serif"
                                >
                                    L
                                </text>
                                <defs>
                                    <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#6366F1" />
                                        <stop offset="100%" stopColor="#8B5CF6" />
                                    </linearGradient>
                                </defs>
                            </svg>
                        </div>
                        <span className="logo-text">Lucy</span>
                    </div>
                    <button className="sidebar-close-btn" onClick={onClose} aria-label="Cerrar menú">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                <button
                    className="new-chat-btn"
                    onClick={() => {
                        onNewConversation();
                        onClose();
                    }}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Nueva conversación
                </button>

                <div className="sidebar-conversations">
                    {conversations.length === 0 ? (
                        <div className="sidebar-empty">
                            <p className="sidebar-empty-text">Aún no tienes conversaciones</p>
                            <p className="sidebar-empty-hint">
                                Haz clic en &quot;Nueva conversación&quot; para comenzar
                            </p>
                        </div>
                    ) : (
                        groups.map((group) => (
                            <div key={group.label} className="conversation-group">
                                <h3 className="conversation-group-label">{group.label}</h3>
                                {group.conversations.map((conv) => (
                                    <ConversationItem
                                        key={conv.id}
                                        conversation={conv}
                                        isActive={conv.id === activeConversationId}
                                        onSelect={() => {
                                            onSelectConversation(conv.id);
                                            onClose();
                                        }}
                                        onDelete={() => onDeleteConversation(conv.id)}
                                    />
                                ))}
                            </div>
                        ))
                    )}
                </div>
            </aside>
        </>
    );
}
