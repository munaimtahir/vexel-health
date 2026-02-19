'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { adminNavSections, adminRoutes } from '@/lib/admin/routes';
import { useFeatures } from '@/lib/admin/useFeatures';

function isRouteActive(pathname: string, href: string): boolean {
  if (href === adminRoutes.dashboard) {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav() {
  const pathname = usePathname() ?? '';
  const { isEnabled, isLoading } = useFeatures();

  const filterItems = (items: typeof adminNavSections[0]['items']) =>
    items.filter((item) => {
      if (!item.featureKey) return true;
      if (isLoading) return false;
      return isEnabled(item.featureKey);
    });

  return (
    <aside className="w-full border-b border-[var(--border)] bg-[var(--surface)] lg:min-h-screen lg:w-72 lg:border-b-0 lg:border-r">
      <div className="px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Vexel</p>
        <p className="mt-1 text-lg font-semibold text-[var(--text)]">Admin Panel</p>
      </div>
      <nav className="px-4 pb-6">
        {adminNavSections.map((section) => {
          const items = filterItems(section.items);
          if (items.length === 0) return null;
          return (
            <div key={section.label} className="mb-4">
              <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                {section.label}
              </p>
              <ul className="space-y-1">
                {items.map((item) => {
                  const active = isRouteActive(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`block rounded-xl px-3 py-2 text-sm transition ${
                          active
                            ? 'bg-[var(--accent)] text-[var(--accent-foreground)]'
                            : 'text-[var(--text)] hover:bg-[var(--bg)]'
                        }`}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
