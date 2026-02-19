import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import './globals.css';
import { Providers } from '@/components/providers';
import { ConditionalAuth } from '@/components/auth/ConditionalAuth';

export const metadata: Metadata = {
    title: 'Vexel Health',
    description: 'Vexel Health Platform',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
                <nav className="border-b border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 flex items-center gap-6 text-sm shadow-sm">
                    <Link href="/patients" className="font-medium text-[var(--text)] hover:text-[var(--accent)] transition">
                        Patients
                    </Link>
                    <Link href="/operator/worklist" className="font-medium text-[var(--text)] hover:text-[var(--accent)] transition">
                        Operator
                    </Link>
                    <Link href="/verification" className="font-medium text-[var(--text)] hover:text-[var(--accent)] transition">
                        Verification
                    </Link>
                    <Link href="/admin" className="font-medium text-[var(--text)] hover:text-[var(--accent)] transition">
                        Admin
                    </Link>
                </nav>
                <Providers>
                    <Suspense fallback={<>{children}</>}>
                        <ConditionalAuth>{children}</ConditionalAuth>
                    </Suspense>
                </Providers>
            </body>
        </html>
    );
}
