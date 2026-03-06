'use client';

import { useEffect, useState, useCallback } from 'react';
import ConfigEditor from '@/components/Admin/ConfigEditor';
import ModelSettings from '@/components/Admin/ModelSettings';
import { BotConfig } from '@/types';

const DEFAULT_CONFIG: BotConfig = {
    system_prompt: '',
    model: 'gpt-4o-mini',
    temperature: '0.7',
    max_tokens: '2048',
    rate_limit_per_minute: '20',
    max_messages_per_conversation: '50',
    welcome_message: '¡Hola! Soy Lucy 👋',
    welcome_subtitle: 'Tu asistente experta en IntegroSuite. Pregúntame lo que necesites.',
};

export default function AdminConfigPage() {
    const [config, setConfig] = useState<BotConfig>(DEFAULT_CONFIG);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        fetch('/api/admin/config')
            .then((r) => r.json())
            .then((data) => {
                if (!data.error) setConfig({ ...DEFAULT_CONFIG, ...data });
            })
            .finally(() => setLoading(false));
    }, []);

    const handleSave = useCallback(async (updates: Partial<BotConfig>) => {
        setSaving(true);
        setSaved(false);
        try {
            const configs = Object.entries(updates).map(([key, value]) => ({ key, value }));
            const res = await fetch('/api/admin/config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ configs }),
            });
            const data = await res.json();
            if (data.success) {
                setConfig((prev) => ({ ...prev, ...updates } as BotConfig));
                setSaved(true);
                setTimeout(() => setSaved(false), 3000);
            }
        } finally {
            setSaving(false);
        }
    }, []);

    return (
        <div className="admin-page">
            <div className="admin-page-header">
                <div>
                    <h2 className="admin-page-title">Configuración de Lucy</h2>
                    <p className="admin-page-date">Los cambios se aplican en ~60 segundos (cache TTL)</p>
                </div>
                {saved && <span className="admin-saved-badge">✅ Guardado</span>}
            </div>

            {loading ? (
                <div className="admin-loading">Cargando configuración…</div>
            ) : (
                <>
                    <ConfigEditor config={config} onSave={handleSave} saving={saving} />
                    <ModelSettings config={config} onSave={handleSave} saving={saving} />
                </>
            )}
        </div>
    );
}
