'use client';

import { useEffect, useState, useCallback } from 'react';
import ConversationViewer from '@/components/Admin/ConversationViewer';
import { DbConversation } from '@/types';

export default function AdminConversationsPage() {
    const [conversations, setConversations] = useState<DbConversation[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    const loadConversations = useCallback(async (p: number, q: string) => {
        setLoading(true);
        const params = new URLSearchParams({ page: p.toString(), limit: '20' });
        if (q) params.set('search', q);
        const res = await fetch(`/api/admin/conversations?${params}`);
        const data = await res.json();
        if (!data.error) {
            setConversations(data.conversations);
            setTotal(data.total);
            setPage(data.page);
            setPages(data.pages);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        loadConversations(1, search);
    }, []);  // eslint-disable-line react-hooks/exhaustive-deps

    const handleSearch = useCallback((q: string) => {
        setSearch(q);
        loadConversations(1, q);
    }, [loadConversations]);

    const handlePageChange = useCallback((newPage: number) => {
        loadConversations(newPage, search);
    }, [loadConversations, search]);

    return (
        <div className="admin-page conversations-page">
            <div className="admin-page-header">
                <div>
                    <h2 className="admin-page-title">Conversaciones</h2>
                    <p className="admin-page-date">{total} conversaciones en total</p>
                </div>
            </div>

            {loading && conversations.length === 0 ? (
                <div className="admin-loading">Cargando conversaciones…</div>
            ) : (
                <ConversationViewer
                    conversations={conversations}
                    total={total}
                    page={page}
                    pages={pages}
                    onPageChange={handlePageChange}
                    onSearch={handleSearch}
                    searchQuery={search}
                />
            )}
        </div>
    );
}
