import { NextRequest, NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const SYSTEM_PROMPT = `Eres Lucy, la asistente virtual experta de IntegroSuite — una plataforma CRM todo-en-uno diseñada para empresas en Colombia y Latinoamérica, construida sobre GoHighLevel.

## Tu personalidad
- Eres amable, profesional y paciente
- Hablas en español latinoamericano (Colombia), de manera cercana pero profesional
- Usas "tú" (no "usted" ni "vos")
- Eres concisa pero completa en tus respuestas
- Cuando no sabes algo con certeza, lo dices honestamente
- Puedes usar emojis ocasionalmente para ser más cercana, pero sin exagerar

## Tu conocimiento
- Eres experta en todas las funcionalidades de IntegroSuite/GoHighLevel
- Conoces a profundidad: CRM, pipelines de ventas, automatizaciones, email marketing, SMS marketing, landing pages, formularios, calendarios, reputación online, reportes y analytics, integraciones, facturación, workflows, triggers, campañas, oportunidades, contactos, smart lists, social planner
- Puedes explicar paso a paso cómo realizar cualquier tarea dentro de la plataforma
- Conoces las mejores prácticas de uso del CRM para negocios en LATAM

## Formato de respuestas
- Usa Markdown para estructurar tus respuestas
- Para tutoriales paso a paso, usa listas numeradas
- Resalta términos importantes en **negrita**
- Si mencionas una ruta de navegación dentro de la plataforma, usa el formato: **Configuración → Pipelines → Nuevo Pipeline**
- Mantén las respuestas enfocadas y accionables
- Si la pregunta es muy amplia, pide aclaración antes de responder

## Límites
- Solo respondes preguntas relacionadas con IntegroSuite y su ecosistema
- Si te preguntan algo fuera de tu ámbito, responde amablemente que solo puedes ayudar con temas de IntegroSuite
- No inventes funcionalidades que no existen en la plataforma
- Si detectas que el usuario necesita soporte técnico avanzado, sugiérele contactar al equipo de soporte de IntegroSuite`;

// In-memory rate limiting with automatic cleanup
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60000;

// Bug #3 fix: Periodic cleanup to prevent memory leak
const CLEANUP_INTERVAL_MS = 60000;
let lastCleanup = Date.now();

function cleanupRateLimitMap() {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
    lastCleanup = now;
    for (const [ip, entry] of rateLimitMap) {
        if (now > entry.resetTime) {
            rateLimitMap.delete(ip);
        }
    }
}

function checkRateLimit(ip: string): boolean {
    cleanupRateLimitMap();
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || now > entry.resetTime) {
        rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW_MS });
        return true;
    }

    if (entry.count >= RATE_LIMIT) {
        return false;
    }

    entry.count++;
    return true;
}

// Bug #4 fix: Input validation constants
const MAX_MESSAGES = 50;
const MAX_MESSAGE_LENGTH = 10000;
const VALID_ROLES = new Set(['user', 'assistant']);

export async function POST(request: NextRequest) {
    if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your-openai-api-key-here' || OPENAI_API_KEY === 'tu-api-key-aqui') {
        return NextResponse.json(
            { error: 'API key de OpenAI no configurada. Agrega OPENAI_API_KEY en las variables de entorno.' },
            { status: 500 }
        );
    }

    // Bug #2 fix: Use x-real-ip (injected by Vercel, trustworthy) instead of x-forwarded-for (spoofable)
    const ip = request.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(ip)) {
        return NextResponse.json(
            { error: 'Has enviado demasiados mensajes. Espera un minuto e intenta de nuevo.' },
            { status: 429 }
        );
    }

    try {
        const body = await request.json();
        const { messages } = body;

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json(
                { error: 'Mensajes no válidos' },
                { status: 400 }
            );
        }

        // Bug #4 fix: Validate message count
        if (messages.length > MAX_MESSAGES) {
            return NextResponse.json(
                { error: 'Demasiados mensajes en la conversación' },
                { status: 400 }
            );
        }

        // Bug #4 fix: Validate each message content and role
        for (const m of messages) {
            if (typeof m.content !== 'string' || m.content.length > MAX_MESSAGE_LENGTH) {
                return NextResponse.json(
                    { error: 'Contenido de mensaje inválido o demasiado largo' },
                    { status: 400 }
                );
            }
            if (!VALID_ROLES.has(m.role)) {
                return NextResponse.json(
                    { error: 'Rol de mensaje no válido' },
                    { status: 400 }
                );
            }
        }

        // Prepend system prompt
        const apiMessages = [
            { role: 'system' as const, content: SYSTEM_PROMPT },
            ...messages.map((m: { role: string; content: string }) => ({
                role: m.role as 'user' | 'assistant',
                content: m.content,
            })),
        ];

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: apiMessages,
                stream: true,
                temperature: 0.7,
                max_tokens: 2048,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('OpenAI API error:', errorData);
            return NextResponse.json(
                { error: errorData?.error?.message || 'Error al comunicarse con la IA' },
                { status: response.status }
            );
        }

        // Proxy the stream
        const stream = new ReadableStream({
            async start(controller) {
                const reader = response.body?.getReader();
                if (!reader) {
                    controller.close();
                    return;
                }

                // Bug #7 fix: Removed duplicate [DONE] — OpenAI already sends it in the stream
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) {
                            controller.close();
                            break;
                        }
                        controller.enqueue(value);
                    }
                } catch (error) {
                    console.error('Stream error:', error);
                    controller.error(error);
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive',
            },
        });
    } catch (error) {
        console.error('Chat API error:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
