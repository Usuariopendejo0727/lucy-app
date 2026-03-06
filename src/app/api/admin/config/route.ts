import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createServiceClient } from '@/lib/supabase-server';

// Helper — verify admin session from cookies
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

// GET — retorna toda la config como objeto plano
export async function GET(request: NextRequest) {
    if (!(await verifyAdmin(request))) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase.from('bot_config').select('key, value');

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const config = Object.fromEntries(data?.map(r => [r.key, r.value]) || []);
    return NextResponse.json(config);
}

// PUT — actualiza una o varias keys
export async function PUT(request: NextRequest) {
    if (!(await verifyAdmin(request))) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const supabase = createServiceClient();

    // Accepts { key, value } or { configs: [{ key, value }] }
    const updates: { key: string; value: string }[] = body.configs
        ? body.configs
        : [{ key: body.key, value: body.value }];

    const { error } = await supabase
        .from('bot_config')
        .upsert(
            updates.map(u => ({ key: u.key, value: u.value, updated_at: new Date().toISOString() })),
            { onConflict: 'key' }
        );

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
