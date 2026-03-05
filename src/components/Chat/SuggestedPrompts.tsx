import { SuggestedPrompt } from '@/types';

const SUGGESTED_PROMPTS: (SuggestedPrompt & { description: string })[] = [
    {
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" />
            </svg>
        ),
        text: '¿Cómo creo un pipeline de ventas?',
        description: 'Configura etapas y automatiza tu flujo',
    },
    {
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3" /><path d="M22 7v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
        ),
        text: '¿Cómo configuro email marketing?',
        description: 'Campañas, plantillas y automatización',
    },
    {
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" x2="19" y1="8" y2="14" /><line x1="22" x2="16" y1="11" y2="11" />
            </svg>
        ),
        text: '¿Cómo agrego un contacto al CRM?',
        description: 'Importar, crear y organizar contactos',
    },
    {
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" /><path d="m15 5 4 4" />
            </svg>
        ),
        text: '¿Cómo personalizo mi dashboard?',
        description: 'Widgets, métricas y vistas personalizadas',
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
                    <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
                        <circle cx="36" cy="36" r="34" fill="url(#welcomeGrad)" />
                        {/* AI Sparkle Icon */}
                        <path
                            d="M36 16L37.63 25.17L44.5 20.5L40.83 27.37L50 29L40.83 30.63L44.5 37.5L37.63 34.83L36 44L34.37 34.83L27.5 37.5L31.17 30.63L22 29L31.17 27.37L27.5 20.5L34.37 25.17L36 16Z"
                            fill="white"
                            fillOpacity="0.95"
                        />
                        {/* Smaller accent sparkle */}
                        <path
                            d="M48 42L48.8 46.2L52 44L49.8 47.2L54 48L49.8 48.8L52 52L48.8 49.8L48 54L47.2 49.8L44 52L46.2 48.8L42 48L46.2 47.2L44 44L47.2 46.2L48 42Z"
                            fill="white"
                            fillOpacity="0.7"
                        />
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
                    Tu asistente experta en IntegroSuite. Pregúntame lo que necesites sobre tu CRM.
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
                        <span className="suggested-prompt-text-wrapper">
                            <span className="suggested-prompt-text">{prompt.text}</span>
                            <span className="suggested-prompt-description">{prompt.description}</span>
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
