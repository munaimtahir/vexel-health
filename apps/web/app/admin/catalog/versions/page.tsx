'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DataTableShell } from '@/components/admin/DataTableShell';
import { NoticeBanner } from '@/components/admin/NoticeBanner';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatusPill } from '@/components/admin/StatusPill';
import { parseApiError } from '@/lib/api-errors';
import { client } from '@/lib/sdk/client';
import { adminKeys } from '@/lib/sdk/hooks';
import type { components, paths } from '@vexel/contracts';

type ListCatalogVersionsResponse =
  paths['/catalog/versions']['get']['responses'][200]['content']['application/json'];
type CreateCatalogVersionRequest = NonNullable<
  paths['/catalog/versions']['post']['requestBody']
>['content']['application/json'];
type CatalogVersion = components['schemas']['CatalogVersion'];
type CatalogVersionStatus = components['schemas']['CatalogVersionStatus'];

const statusOptions: Array<CatalogVersionStatus | 'all'> = ['all', 'draft', 'published', 'archived'];

export default function CatalogVersionsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<CatalogVersionStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [createForm, setCreateForm] = useState<CreateCatalogVersionRequest>({
    versionTag: '',
    notes: '',
  });

  const statusQuery: CatalogVersionStatus | undefined = statusFilter === 'all' ? undefined : statusFilter;

  const { data, error, isLoading } = useQuery({
    queryKey: [...adminKeys.catalogVersions(statusQuery), page],
    queryFn: async () => {
      const { data: res, error: err } = await client.GET('/catalog/versions', {
        params: {
          query: {
            status: statusQuery,
            page,
          },
        },
      });
      if (err) throw new Error(parseApiError(err, 'Failed to load catalog versions').message);
      return res as ListCatalogVersionsResponse;
    },
  });

  const createVersion = useMutation({
    mutationFn: async () => {
      const payload: CreateCatalogVersionRequest = {
        ...(createForm.versionTag?.trim() ? { versionTag: createForm.versionTag.trim() } : {}),
        ...(createForm.notes?.trim() ? { notes: createForm.notes.trim() } : {}),
      };
      const { data, error } = await client.POST('/catalog/versions', {
        body: payload,
      });
      if (error) throw new Error(parseApiError(error, 'Failed to create version').message);
      return data as CatalogVersion;
    },
    onSuccess: async () => {
      setCreateForm({ versionTag: '', notes: '' });
      await queryClient.invalidateQueries({ queryKey: adminKeys.catalogVersions() });
      await queryClient.invalidateQueries({ queryKey: adminKeys.catalogVersions('draft') });
    },
  });

  const publishVersion = useMutation({
    mutationFn: async (versionId: string) => {
      const { data, error } = await client.POST('/catalog/versions/{versionId}/publish', {
        params: {
          path: {
            versionId,
          },
        },
      });
      if (error) throw new Error(parseApiError(error, 'Failed to publish version').message);
      return data as CatalogVersion;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminKeys.catalogVersions() });
      await queryClient.invalidateQueries({ queryKey: adminKeys.catalogVersions('draft') });
      await queryClient.invalidateQueries({ queryKey: adminKeys.catalogVersions('published') });
    },
  });

  const onCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createVersion.mutate();
  };

  const versions = data?.data ?? [];
  const total = data?.total ?? 0;
  const hasPrev = page > 1;
  const hasNext = page * 20 < total;

  const latestPublished = useMemo(
    () => versions.find((item) => item.status === 'published')?.versionTag,
    [versions],
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Catalog Versions" subtitle="Create draft versions and publish snapshots." />

      {error ? (
        <NoticeBanner title="Unable to load versions" tone="warning">
          {error instanceof Error ? error.message : 'Unknown error'}
        </NoticeBanner>
      ) : null}

      {createVersion.error ? (
        <NoticeBanner title="Unable to create version" tone="warning">
          {createVersion.error instanceof Error ? createVersion.error.message : 'Unknown error'}
        </NoticeBanner>
      ) : null}

      {publishVersion.error ? (
        <NoticeBanner title="Unable to publish version" tone="warning">
          {publishVersion.error instanceof Error ? publishVersion.error.message : 'Unknown error'}
        </NoticeBanner>
      ) : null}

      <form onSubmit={onCreate} className="grid grid-cols-1 gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 md:grid-cols-4">
        <input
          value={createForm.versionTag ?? ''}
          onChange={(event) => setCreateForm((prev) => ({ ...prev, versionTag: event.target.value }))}
          placeholder="Version tag (optional)"
          className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
        />
        <input
          value={createForm.notes ?? ''}
          onChange={(event) => setCreateForm((prev) => ({ ...prev, notes: event.target.value }))}
          placeholder="Notes (optional)"
          className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm md:col-span-2"
        />
        <button
          type="submit"
          disabled={createVersion.isPending}
          className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] disabled:opacity-60"
        >
          {createVersion.isPending ? 'Creating...' : 'Create draft'}
        </button>
      </form>

      <DataTableShell
        title="Versions"
        subtitle="GET /catalog/versions"
        isEmpty={!isLoading && versions.length === 0}
        emptyTitle="No versions found"
        emptyDescription="Create the first draft version."
        toolbar={
          <div className="flex items-center gap-3">
            <label className="text-sm text-[var(--muted)]">Status</label>
            <select
              value={statusFilter}
              onChange={(event) => {
                setPage(1);
                setStatusFilter(event.target.value as CatalogVersionStatus | 'all');
              }}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <span className="text-sm text-[var(--muted)]">Latest published in this page: {latestPublished ?? '—'}</span>
          </div>
        }
      >
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--bg)] text-left text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Version tag</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium">Notes</th>
              <th className="px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {versions.map((version) => (
              <tr key={version.id} className="border-t border-[var(--border)]">
                <td className="px-4 py-3 font-medium">{version.versionTag}</td>
                <td className="px-4 py-3">
                  <StatusPill
                    status={
                      version.status === 'published'
                        ? 'active'
                        : version.status === 'draft'
                          ? 'pending'
                          : 'inactive'
                    }
                  />
                  <span className="ml-2 text-[var(--muted)]">{version.status}</span>
                </td>
                <td className="px-4 py-3">{new Date(version.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3">{version.notes ?? '—'}</td>
                <td className="px-4 py-3">
                  {version.status === 'draft' ? (
                    <button
                      type="button"
                      onClick={() => publishVersion.mutate(version.id)}
                      disabled={publishVersion.isPending}
                      className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium"
                    >
                      Publish
                    </button>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </DataTableShell>

      <div className="flex items-center justify-between">
        <span className="text-sm text-[var(--muted)]">Total: {total} · Page {page}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={!hasPrev}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setPage((prev) => prev + 1)}
            disabled={!hasNext}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
