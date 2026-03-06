import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

// Cron keepalive — pings Supabase to prevent free tier pause
// Called every 5 days via vercel.json cron
export async function GET() {
    try {
        const supabase = createServiceClient();
        const { count } = await supabase
            .from('bot_config')
            .select('*', { count: 'exact', head: true });

        return NextResponse.json({
            ok: true,
            timestamp: new Date().toISOString(),
            bot_config_rows: count
        });
    } catch (err) {
        console.error('Keepalive error:', err);
        return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
    }
}
