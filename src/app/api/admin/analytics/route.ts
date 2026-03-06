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

    const supabase = createServiceClient();

    // Summary
    const { data: summary } = await supabase.from('dashboard_summary').select('*').single();

    // Daily metrics (últimos 30 días)
    const { data: daily } = await supabase
        .from('daily_metrics')
        .select('*')
        .order('date', { ascending: false })
        .limit(30);

    // Frequent questions (top 20)
    const { data: frequentQuestions } = await supabase
        .from('frequent_questions')
        .select('*');

    return NextResponse.json({
        summary: summary || {
            total_conversations: 0,
            total_messages: 0,
            user_messages: 0,
            assistant_messages: 0,
            unique_users: 0,
            conversations_today: 0,
            messages_today: 0,
        },
        daily: daily || [],
        frequent_questions: frequentQuestions || [],
    });
}
