'use client';

import { useState } from 'react';
import { DbConversation, DbMessage } from '@/types';

interface ConversationViewerProps {
    conversations: DbConversation[];
    total: number;
    page: number;
    pages: number;
    onPageChange: (page: number) => void;
    onSearch: (q: string) => void;
    searchQuery: string;
}

function formatRelative(dateStr: string) {
    const now = Date.now();
    const diff = now - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `Hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Hace ${hours}h`;
    const days = Math.floor(hours / 24);
    return `Hace ${days}d`;
}

function MessageBubble({ message }: { message: DbMessage }) {
    const isUser = message.role === 'user';
    return (
        <div className={`conv-bubble-row ${isUser ? 'user' : 'assistant'}`}>
            {!isUser && <div className="conv-avatar">L</div>}
            <div className={`conv-bubble ${isUser ? 'user' : 'assistant'}`}>
                <p>{message.content}</p>
                <span className="conv-timestamp">
                    {new Date(message.created_at).toLocaleTimeString('es-CO', {
                        hour: '2-digit', minute: '2-digit'
                    })}
                </span>
            </div>
        </div>
    );
}

export default function ConversationViewer({
    conversations,
    total,
    page,
    pages,
    onPageChange,
    onSearch,
    searchQuery,
}: ConversationViewerProps) {
    const [selectedConv, setSelectedConv] = useState<DbConversation | null>(null);
    const [messages, setMessages] = useState<DbMessage[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);

    const loadConversation = async (conv: DbConversation) => {
        setSelectedConv(conv);
        setLoadingMessages(true);
        try {
            const res = await fetch(`/api/admin/conversations/${conv.id}`);
            const data = await res.json();
            setMessages(data.messages || []);
        } catch {
            setMessages([]);
        } finally {
            setLoadingMessages(false);
        }
    };

    return (
        <div className="conv-viewer">
            {/* Left panel */}
            <div className="conv-list-panel">
                <div className="conv-search-bar">
                    <span className="conv-search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Buscar conversación..."
                        className="conv-search-input"
                        value={searchQuery}
                        onChange={(e) => onSearch(e.target.value)}
                    />
                </div>
                <div className="conv-list-count">{total} conversaciones</div>
                <div className="conv-list">
                    {conversations.length === 0 && (
                        <div className="admin-empty-state">
                            <span>💬</span>
                            <p>No hay conversaciones aún.</p>
                        </div>
                    )}
                    {conversations.map((conv) => (
                        <div
                            key={conv.id}
                            className={`conv-list-item${selectedConv?.id === conv.id ? ' active' : ''}`}
                            onClick={() => loadConversation(conv)}
                        >
                            <div className="conv-list-title">{conv.title}</div>
                            <div className="conv-list-meta">
                                <span>{formatRelative(conv.created_at)}</span>
                                <span>·</span>
                                <span>{conv.message_count} mensajes</span>
                            </div>
                            <span className="conv-session-badge">{conv.session_id.slice(0, 8)}…</span>
                        </div>
                    ))}
                </div>

                {pages > 1 && (
                    <div className="conv-pagination">
                        <button
                            className="admin-number-btn"
                            onClick={() => onPageChange(page - 1)}
                            disabled={page <= 1}
                        >‹</button>
                        <span>{page} / {pages}</span>
                        <button
                            className="admin-number-btn"
                            onClick={() => onPageChange(page + 1)}
                            disabled={page >= pages}
                        >›</button>
                    </div>
                )}
            </div>

            {/* Right panel */}
            <div className="conv-detail-panel">
                {!selectedConv ? (
                    <div className="admin-empty-state conv-empty">
                        <span style={{ fontSize: 48 }}>💬</span>
                        <p>Selecciona una conversación para ver el detalle</p>
                    </div>
                ) : (
                    <>
                        <div className="conv-detail-header">
                            <div>
                                <h4 className="conv-detail-title">{selectedConv.title}</h4>
                                <span className="conv-detail-meta">
                                    {selectedConv.message_count} mensajes · {formatRelative(selectedConv.created_at)}
                                </span>
                            </div>
                        </div>
                        <div className="conv-messages">
                            {loadingMessages ? (
                                <div className="admin-loading">Cargando mensajes…</div>
                            ) : messages.map((msg) => (
                                <MessageBubble key={msg.id} message={msg} />
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
