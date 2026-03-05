'use client';

import { useEffect, useState, useCallback } from 'react';

interface ToastMessage {
    id: string;
    message: string;
    type: 'error' | 'success' | 'info';
}

let addToastFn: ((message: string, type?: 'error' | 'success' | 'info') => void) | null = null;

// Bug #11 fix: Use incremental counter instead of Date.now() to avoid ID collisions
let toastCounter = 0;

export function showToast(message: string, type: 'error' | 'success' | 'info' = 'error') {
    addToastFn?.(message, type);
}

export default function ToastContainer() {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const addToast = useCallback((message: string, type: 'error' | 'success' | 'info' = 'error') => {
        const id = `toast-${++toastCounter}`;
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 5000);
    }, []);

    useEffect(() => {
        addToastFn = addToast;
        return () => {
            addToastFn = null;
        };
    }, [addToast]);

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    return (
        <div className="toast-container">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`toast toast-${toast.type}`}
                    onClick={() => removeToast(toast.id)}
                >
                    <span className="toast-icon">
                        {toast.type === 'error' ? '⚠️' : toast.type === 'success' ? '✅' : 'ℹ️'}
                    </span>
                    <span className="toast-message">{toast.message}</span>
                    <button className="toast-close" aria-label="Cerrar">×</button>
                </div>
            ))}
        </div>
    );
}
