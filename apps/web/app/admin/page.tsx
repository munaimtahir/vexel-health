'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AdminCard } from '@/components/admin/AdminCard';
import { FeatureGate } from '@/components/admin/FeatureGate';
import { NoticeBanner } from '@/components/admin/NoticeBanner';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatusPill } from '@/components/admin/StatusPill';
import { adminRoutes } from '@/lib/admin/routes';
import { parseApiError } from '@/lib/api-errors';
import { client } from '@/lib/sdk/client';
import { adminKeys } from '@/lib/sdk/hooks';
import type { paths } from '@vexel/contracts';

type AdminOverviewResponse =
  paths['/admin/overview']['get']['responses'][200]['content']['application/json'];

export default function AdminDashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: adminKeys.overview(),
    queryFn: async () => {
      const { data: response, error: apiError } = await client.GET('/admin/overview');
      if (apiError) {
        throw new Error(parseApiError(apiError, 'Failed to load admin dashboard').message);
      }
      return response as AdminOverviewResponse;
    },
  });

  const counts = data?.counts;
  const statusEntries = Object.entries(counts?.encounters_by_status ?? {});
  const featureEntries = Object.entries(data?.features ?? {});

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Tenant-scoped operational snapshot for admin workflows."
        actions={
          <>
            <Link
              href={adminRoutes.businessOverview}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--text)]"
            >
              Business & Users
            </Link>
            <Link
              href={adminRoutes.catalogOverview}
              className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)]"
            >
              Catalog Settings
            </Link>
          </>
        }
      />

      {error ? (
        <NoticeBanner title="Unable to load dashboard overview" tone="warning">
          {error instanceof Error ? error.message : 'Unknown error'}
        </NoticeBanner>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-6">
        <AdminCard title="Verification Queue">
          <p className="text-3xl font-semibold">{isLoading ? '...' : counts?.verification_queue_count ?? 0}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Items awaiting verification</p>
        </AdminCard>

        <AdminCard title="Published (24h)">
          <p className="text-3xl font-semibold">{isLoading ? '...' : counts?.published_last_24h_count ?? 0}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Reports published in the last day</p>
        </AdminCard>

        <AdminCard title="Catalog Coverage">
          <p className="text-3xl font-semibold">{isLoading ? '...' : data?.catalog?.tests_count ?? 0}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Configured tests · Panels: {isLoading ? '...' : data?.catalog?.panels_count ?? counts?.panels_count ?? 0}
          </p>
        </AdminCard>

        <AdminCard title="Tenant Users">
          <p className="text-3xl font-semibold">{isLoading ? '...' : counts?.users_count ?? 0}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Active and inactive tenant users</p>
          <Link href={adminRoutes.usersList} className="mt-3 inline-block text-sm font-medium text-[var(--accent)]">
            Open users
          </Link>
        </AdminCard>

        <AdminCard title="Pending Imports">
          <p className="text-3xl font-semibold">{isLoading ? '...' : counts?.pending_imports_count ?? 0}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Catalog import jobs not completed</p>
        </AdminCard>

        <AdminCard title="PDF Service Health">
          <div className="flex items-center gap-2">
            <StatusPill status={isLoading ? 'pending' : data?.system?.pdf_service_health?.status} />
          </div>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Last checked:{' '}
            {data?.system?.pdf_service_health?.last_checked_at
              ? new Date(data.system.pdf_service_health.last_checked_at).toLocaleString()
              : '—'}
          </p>
        </AdminCard>
      </div>

      <FeatureGate featureKey="platform.audit">
        <AdminCard title="Encounter Status Breakdown" subtitle="Derived status counts from tenant data.">
          {statusEntries.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No encounter status data available.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {statusEntries.map(([status, value]) => (
                <span
                  key={status}
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                >
                  <StatusPill status={status} />
                  <strong>{value}</strong>
                </span>
              ))}
            </div>
          )}
        </AdminCard>
      </FeatureGate>

      <AdminCard title="Feature Flags" subtitle="Backend-authoritative toggles exposed for current tenant.">
        {featureEntries.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No feature flags returned from API.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {featureEntries.map(([key, enabled]) => (
              <span
                key={key}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
              >
                <span className="font-medium">{key}</span>
                <StatusPill status={enabled ? 'enabled' : 'inactive'} />
              </span>
            ))}
          </div>
        )}
      </AdminCard>
    </div>
  );
}
