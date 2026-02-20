'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTableShell } from '@/components/admin/DataTableShell';
import { NoticeBanner } from '@/components/admin/NoticeBanner';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatusPill } from '@/components/admin/StatusPill';
import { adminRoutes } from '@/lib/admin/routes';
import { parseApiError } from '@/lib/api-errors';
import { client } from '@/lib/sdk/client';
import { adminKeys } from '@/lib/sdk/hooks';
import type { paths } from '@vexel/contracts';

type ListCatalogTestsResponse =
  paths['/catalog/tests']['get']['responses'][200]['content']['application/json'];
type CatalogAuditRun =
  paths['/catalog/audit']['post']['responses'][201]['content']['application/json'];

export default function CatalogTestsPage() {
  const queryClient = useQueryClient();
  const [auditResult, setAuditResult] = useState<CatalogAuditRun | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);

  const { data, error } = useQuery({
    queryKey: adminKeys.catalogTests(),
    queryFn: async () => {
      const { data: res, error: err } = await client.GET('/catalog/tests');
      if (err) throw new Error(parseApiError(err, 'Failed to load catalog tests').message);
      return res as ListCatalogTestsResponse;
    },
  });

  const runAudit = useMutation({
    mutationFn: async () => {
      const { data: res, error: err } = await client.POST('/catalog/audit', {
        body: { version: 'draft' },
      });
      if (err) throw new Error(parseApiError(err, 'Audit failed').message);
      return res as CatalogAuditRun;
    },
    onSuccess: (result) => {
      setAuditResult(result);
      setAuditError(null);
      queryClient.invalidateQueries({ queryKey: adminKeys.catalogAudits() });
    },
    onError: (e) => {
      setAuditError(e instanceof Error ? e.message : 'Audit failed');
      setAuditResult(null);
    },
  });

  const tests = data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tests"
        subtitle="Catalog test definitions (contract: GET /catalog/tests)."
        actions={
          <button
            type="button"
            onClick={() => runAudit.mutate()}
            disabled={runAudit.isPending}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--text)] hover:bg-[var(--bg)] disabled:opacity-50"
          >
            {runAudit.isPending ? 'Running…' : 'Audit catalog'}
          </button>
        }
      />

      {error ? (
        <NoticeBanner title="Unable to load tests" tone="warning">
          {error instanceof Error ? error.message : 'Unknown error'}
        </NoticeBanner>
      ) : null}

      {auditError ? (
        <NoticeBanner title="Audit failed" tone="warning">
          {auditError}
        </NoticeBanner>
      ) : null}

      {auditResult ? (
        <NoticeBanner title="Audit completed" tone="success">
          Run ID: {auditResult.id}. Check findings in summary/findings JSON.
        </NoticeBanner>
      ) : null}

      <DataTableShell
        title="Test Definitions"
        subtitle="GET /catalog/tests"
        isEmpty={tests.length === 0}
        emptyTitle="No tests found"
        emptyDescription="Create tests via Catalog API or import."
      >
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--bg)] text-left text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Section</th>
              <th className="px-4 py-3 font-medium">Layout</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Updated</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tests.map((test) => (
              <tr key={test.id} className="border-t border-[var(--border)]">
                <td className="px-4 py-3 font-medium">{test.testCode}</td>
                <td className="px-4 py-3">{test.testName}</td>
                <td className="px-4 py-3">{test.section ?? '—'}</td>
                <td className="px-4 py-3">{test.layoutKey}</td>
                <td className="px-4 py-3">
                  <StatusPill status={test.status === 'active' ? 'active' : 'inactive'} />
                </td>
                <td className="px-4 py-3">{new Date(test.updatedAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <Link
                    href={adminRoutes.catalogTestDetail(test.id)}
                    className="text-sm font-medium text-[var(--accent)]"
                  >
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </DataTableShell>
    </div>
  );
}
