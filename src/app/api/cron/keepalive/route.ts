import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

// Cron keepalive — pings Supabase to prevent free tier pause
// Called every 3 days via vercel.json cron
// Env var CRON_SECRET must be configured in the Vercel dashboard
export async function GET(request: Request) {
    // BUG-11 fix: Verify Vercel Cron authorization
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const supabase = createServiceClient();
        await supabase
            .from('bot_config')
            .select('*', { count: 'exact', head: true });

        return NextResponse.json({
            ok: true,
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        console.error('Keepalive error:', err);
        return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
    }
}
