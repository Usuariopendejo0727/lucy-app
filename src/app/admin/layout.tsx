import type { Metadata } from 'next';
import AdminLayout from '@/components/Admin/AdminLayout';

export const metadata: Metadata = {
    title: 'Lucy Admin — Panel de administración',
    description: 'Dashboard administrativo de Lucy AI',
};

export default function AdminSectionLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <AdminLayout>{children}</AdminLayout>;
}
