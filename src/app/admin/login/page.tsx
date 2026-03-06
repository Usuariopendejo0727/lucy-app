'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';

export default function AdminLoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const supabase = createClient();
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

        if (authError) {
            setError('Email o contraseña incorrectos. Verifica tus credenciales.');
            setLoading(false);
            return;
        }

        router.push('/admin');
    };

    return (
        <div className="admin-login-page">
            <div className="admin-login-card">
                <div className="admin-login-logo">
                    <div className="admin-avatar large">L</div>
                    <h1 className="admin-login-title">Lucy Admin</h1>
                    <p className="admin-login-subtitle">Panel de administración</p>
                </div>

                <form className="admin-login-form" onSubmit={handleLogin}>
                    <div className="admin-field">
                        <label className="admin-label" htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            className="admin-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@integrosuite.com"
                            required
                            autoComplete="email"
                        />
                    </div>

                    <div className="admin-field">
                        <label className="admin-label" htmlFor="password">Contraseña</label>
                        <div className="admin-password-wrapper">
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                className="admin-input"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                className="admin-password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>

                    {error && <div className="admin-error">{error}</div>}

                    <button type="submit" className="admin-btn-primary full" disabled={loading}>
                        {loading ? 'Iniciando sesión…' : 'Iniciar sesión'}
                    </button>
                </form>
            </div>
        </div>
    );
}
