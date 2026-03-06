'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';

const NAV_ITEMS = [
    { href: '/admin', label: 'Overview', icon: '📊', exact: true },
    { href: '/admin/conversations', label: 'Conversaciones', icon: '💬' },
    { href: '/admin/config', label: 'Configuración', icon: '⚙️' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();

    const handleSignOut = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/admin/login');
    };

    return (
        <div className="admin-shell">
            {/* Sidebar */}
            <aside className="admin-sidebar">
                <div className="admin-sidebar-logo">
                    <div className="admin-avatar">L</div>
                    <span className="admin-logo-text">Lucy Admin</span>
                </div>

                <nav className="admin-nav">
                    {NAV_ITEMS.map((item) => {
                        const isActive = item.exact
                            ? pathname === item.href
                            : pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`admin-nav-item${isActive ? ' active' : ''}`}
                            >
                                <span className="admin-nav-icon">{item.icon}</span>
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="admin-sidebar-footer">
                    <Link href="/" className="admin-nav-item back-link">
                        <span className="admin-nav-icon">↩️</span>
                        <span>Volver al chat</span>
                    </Link>
                    <button className="admin-signout-btn" onClick={handleSignOut}>
                        Cerrar sesión
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main className="admin-main">
                {children}
            </main>
        </div>
    );
}
