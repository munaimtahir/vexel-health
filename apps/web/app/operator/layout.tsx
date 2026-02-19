import { OperatorNav } from '@/components/operator/OperatorNav';
import { OperatorHeader } from '@/components/operator/OperatorHeader';
import { appConfig } from '@/lib/app-config';

export default function OperatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(90%_130%_at_0%_0%,#0f2a3a_0%,#08121a_45%,#05080d_100%)] text-[var(--text)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(24,161,196,0.14),rgba(13,148,136,0.09),rgba(251,191,36,0.08))]" />
      <div className="pointer-events-none absolute -left-24 top-20 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-6 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
      <OperatorHeader labName={appConfig.labName} />
      <div className="relative z-10 flex flex-1">
        <OperatorNav />
        <main className="flex-1 p-4 md:p-6">
          <div className="rounded-2xl border border-white/10 bg-white/85 p-4 shadow-[0_24px_80px_rgba(2,6,23,0.45)] backdrop-blur md:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
