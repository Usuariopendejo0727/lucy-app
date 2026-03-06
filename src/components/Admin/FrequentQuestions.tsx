'use client';

import { FrequentQuestion } from '@/types';

interface FrequentQuestionsProps {
    questions: FrequentQuestion[];
}

function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CO', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function FrequentQuestions({ questions }: FrequentQuestionsProps) {
    if (questions.length === 0) {
        return (
            <div className="admin-card">
                <h3 className="admin-section-title">Preguntas más frecuentes</h3>
                <div className="admin-empty-state">
                    <span>💬</span>
                    <p>Las preguntas frecuentes aparecerán aquí cuando los usuarios comiencen a chatear.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-card">
            <h3 className="admin-section-title">Preguntas más frecuentes</h3>
            <div className="admin-table-wrapper">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Pregunta</th>
                            <th>Frecuencia</th>
                            <th>Última vez</th>
                        </tr>
                    </thead>
                    <tbody>
                        {questions.map((q, i) => (
                            <tr key={i}>
                                <td className="admin-table-question" title={q.content}>
                                    {q.content.length > 80 ? q.content.slice(0, 80) + '…' : q.content}
                                </td>
                                <td>
                                    <span className="freq-badge">{q.frequency}×</span>
                                </td>
                                <td className="admin-table-date">{formatDate(q.last_asked)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
