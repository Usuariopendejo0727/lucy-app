'use client';

import { useState } from 'react';
import { BotConfig } from '@/types';

const MODELS = ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'];

interface ModelSettingsProps {
    config: BotConfig;
    onSave: (updates: Partial<BotConfig>) => Promise<void>;
    saving: boolean;
}

export default function ModelSettings({ config, onSave, saving }: ModelSettingsProps) {
    const [model, setModel] = useState(config.model || 'gpt-4o-mini');
    const [temperature, setTemperature] = useState(parseFloat(config.temperature || '0.7'));
    const [maxTokens, setMaxTokens] = useState(parseInt(config.max_tokens || '2048', 10));
    const [welcomeMessage, setWelcomeMessage] = useState(config.welcome_message || '');
    const [welcomeSubtitle, setWelcomeSubtitle] = useState(config.welcome_subtitle || '');
    const [rateLimit, setRateLimit] = useState(parseInt(config.rate_limit_per_minute || '20', 10));
    const [maxMsgs, setMaxMsgs] = useState(parseInt(config.max_messages_per_conversation || '50', 10));

    const handleSaveModel = () => {
        onSave({ model, temperature: temperature.toString(), max_tokens: maxTokens.toString() });
    };

    const handleSaveWelcome = () => {
        onSave({ welcome_message: welcomeMessage, welcome_subtitle: welcomeSubtitle });
    };

    const handleSaveRate = () => {
        onSave({
            rate_limit_per_minute: rateLimit.toString(),
            max_messages_per_conversation: maxMsgs.toString(),
        });
    };

    return (
        <>
            {/* Parámetros del modelo */}
            <div className="admin-card">
                <h3 className="admin-section-title">Parámetros del Modelo</h3>

                <div className="admin-field">
                    <label className="admin-label">Modelo</label>
                    <select
                        className="admin-select"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                    >
                        {MODELS.map((m) => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                </div>

                <div className="admin-field">
                    <label className="admin-label">
                        Temperatura <span className="admin-label-value">{temperature.toFixed(1)}</span>
                    </label>
                    <div className="admin-slider-row">
                        <span className="admin-slider-label">0.0 Preciso</span>
                        <input
                            type="range"
                            min={0}
                            max={2}
                            step={0.1}
                            value={temperature}
                            onChange={(e) => setTemperature(parseFloat(e.target.value))}
                            className="admin-slider"
                        />
                        <span className="admin-slider-label">Creativo 2.0</span>
                    </div>
                </div>

                <div className="admin-field">
                    <label className="admin-label">Max Tokens</label>
                    <div className="admin-number-input">
                        <button
                            className="admin-number-btn"
                            onClick={() => setMaxTokens((v) => Math.max(256, v - 128))}
                        >−</button>
                        <input
                            type="number"
                            className="admin-input"
                            value={maxTokens}
                            min={256}
                            max={4096}
                            onChange={(e) => setMaxTokens(parseInt(e.target.value, 10))}
                        />
                        <button
                            className="admin-number-btn"
                            onClick={() => setMaxTokens((v) => Math.min(4096, v + 128))}
                        >+</button>
                    </div>
                </div>

                <button className="admin-btn-primary" onClick={handleSaveModel} disabled={saving}>
                    {saving ? 'Guardando…' : 'Guardar parámetros'}
                </button>
            </div>

            {/* Mensajes de bienvenida */}
            <div className="admin-card">
                <h3 className="admin-section-title">Mensajes de Bienvenida</h3>
                <div className="admin-field">
                    <label className="admin-label">Mensaje de bienvenida</label>
                    <input
                        type="text"
                        className="admin-input"
                        value={welcomeMessage}
                        onChange={(e) => setWelcomeMessage(e.target.value)}
                        placeholder="¡Hola! Soy Lucy 👋"
                    />
                </div>
                <div className="admin-field">
                    <label className="admin-label">Subtítulo</label>
                    <input
                        type="text"
                        className="admin-input"
                        value={welcomeSubtitle}
                        onChange={(e) => setWelcomeSubtitle(e.target.value)}
                        placeholder="Tu asistente experta en IntegroSuite..."
                    />
                </div>
                <button className="admin-btn-primary" onClick={handleSaveWelcome} disabled={saving}>
                    {saving ? 'Guardando…' : 'Guardar mensajes'}
                </button>
            </div>

            {/* Rate limiting */}
            <div className="admin-card">
                <h3 className="admin-section-title">Rate Limiting</h3>
                <div className="admin-field">
                    <label className="admin-label">Mensajes por minuto por usuario</label>
                    <input
                        type="number"
                        className="admin-input"
                        value={rateLimit}
                        min={1}
                        max={100}
                        onChange={(e) => setRateLimit(parseInt(e.target.value, 10))}
                    />
                </div>
                <div className="admin-field">
                    <label className="admin-label">Máximo de mensajes por conversación</label>
                    <input
                        type="number"
                        className="admin-input"
                        value={maxMsgs}
                        min={10}
                        max={200}
                        onChange={(e) => setMaxMsgs(parseInt(e.target.value, 10))}
                    />
                </div>
                <button className="admin-btn-primary" onClick={handleSaveRate} disabled={saving}>
                    {saving ? 'Guardando…' : 'Guardar límites'}
                </button>
            </div>
        </>
    );
}
