import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
    // Solo proteger rutas /admin (excepto /admin/login)
    if (
        !request.nextUrl.pathname.startsWith('/admin') ||
        request.nextUrl.pathname === '/admin/login'
    ) {
        return NextResponse.next()
    }

    // Verificar sesión de Supabase via cookies
    const response = NextResponse.next()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll: () => request.cookies.getAll(),
                setAll: (cookies) => {
                    cookies.forEach(({ name, value, options }) => {
                        response.cookies.set(name, value, options)
                    })
                },
            },
        }
    )

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user || user.email !== process.env.ADMIN_EMAIL) {
        return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    return response
}

export const config = {
    matcher: ['/admin/:path*'],
}
