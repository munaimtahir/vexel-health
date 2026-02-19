'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { operatorRoutes } from '@/lib/operator/routes';

const navItems = [
  { label: 'Register', href: operatorRoutes.register },
  { label: 'Samples', href: operatorRoutes.samples },
  { label: 'Verify', href: operatorRoutes.verify },
  { label: 'Published Reports', href: operatorRoutes.publishedReports },
  { label: 'Worklist', href: operatorRoutes.worklist },
];

export function OperatorNav() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const renderNavLinks = (mode: 'desktop' | 'mobile') => (
    <ul className="space-y-1.5">
      {navItems.map(({ label, href }) => {
        const isActive = pathname === href || pathname.startsWith(href + '/');
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={() => {
                if (mode === 'mobile') {
                  setDrawerOpen(false);
                }
              }}
              className={`block rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-100 hover:bg-white/15'
              }`}
            >
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="fixed left-4 top-20 z-30 rounded-full border border-white/20 bg-slate-900/85 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white shadow-lg backdrop-blur md:hidden"
      >
        Menu
      </button>

      <div
        className={`fixed inset-0 z-40 bg-slate-950/55 transition md:hidden ${
          drawerOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setDrawerOpen(false)}
      />

      <aside
        className={`fixed left-0 top-0 z-50 h-full w-72 border-r border-white/20 bg-slate-950/90 p-4 backdrop-blur transition-transform md:hidden ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/80">
            Operator Menu
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="rounded-md border border-white/20 px-2 py-1 text-xs font-semibold text-white"
          >
            Close
          </button>
        </div>
        {renderNavLinks('mobile')}
      </aside>

      <nav className="hidden w-64 shrink-0 flex-col border-r border-white/15 bg-slate-950/70 p-4 shadow-xl backdrop-blur md:flex">
      <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/70">
        Workflow
      </div>
        {renderNavLinks('desktop')}
      </nav>
    </>
  );
}
