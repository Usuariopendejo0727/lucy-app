'use client';

import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    AreaChart,
} from 'recharts';
import { DailyMetric } from '@/types';

interface ConversationsChartProps {
    data: DailyMetric[];
}

function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' });
}

export default function ConversationsChart({ data }: ConversationsChartProps) {
    const chartData = [...data]
        .reverse()
        .slice(-7)
        .map((d) => ({
            date: formatDate(d.date),
            Conversaciones: d.new_conversations,
            Mensajes: d.total_messages,
        }));

    if (chartData.length === 0) {
        return (
            <div className="admin-card">
                <h3 className="admin-section-title">Actividad últimos 7 días</h3>
                <div className="admin-empty-state">
                    <span>📊</span>
                    <p>No hay datos de actividad aún. Los datos aparecerán cuando los usuarios comiencen a chatear.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-card">
            <h3 className="admin-section-title">Actividad últimos 7 días</h3>
            <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorConv" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366F1" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorMsg" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <Tooltip
                        contentStyle={{
                            background: '#fff',
                            border: '1px solid #E5E7EB',
                            borderRadius: 12,
                            fontSize: 13,
                        }}
                    />
                    <Area
                        type="monotone"
                        dataKey="Conversaciones"
                        stroke="#6366F1"
                        strokeWidth={2}
                        fill="url(#colorConv)"
                        dot={{ fill: '#6366F1', strokeWidth: 0, r: 4 }}
                    />
                    <Area
                        type="monotone"
                        dataKey="Mensajes"
                        stroke="#8B5CF6"
                        strokeWidth={2}
                        fill="url(#colorMsg)"
                        dot={{ fill: '#8B5CF6', strokeWidth: 0, r: 4 }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
