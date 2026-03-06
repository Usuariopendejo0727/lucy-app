import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createServiceClient } from '@/lib/supabase-server';

async function verifyAdmin(request: NextRequest): Promise<boolean> {
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll: () => request.cookies.getAll(),
                setAll: () => { },
            },
        }
    );
    const { data: { user } } = await supabase.auth.getUser();
    return !!(user && user.email === process.env.ADMIN_EMAIL);
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!(await verifyAdmin(request))) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createServiceClient();

    const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', id)
        .single();

    if (convError || !conversation) {
        return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 });
    }

    const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true });

    if (msgError) {
        return NextResponse.json({ error: msgError.message }, { status: 500 });
    }

    return NextResponse.json({ conversation, messages: messages || [] });
}
