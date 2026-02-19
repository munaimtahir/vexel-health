'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { AdminNav } from '@/components/admin/AdminNav';
import { NoticeBanner } from '@/components/admin/NoticeBanner';
import { client } from '@/lib/sdk/client';
import { parseApiError } from '@/lib/api-errors';
import { adminKeys } from '@/lib/sdk/hooks';
import type { paths } from '@vexel/contracts';

type MeResponse = paths['/me']['get']['responses'][200]['content']['application/json'];
type AdminOverviewResponse =
  paths['/admin/overview']['get']['responses'][200]['content']['application/json'];

type AdminLayoutShellProps = {
  children: React.ReactNode;
};

export function AdminLayoutShell({ children }: AdminLayoutShellProps) {
  const { data } = useQuery({
    queryKey: adminKeys.me(),
    queryFn: async () => {
      const { data: response, error } = await client.GET('/me');
      if (error) {
        throw new Error(parseApiError(error, 'Failed to load current user').message);
      }
      return response as MeResponse;
    },
  });
  const {
    isLoading: checkingAdminAccess,
    error: adminAccessError,
  } = useQuery({
    queryKey: adminKeys.overview(),
    queryFn: async () => {
      const { data: response, error } = await client.GET('/admin/overview');
      if (error) {
        throw new Error(parseApiError(error, 'Admin role is required for this area.').message);
      }
      return response as AdminOverviewResponse;
    },
    retry: false,
  });

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
        {checkingAdminAccess ? (
          <div className="flex min-h-screen items-center justify-center px-6">
            <p className="text-sm text-[var(--muted)]">Checking admin access...</p>
          </div>
        ) : null}
        {!checkingAdminAccess && adminAccessError ? (
          <main className="mx-auto max-w-3xl p-6 lg:p-8">
            <NoticeBanner title="Admin access required" tone="warning">
              {(adminAccessError as Error).message}
            </NoticeBanner>
            <div className="mt-4">
              <Link
                href="/patients"
                className="inline-flex rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)]"
              >
                Go to Patients
              </Link>
            </div>
          </main>
        ) : null}
        {!checkingAdminAccess && !adminAccessError ? (
          <div className="flex min-h-screen flex-col lg:flex-row">
            <AdminNav />
            <div className="flex flex-1 flex-col">
              <header className="border-b border-[var(--border)] bg-[var(--surface)] px-6 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Tenant-scoped</p>
                    <h2 className="text-lg font-semibold">Administration</h2>
                  </div>
                  <p className="text-sm text-[var(--muted)]">
                    {data?.name ?? data?.email ?? 'Authenticated tenant user'}
                  </p>
                </div>
              </header>
              <main className="flex-1 p-6 lg:p-8">{children}</main>
            </div>
          </div>
        ) : null}
      </div>
    </AuthGuard>
  );
}
