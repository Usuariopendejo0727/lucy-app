import { SuggestedPrompt } from '@/types';

const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
    {
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500">
                <path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" />
            </svg>
        ),
        text: '¿Cómo creo un pipeline de ventas?',
    },
    {
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500">
                <path d="M4 7V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3" /><path d="M22 7v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
        ),
        text: '¿Cómo configuro una automatización de email?',
    },
    {
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" x2="19" y1="8" y2="14" /><line x1="22" x2="16" y1="11" y2="11" />
            </svg>
        ),
        text: '¿Cómo agrego un nuevo contacto al CRM?',
    },
    {
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500">
                <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" /><path d="m15 5 4 4" />
            </svg>
        ),
        text: '¿Cómo personalizo mi dashboard?',
    },
];

interface SuggestedPromptsProps {
    onSelectPrompt: (text: string) => void;
}

export default function SuggestedPrompts({ onSelectPrompt }: SuggestedPromptsProps) {
    return (
        <div className="suggested-prompts-container">
            <div className="welcome-section">
                <div className="welcome-avatar-large">
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                        <circle cx="24" cy="24" r="22" fill="url(#welcomeGrad)" />
                        <text
                            x="24"
                            y="31"
                            textAnchor="middle"
                            fill="white"
                            fontSize="22"
                            fontWeight="700"
                            fontFamily="Inter, sans-serif"
                        >
                            L
                        </text>
                        <defs>
                            <linearGradient id="welcomeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#6366F1" />
                                <stop offset="50%" stopColor="#8B5CF6" />
                                <stop offset="100%" stopColor="#A78BFA" />
                            </linearGradient>
                        </defs>
                    </svg>
                </div>
                <h1 className="welcome-title">¡Hola! Soy Lucy 👋</h1>
                <p className="welcome-subtitle">
                    Tu asistente experta en IntegroSuite. Pregúntame lo que necesites.
                </p>
            </div>
            <div className="suggested-prompts-grid">
                {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                        key={prompt.text}
                        className="suggested-prompt-card"
                        onClick={() => onSelectPrompt(prompt.text)}
                    >
                        <span className="suggested-prompt-icon">{prompt.icon}</span>
                        <span className="suggested-prompt-text">{prompt.text}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
