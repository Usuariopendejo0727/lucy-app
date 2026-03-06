// Cliente para API Routes (usa service role key, acceso completo)
// NUNCA exponer al frontend — solo usar en server-side code
import { createClient } from '@supabase/supabase-js'

export function createServiceClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}
