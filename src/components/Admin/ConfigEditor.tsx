'use client';

import { useState } from 'react';
import { BotConfig } from '@/types';

interface ConfigEditorProps {
    config: BotConfig;
    onSave: (updates: Partial<BotConfig>) => Promise<void>;
    saving: boolean;
}

export default function ConfigEditor({ config, onSave, saving }: ConfigEditorProps) {
    const [prompt, setPrompt] = useState(config.system_prompt || '');

    const handleSave = () => {
        onSave({ system_prompt: prompt });
    };

    return (
        <div className="admin-card">
            <div className="admin-card-header">
                <h3 className="admin-section-title">System Prompt</h3>
                <span className="admin-badge">Última actualización: en vivo</span>
            </div>
            <textarea
                className="admin-textarea"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={14}
                spellCheck={false}
            />
            <div className="admin-card-footer">
                <span className="admin-char-count">{prompt.length} caracteres</span>
                <button
                    className="admin-btn-primary"
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? 'Guardando…' : 'Guardar prompt'}
                </button>
            </div>
        </div>
    );
}
