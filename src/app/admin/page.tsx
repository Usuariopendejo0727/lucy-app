'use client';

import { useEffect, useState } from 'react';
import StatsCards from '@/components/Admin/StatsCards';
import ConversationsChart from '@/components/Admin/ConversationsChart';
import FrequentQuestions from '@/components/Admin/FrequentQuestions';
import { AnalyticsResponse } from '@/types';

const EMPTY_ANALYTICS: AnalyticsResponse = {
    summary: {
        total_conversations: 0,
        total_messages: 0,
        user_messages: 0,
        assistant_messages: 0,
        unique_users: 0,
        conversations_today: 0,
        messages_today: 0,
    },
    daily: [],
    frequent_questions: [],
};

export default function AdminOverviewPage() {
    const [analytics, setAnalytics] = useState<AnalyticsResponse>(EMPTY_ANALYTICS);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/admin/analytics')
            .then((r) => r.json())
            .then((data) => {
                if (!data.error) setAnalytics(data);
            })
            .catch((err) => console.error('Error cargando analytics:', err))
            .finally(() => setLoading(false));
    }, []);

    const today = new Date().toLocaleDateString('es-CO', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    return (
        <div className="admin-page">
            <div className="admin-page-header">
                <div>
                    <h2 className="admin-page-title">Dashboard</h2>
                    <p className="admin-page-date">{today}</p>
                </div>
                <button
                    className="admin-refresh-btn"
                    onClick={() => {
                        setLoading(true);
                        fetch('/api/admin/analytics')
                            .then((r) => r.json())
                            .then((data) => { if (!data.error) setAnalytics(data); })
                            .catch((err) => console.error('Error cargando analytics:', err))
                            .finally(() => setLoading(false));
                    }}
                    title="Actualizar datos"
                >
                    {loading ? '⟳' : '🔄'}
                </button>
            </div>

            {loading ? (
                <div className="admin-loading">Cargando métricas…</div>
            ) : (
                <>
                    <StatsCards summary={analytics.summary} />
                    <ConversationsChart data={analytics.daily} />
                    <FrequentQuestions questions={analytics.frequent_questions} />
                </>
            )}
        </div>
    );
}
