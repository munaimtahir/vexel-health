'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminCard } from '@/components/admin/AdminCard';
import { DataTableShell } from '@/components/admin/DataTableShell';
import { NoticeBanner } from '@/components/admin/NoticeBanner';
import { PageHeader } from '@/components/admin/PageHeader';
import { client } from '@/lib/sdk/client';
import { adminKeys } from '@/lib/sdk/hooks';
// Response types for catalog import/audit (match OpenAPI CatalogImportResponse, ListCatalogAuditsResponse)
type CatalogImportResponse = {
  dryRun: boolean;
  diffReport?: object | null;
  appliedVersionId?: string | null;
  errors?: Array<{ sheet?: string; row?: number; message?: string }> | null;
};
type CatalogAuditRun = {
  id: string;
  tenantId: string;
  catalogVersionId?: string | null;
  createdBy?: string | null;
  createdAt: string;
  summaryJson?: object | null;
  findingsJson?: object | null;
  sha256?: string | null;
};
type ListCatalogAuditsResponse = { data: CatalogAuditRun[]; total: number };

export default function CatalogImportExportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [importResult, setImportResult] = useState<CatalogImportResponse | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportVersionId, setExportVersionId] = useState('');

  const { data: versionsData } = useQuery({
    queryKey: adminKeys.catalogVersions('published'),
    queryFn: async () => {
      const { data, error } = await client.GET('/catalog/versions', {
        params: { query: { status: 'published' } },
      });
      if (error) throw new Error('Failed to load versions');
      return data;
    },
  });

  const { data: auditsData } = useQuery({
    queryKey: adminKeys.catalogAudits(),
    queryFn: async () => {
      const { data, error } = await client.GET('/catalog/audit');
      if (error) throw new Error('Failed to load audit runs');
      return data as ListCatalogAuditsResponse;
    },
  });

  const handleImport = async () => {
    if (!file) {
      setImportError('Select a file first');
      return;
    }
    setImporting(true);
    setImportError(null);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('dryRun', String(dryRun));
      const token = typeof window !== 'undefined' ? localStorage.getItem('vexel_token') : null;
      const tenant =
        typeof window !== 'undefined' ? localStorage.getItem('vexel_tenant_id') : null;
      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL?.startsWith('/')
          ? typeof window !== 'undefined'
            ? ''
            : process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'
          : process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
      const url = baseUrl ? `${baseUrl}/catalog/import` : '/api/catalog/import';
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
          ...(process.env.NEXT_PUBLIC_TENANCY_DEV_HEADER_ENABLED === '1' &&
            tenant && { 'x-tenant-id': tenant }),
        },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message ?? res.statusText ?? 'Import failed');
      }
      const data = (await res.json()) as CatalogImportResponse;
      setImportResult(data);
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setImportError(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('vexel_token') : null;
      const tenant =
        typeof window !== 'undefined' ? localStorage.getItem('vexel_tenant_id') : null;
      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL?.startsWith('/')
          ? typeof window !== 'undefined'
            ? ''
            : process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'
          : process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
      const url = baseUrl ? `${baseUrl}/catalog/export` : '/api/catalog/export';
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          ...(process.env.NEXT_PUBLIC_TENANCY_DEV_HEADER_ENABLED === '1' &&
            tenant && { 'x-tenant-id': tenant }),
        },
        body: exportVersionId ? JSON.stringify({ versionId: exportVersionId }) : '{}',
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = `catalog-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      setImportError('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const auditRuns = auditsData?.data ?? [];
  const versions = versionsData?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import / Export"
        subtitle="XLSX catalog import (dry run or apply) and export. Contract: POST /catalog/import, POST /catalog/export."
      />

      {importError ? (
        <NoticeBanner title="Error" tone="warning">
          {importError}
        </NoticeBanner>
      ) : null}

      {importResult && (
        <NoticeBanner title="Import result" tone="success">
          Dry run: {String(importResult.dryRun)}.{' '}
          {importResult.appliedVersionId
            ? `Applied version: ${importResult.appliedVersionId}`
            : ''}
          {importResult.errors?.length
            ? ` Errors: ${importResult.errors.length}`
            : ''}
        </NoticeBanner>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <AdminCard title="Import XLSX">
          <div className="space-y-3">
            <input
              type="file"
              accept=".xlsx,.xls"
              className="block w-full text-sm text-[var(--muted)]"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
              />
              Dry run (validate only, do not apply)
            </label>
            <button
              type="button"
              onClick={handleImport}
              disabled={importing || !file}
              className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] disabled:opacity-50"
            >
              {importing ? 'Importing…' : 'Start import'}
            </button>
          </div>
        </AdminCard>

        <AdminCard title="Export XLSX">
          <div className="space-y-3">
            <select
              value={exportVersionId}
              onChange={(e) => setExportVersionId(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            >
              <option value="">Current draft</option>
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.versionTag} ({v.status})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--text)] disabled:opacity-50"
            >
              {exporting ? 'Exporting…' : 'Download export'}
            </button>
          </div>
        </AdminCard>
      </div>

      <DataTableShell
        title="Audit runs (recent)"
        subtitle="GET /catalog/audit"
        isEmpty={auditRuns.length === 0}
        emptyTitle="No audit runs"
        emptyDescription="Run an audit from Tests page or Test detail."
      >
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--bg)] text-left text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {auditRuns.slice(0, 10).map((r) => (
              <tr key={r.id} className="border-t border-[var(--border)]">
                <td className="px-4 py-3 font-mono text-xs">{r.id}</td>
                <td className="px-4 py-3">{new Date(r.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DataTableShell>
    </div>
  );
}
