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

export async function GET(request: NextRequest) {
    if (!(await verifyAdmin(request))) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('search') || '';
    const offset = (page - 1) * limit;

    const supabase = createServiceClient();

    let query = supabase
        .from('conversations')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (search) {
        query = query.ilike('title', `%${search}%`);
    }

    const { data, count, error } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
        conversations: data || [],
        total: count || 0,
        page,
        pages: Math.ceil((count || 0) / limit),
    });
}
