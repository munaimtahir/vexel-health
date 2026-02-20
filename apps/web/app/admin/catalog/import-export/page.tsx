'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AdminCard } from '@/components/admin/AdminCard';
import { DataTableShell } from '@/components/admin/DataTableShell';
import { NoticeBanner } from '@/components/admin/NoticeBanner';
import { PageHeader } from '@/components/admin/PageHeader';
import { parseApiError } from '@/lib/api-errors';
import { client } from '@/lib/sdk/client';
import { adminKeys } from '@/lib/sdk/hooks';
import type { paths } from '@vexel/contracts';

type CatalogImportResponse =
  paths['/catalog/import']['post']['responses'][200]['content']['application/json'];
type ListCatalogAuditsResponse =
  paths['/catalog/audit']['get']['responses'][200]['content']['application/json'];
type ListCatalogVersionsResponse =
  paths['/catalog/versions']['get']['responses'][200]['content']['application/json'];
type ExportCatalogRequest = NonNullable<
  paths['/catalog/export']['post']['requestBody']
>['content']['application/json'];

export default function CatalogImportExportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [importResult, setImportResult] = useState<CatalogImportResponse | null>(null);
  const [exportVersionId, setExportVersionId] = useState('');

  const { data: versionsData, error: versionsError } = useQuery({
    queryKey: adminKeys.catalogVersions('published'),
    queryFn: async () => {
      const { data, error } = await client.GET('/catalog/versions', {
        params: { query: { status: 'published' } },
      });
      if (error) throw new Error(parseApiError(error, 'Failed to load published versions').message);
      return data as ListCatalogVersionsResponse;
    },
  });

  const { data: auditsData, error: auditsError } = useQuery({
    queryKey: adminKeys.catalogAudits(),
    queryFn: async () => {
      const { data, error } = await client.GET('/catalog/audit');
      if (error) throw new Error(parseApiError(error, 'Failed to load audit runs').message);
      return data as ListCatalogAuditsResponse;
    },
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!file) {
        throw new Error('Select a file first');
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('dryRun', String(dryRun));

      const { data, error } = await client.POST('/catalog/import', {
        body: formData as never,
      });
      if (error) throw new Error(parseApiError(error, 'Import failed').message);
      return data as CatalogImportResponse;
    },
    onSuccess: (data) => {
      setImportResult(data);
    },
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const body: ExportCatalogRequest = exportVersionId ? { versionId: exportVersionId } : {};

      const { data, error } = await client.POST('/catalog/export', {
        body,
        parseAs: 'arrayBuffer',
      });
      if (error) throw new Error(parseApiError(error, 'Export failed').message);
      return data;
    },
    onSuccess: (data) => {
      if (!data) return;
      const blob = new Blob([data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = `catalog-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
    },
  });

  const auditRuns = auditsData?.data ?? [];
  const versions = versionsData?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import / Export"
        subtitle="XLSX catalog import and export using contract endpoints."
      />

      {versionsError ? (
        <NoticeBanner title="Unable to load versions" tone="warning">
          {versionsError instanceof Error ? versionsError.message : 'Unknown error'}
        </NoticeBanner>
      ) : null}

      {auditsError ? (
        <NoticeBanner title="Unable to load audit runs" tone="warning">
          {auditsError instanceof Error ? auditsError.message : 'Unknown error'}
        </NoticeBanner>
      ) : null}

      {importMutation.error ? (
        <NoticeBanner title="Import failed" tone="warning">
          {importMutation.error instanceof Error ? importMutation.error.message : 'Unknown error'}
        </NoticeBanner>
      ) : null}

      {exportMutation.error ? (
        <NoticeBanner title="Export failed" tone="warning">
          {exportMutation.error instanceof Error ? exportMutation.error.message : 'Unknown error'}
        </NoticeBanner>
      ) : null}

      {importResult ? (
        <NoticeBanner title="Import completed" tone="success">
          Dry run: {String(importResult.dryRun)}
          {importResult.appliedVersionId ? ` · Applied version: ${importResult.appliedVersionId}` : ''}
          {importResult.errors?.length ? ` · Errors: ${importResult.errors.length}` : ''}
        </NoticeBanner>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <AdminCard title="Import XLSX">
          <div className="space-y-3">
            <input
              type="file"
              accept=".xlsx,.xls"
              className="block w-full text-sm text-[var(--muted)]"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={dryRun} onChange={(event) => setDryRun(event.target.checked)} />
              Dry run (validate only)
            </label>
            <button
              type="button"
              onClick={() => importMutation.mutate()}
              disabled={importMutation.isPending || !file}
              className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] disabled:opacity-50"
            >
              {importMutation.isPending ? 'Importing...' : 'Start import'}
            </button>
          </div>
        </AdminCard>

        <AdminCard title="Export XLSX">
          <div className="space-y-3">
            <select
              value={exportVersionId}
              onChange={(event) => setExportVersionId(event.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            >
              <option value="">Current draft</option>
              {versions.map((version) => (
                <option key={version.id} value={version.id}>
                  {version.versionTag} ({version.status})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => exportMutation.mutate()}
              disabled={exportMutation.isPending}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--text)] disabled:opacity-50"
            >
              {exportMutation.isPending ? 'Exporting...' : 'Download export'}
            </button>
          </div>
        </AdminCard>
      </div>

      <DataTableShell
        title="Audit runs (recent)"
        subtitle="GET /catalog/audit"
        isEmpty={auditRuns.length === 0}
        emptyTitle="No audit runs"
        emptyDescription="Run catalog audits from Tests pages."
      >
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--bg)] text-left text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">Version ID</th>
              <th className="px-4 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {auditRuns.slice(0, 10).map((run) => (
              <tr key={run.id} className="border-t border-[var(--border)]">
                <td className="px-4 py-3 font-mono text-xs">{run.id}</td>
                <td className="px-4 py-3 font-mono text-xs">{run.catalogVersionId ?? '—'}</td>
                <td className="px-4 py-3">{new Date(run.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DataTableShell>
    </div>
  );
}
