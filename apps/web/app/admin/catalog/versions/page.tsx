'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataTableShell } from '@/components/admin/DataTableShell';
import { NoticeBanner } from '@/components/admin/NoticeBanner';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatusPill } from '@/components/admin/StatusPill';
import { parseApiError } from '@/lib/api-errors';
import { client } from '@/lib/sdk/client';
import { adminKeys } from '@/lib/sdk/hooks';
import type { paths } from '@vexel/contracts';

type ListCatalogVersionsResponse =
  paths['/catalog/versions']['get']['responses'][200]['content']['application/json'];

const statusOptions = ['draft', 'published', 'archived'] as const;

export default function CatalogVersionsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);

  const { data, error } = useQuery({
    queryKey: adminKeys.catalogVersions(statusFilter || undefined),
    queryFn: async () => {
      const { data: res, error: err } = await client.GET('/catalog/versions', {
        params: {
          query: {
            status: statusFilter || undefined,
            page,
          },
        },
      });
      if (err) throw new Error(parseApiError(err, 'Failed to load catalog versions').message);
      return res as ListCatalogVersionsResponse;
    },
  });

  const versions = data?.data ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Catalog Versions"
        subtitle="Draft, published, and archived catalog snapshots."
      />

      {error ? (
        <NoticeBanner title="Unable to load versions" tone="warning">
          {error instanceof Error ? error.message : 'Unknown error'}
        </NoticeBanner>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-[var(--muted)]">Status</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
        >
          <option value="">All</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <DataTableShell
        title="Versions"
        subtitle="GET /catalog/versions"
        isEmpty={versions.length === 0}
        emptyTitle="No versions found"
        emptyDescription="Create a draft version via API or import."
      >
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--bg)] text-left text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Version tag</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium">Notes</th>
            </tr>
          </thead>
          <tbody>
            {versions.map((v) => (
              <tr key={v.id} className="border-t border-[var(--border)]">
                <td className="px-4 py-3 font-medium">{v.versionTag}</td>
                <td className="px-4 py-3">
                  <StatusPill
                    status={
                      v.status === 'published'
                        ? 'active'
                        : v.status === 'draft'
                          ? 'inactive'
                          : 'inactive'
                    }
                  />
                  <span className="ml-1 text-[var(--muted)]">{v.status}</span>
                </td>
                <td className="px-4 py-3">{new Date(v.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3">{v.notes ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DataTableShell>

      {total > 0 && (
        <p className="text-sm text-[var(--muted)]">
          Total: {total}. Page {page}.
        </p>
      )}
    </div>
  );
}
