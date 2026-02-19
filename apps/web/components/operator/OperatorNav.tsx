'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { operatorRoutes } from '@/lib/operator/routes';

const navItems = [
  { label: 'Register', href: operatorRoutes.register },
  { label: 'Worklist', href: operatorRoutes.worklist },
  { label: 'Samples', href: operatorRoutes.samples },
  { label: 'Verify', href: operatorRoutes.verify },
  { label: 'Published Reports', href: operatorRoutes.publishedReports },
];

export function OperatorNav() {
  const pathname = usePathname();

  return (
    <nav className="flex w-52 flex-col border-r border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
        Menu
      </div>
      <ul className="space-y-1">
        {navItems.map(({ label, href }) => {
          const isActive =
            pathname === href || (href !== operatorRoutes.worklist && pathname.startsWith(href + '/'));
          return (
            <li key={href}>
              <Link
                href={href}
                className={`block rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-[var(--accent)] text-[var(--accent-foreground)]'
                    : 'text-[var(--text)] hover:bg-[var(--bg)]'
                }`}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
