import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ─── Config Cache (60s TTL) ────────────────────────────────────────────────
let configCache: Record<string, string> | null = null;
let configCacheTime = 0;
const CONFIG_CACHE_TTL = 60000; // 60 segundos

async function getConfig(): Promise<Record<string, string>> {
    const now = Date.now();
    if (configCache && (now - configCacheTime) < CONFIG_CACHE_TTL) {
        return configCache;
    }
    try {
        const supabase = createServiceClient();
        const { data } = await supabase.from('bot_config').select('key, value');
        configCache = Object.fromEntries(data?.map((r: { key: string; value: string }) => [r.key, r.value]) || []);
        configCacheTime = now;
        return configCache;
    } catch (err) {
        console.error('Error loading bot_config from Supabase:', err);
        // Fallback defaults si Supabase no responde
        return {
            system_prompt: 'Eres Lucy, la asistente virtual experta de IntegroSuite.',
            model: 'gpt-4o-mini',
            temperature: '0.7',
            max_tokens: '2048',
            rate_limit_per_minute: '20',
            max_messages_per_conversation: '50',
        };
    }
}

// ─── Rate limiting via Supabase (shared across serverless instances) ────────
// Requires table: rate_limit_events (ip_address TEXT, created_at TIMESTAMPTZ DEFAULT now())
// The CRON_SECRET env var should be configured in the Vercel dashboard.
async function checkRateLimit(ip: string, limitPerMin: number): Promise<boolean> {
    const supabase = createServiceClient();
    const windowStart = new Date(Date.now() - 60000).toISOString();
    const { count } = await supabase
        .from('rate_limit_events')
        .select('*', { count: 'exact', head: true })
        .eq('ip_address', ip)
        .gte('created_at', windowStart);
    if ((count ?? 0) >= limitPerMin) return false;
    await supabase.from('rate_limit_events').insert({ ip_address: ip });
    return true;
}

// ─── Input validation ────────────────────────────────────────────────────────
const MAX_MESSAGE_LENGTH = 10000;
const VALID_ROLES = new Set(['user', 'assistant']);

// ─── Save conversation async (non-blocking) ──────────────────────────────────
async function saveToSupabase(
    sessionId: string,
    userMessage: string,
    assistantMessage: string,
    ipAddress: string
) {
    try {
        const supabase = createServiceClient();

        // Upsert conversation (BUG-02 fix: use upsert instead of insert)
        const { data: conv, error: convError } = await supabase
            .from('conversations')
            .upsert(
                {
                    session_id: sessionId,
                    title: userMessage.slice(0, 80),
                    ip_address: ipAddress,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'session_id', ignoreDuplicates: false }
            )
            .select('id, message_count')
            .single();

        if (convError || !conv) {
            console.error('Error upserting conversation:', convError);
            return;
        }

        // Increment message_count dynamically (BUG-02/06 fix)
        if (conv) {
            await supabase
                .from('conversations')
                .update({ message_count: (conv.message_count ?? 0) + 2 })
                .eq('id', conv.id);
        }

        // Insert user + assistant messages
        await supabase.from('messages').insert([
            { conversation_id: conv.id, role: 'user', content: userMessage },
            { conversation_id: conv.id, role: 'assistant', content: assistantMessage },
        ]);

        // Log analytics event
        await supabase.from('analytics_events').insert([
            {
                event_type: 'chat_started',
                session_id: sessionId,
                conversation_id: conv.id,
            },
            {
                event_type: 'message_sent',
                session_id: sessionId,
                conversation_id: conv.id,
                metadata: { message_length: userMessage.length },
            },
        ]);
    } catch (err) {
        console.error('Error saving to Supabase (non-blocking):', err);
    }
}

// ─── POST Handler ─────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
    if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your-openai-api-key-here' || OPENAI_API_KEY === 'tu-api-key-aqui') {
        return NextResponse.json(
            { error: 'API key de OpenAI no configurada. Agrega OPENAI_API_KEY en las variables de entorno.' },
            { status: 500 }
        );
    }

    // Load config from Supabase (with cache)
    const config = await getConfig();
    const rateLimit = parseInt(config.rate_limit_per_minute || '20', 10);
    const maxMessages = parseInt(config.max_messages_per_conversation || '50', 10);
    const systemPrompt = config.system_prompt || 'Eres Lucy, asistente virtual de IntegroSuite.';
    const model = config.model || 'gpt-4o-mini';
    const temperature = parseFloat(config.temperature || '0.7');
    const maxTokens = parseInt(config.max_tokens || '2048', 10);

    // BUG-04 fix: Prioritize Vercel-verified headers over spoofable ones
    const ip =
        request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        'unknown';
    if (!(await checkRateLimit(ip, rateLimit))) {
        return NextResponse.json(
            { error: 'Has enviado demasiados mensajes. Espera un minuto e intenta de nuevo.' },
            { status: 429 }
        );
    }

    try {
        const body = await request.json();
        const { messages, sessionId } = body;

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json({ error: 'Mensajes no válidos' }, { status: 400 });
        }

        if (messages.length > maxMessages) {
            return NextResponse.json({ error: 'Demasiados mensajes en la conversación' }, { status: 400 });
        }

        for (const m of messages) {
            if (typeof m.content !== 'string' || m.content.length > MAX_MESSAGE_LENGTH) {
                return NextResponse.json({ error: 'Contenido de mensaje inválido o demasiado largo' }, { status: 400 });
            }
            if (!VALID_ROLES.has(m.role)) {
                return NextResponse.json({ error: 'Rol de mensaje no válido' }, { status: 400 });
            }
        }

        const apiMessages = [
            { role: 'system' as const, content: systemPrompt },
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
                model,
                messages: apiMessages,
                stream: true,
                temperature,
                max_tokens: maxTokens,
            }),
        });

        // BUG-13 fix: Don't expose OpenAI internal errors to client
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('OpenAI API error:', response.status, errorData);

            const supabase = createServiceClient();
            await supabase.from('analytics_events').insert({
                event_type: 'error',
                session_id: sessionId || 'unknown',
                metadata: { status: response.status },
            });

            const userFacingMsg =
                response.status === 429
                    ? 'El servicio está temporalmente saturado. Intenta en un momento.'
                    : response.status === 401
                        ? 'Error de configuración del servicio. Contacta al administrador.'
                        : 'Error al comunicarse con la IA. Por favor intenta de nuevo.';

            return NextResponse.json({ error: userFacingMsg }, { status: response.status });
        }

        // Collect full assistant response to save to Supabase async
        let assistantContent = '';
        const lastUserMessage = [...messages].reverse().find((m: { role: string }) => m.role === 'user')?.content || '';

        const stream = new ReadableStream({
            async start(controller) {
                const reader = response.body?.getReader();
                if (!reader) { controller.close(); return; }

                const decoder = new TextDecoder();
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) {
                            controller.close();
                            // Save to Supabase asynchronously after stream is done
                            if (sessionId && lastUserMessage && assistantContent) {
                                saveToSupabase(sessionId, lastUserMessage, assistantContent, ip);
                            }
                            break;
                        }
                        controller.enqueue(value);
                        // Parse streaming chunks to accumulate assistant content
                        const chunk = decoder.decode(value, { stream: true });
                        const lines = chunk.split('\n').filter(l => l.startsWith('data: ') && l !== 'data: [DONE]');
                        for (const line of lines) {
                            try {
                                const json = JSON.parse(line.slice(6));
                                const delta = json?.choices?.[0]?.delta?.content;
                                if (delta) assistantContent += delta;
                            } catch { /* ignore parse errors */ }
                        }
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
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
