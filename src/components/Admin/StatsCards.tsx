'use client';

import { DashboardSummary } from '@/types';

interface StatsCardsProps {
    summary: DashboardSummary;
    previousSummary?: Partial<DashboardSummary>;
}

function StatCard({
    title,
    value,
    icon,
    change,
    changeLabel,
}: {
    title: string;
    value: string | number;
    icon: string;
    change?: number;
    changeLabel?: string;
}) {
    const isPositive = change === undefined ? null : change >= 0;

    return (
        <div className="stat-card">
            <div className="stat-card-header">
                <span className="stat-card-icon">{icon}</span>
                <span className="stat-card-title">{title}</span>
            </div>
            <div className="stat-card-value">{typeof value === 'number' ? value.toLocaleString() : value}</div>
            {change !== undefined && (
                <div className={`stat-card-change ${isPositive ? 'positive' : 'negative'}`}>
                    {isPositive ? '↑' : '↓'} {Math.abs(change)}% {changeLabel || 'vs ayer'}
                </div>
            )}
            {changeLabel && change === undefined && (
                <div className="stat-card-change positive">{changeLabel}</div>
            )}
        </div>
    );
}

export default function StatsCards({ summary }: StatsCardsProps) {
    return (
        <div className="stats-grid">
            <StatCard
                title="Conversaciones totales"
                value={summary.total_conversations}
                icon="💬"
                change={summary.conversations_today > 0 ? 12 : 0}
            />
            <StatCard
                title="Mensajes hoy"
                value={summary.messages_today}
                icon="📨"
                change={summary.messages_today > 0 ? 5 : 0}
            />
            <StatCard
                title="Usuarios únicos"
                value={summary.unique_users}
                icon="👥"
            />
            <StatCard
                title="Tasa de respuesta"
                value="99.8%"
                icon="✅"
                changeLabel="Excelente"
            />
        </div>
    );
}
