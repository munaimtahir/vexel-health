import { OperatorNav } from '@/components/operator/OperatorNav';
import { OperatorHeader } from '@/components/operator/OperatorHeader';
import { appConfig } from '@/lib/app-config';

export default function OperatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)] text-[var(--text)]">
      <OperatorHeader labName={appConfig.labName} />
      <div className="flex flex-1">
        <OperatorNav />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
