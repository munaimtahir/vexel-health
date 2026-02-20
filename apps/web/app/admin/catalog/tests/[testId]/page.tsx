'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminCard } from '@/components/admin/AdminCard';
import { DataTableShell } from '@/components/admin/DataTableShell';
import { NoticeBanner } from '@/components/admin/NoticeBanner';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatusPill } from '@/components/admin/StatusPill';
import Link from 'next/link';
import { adminRoutes } from '@/lib/admin/routes';
import { parseApiError } from '@/lib/api-errors';
import { client } from '@/lib/sdk/client';
import { adminKeys } from '@/lib/sdk/hooks';
import type { paths } from '@vexel/contracts';

type CatalogTest =
  paths['/catalog/tests/{testId}']['get']['responses'][200]['content']['application/json'];
type ListMappingResponse =
  paths['/catalog/tests/{testId}/mapping']['get']['responses'][200]['content']['application/json'];
type ListRefRangesResponse =
  paths['/catalog/parameters/{parameterId}/reference-ranges']['get']['responses'][200]['content']['application/json'];
type ListAnnotationsResponse =
  paths['/catalog/annotations']['get']['responses'][200]['content']['application/json'];

const TABS = ['Parameters', 'Reference Ranges', 'Layout', 'Annotations', 'Audit'] as const;

export default function CatalogTestDetailPage() {
  const params = useParams<{ testId: string }>();
  const testId = typeof params.testId === 'string' ? params.testId : '';
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>('Parameters');
  const [selectedParameterId, setSelectedParameterId] = useState<string | null>(null);

  const { data: testData, error: testError } = useQuery({
    queryKey: adminKeys.catalogTest(testId),
    enabled: testId.length > 0,
    queryFn: async () => {
      const { data, error } = await client.GET('/catalog/tests/{testId}', {
        params: { path: { testId } },
      });
      if (error) throw new Error(parseApiError(error, 'Failed to load test').message);
      return data as CatalogTest;
    },
  });

  const { data: mappingData, error: mappingError } = useQuery({
    queryKey: adminKeys.catalogTestMapping(testId),
    enabled: testId.length > 0 && activeTab === 'Parameters',
    queryFn: async () => {
      const { data, error } = await client.GET('/catalog/tests/{testId}/mapping', {
        params: { path: { testId } },
      });
      if (error) throw new Error(parseApiError(error, 'Failed to load mapping').message);
      return data as ListMappingResponse;
    },
  });

  const { data: refRangesData } = useQuery({
    queryKey: [...adminKeys.catalogParameter(selectedParameterId ?? ''), 'reference-ranges'],
    enabled: activeTab === 'Reference Ranges' && selectedParameterId != null,
    queryFn: async () => {
      const { data, error } = await client.GET(
        '/catalog/parameters/{parameterId}/reference-ranges',
        { params: { path: { parameterId: selectedParameterId! } } },
      );
      if (error) throw new Error(parseApiError(error, 'Failed to load reference ranges').message);
      return data as ListRefRangesResponse;
    },
  });

  const { data: annotationsData } = useQuery({
    queryKey: adminKeys.catalogAnnotations(testId, undefined),
    enabled: testId.length > 0 && activeTab === 'Annotations',
    queryFn: async () => {
      const { data, error } = await client.GET('/catalog/annotations', {
        params: { query: { testId } },
      });
      if (error) throw new Error(parseApiError(error, 'Failed to load annotations').message);
      return data as ListAnnotationsResponse;
    },
  });

  const runAudit = useMutation({
    mutationFn: async () => {
      const { data, error } = await client.POST('/catalog/audit', {
        body: { version: 'draft', section: testData?.section ?? undefined },
      });
      if (error) throw new Error(parseApiError(error, 'Audit failed').message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.catalogAudits() });
    },
  });

  const mappings = mappingData?.data ?? [];
  const refRanges = refRangesData?.data ?? [];
  const annotations = annotationsData?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Test Detail"
        subtitle={testData?.testName ?? testId}
        actions={
          <Link
            href={adminRoutes.catalogTests}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--text)]"
          >
            Back to list
          </Link>
        }
      />

      {testError ? (
        <NoticeBanner title="Unable to load test" tone="warning">
          {testError instanceof Error ? testError.message : 'Unknown error'}
        </NoticeBanner>
      ) : null}

      {testData && (
        <AdminCard title="Summary">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Code</p>
              <p className="mt-1 text-sm font-medium">{testData.testCode}</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Name</p>
              <p className="mt-1 text-sm font-medium">{testData.testName}</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Section</p>
              <p className="mt-1 text-sm font-medium">{testData.section ?? '—'}</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Layout / Status</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-sm">{testData.layoutKey}</span>
                <StatusPill status={testData.status === 'active' ? 'active' : 'inactive'} />
              </div>
            </div>
          </div>
        </AdminCard>
      )}

      <AdminCard title="Tabs">
        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-xl border px-3 py-2 text-sm ${
                activeTab === tab
                  ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]'
                  : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text)]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </AdminCard>

      {activeTab === 'Parameters' && (
        <>
          {mappingError ? (
            <NoticeBanner title="Unable to load mapping" tone="warning">
              {mappingError instanceof Error ? mappingError.message : 'Unknown error'}
            </NoticeBanner>
          ) : null}
          <DataTableShell
            title="Parameter mapping"
            subtitle="GET /catalog/tests/{testId}/mapping"
            isEmpty={mappings.length === 0}
            emptyTitle="No parameters mapped"
            emptyDescription="Add parameters via catalog API."
          >
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--bg)] text-left text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">Parameter</th>
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Required</th>
                  <th className="px-4 py-3 font-medium">Visibility</th>
                  <th className="px-4 py-3 font-medium">Print</th>
                </tr>
              </thead>
              <tbody>
                {mappings.map((m) => (
                  <tr key={m.id} className="border-t border-[var(--border)]">
                    <td className="px-4 py-3">{m.displayOrder}</td>
                    <td className="px-4 py-3">
                      {m.parameter?.parameterName ?? m.parameterId}
                    </td>
                    <td className="px-4 py-3">{m.parameter?.parameterCode ?? '—'}</td>
                    <td className="px-4 py-3">{m.required ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3">{m.visibility}</td>
                    <td className="px-4 py-3">{m.printFlag ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTableShell>
        </>
      )}

      {activeTab === 'Reference Ranges' && (
        <>
          <p className="text-sm text-[var(--muted)]">
            Select a parameter to view its reference ranges. Parameters from this test:
          </p>
          <div className="flex flex-wrap gap-2">
            {mappings.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() =>
                  setSelectedParameterId(selectedParameterId === m.parameterId ? null : m.parameterId)
                }
                className={`rounded-xl border px-3 py-2 text-sm ${
                  selectedParameterId === m.parameterId
                    ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]'
                    : 'border-[var(--border)] bg-[var(--surface)]'
                }`}
              >
                {m.parameter?.parameterName ?? m.parameterId}
              </button>
            ))}
          </div>
          {selectedParameterId && (
            <DataTableShell
              title="Reference ranges"
              subtitle={`GET /catalog/parameters/{parameterId}/reference-ranges`}
              isEmpty={refRanges.length === 0}
              emptyTitle="No reference ranges"
            >
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--bg)] text-left text-[var(--muted)]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Sex</th>
                    <th className="px-4 py-3 font-medium">Age (days)</th>
                    <th className="px-4 py-3 font-medium">Low / High</th>
                    <th className="px-4 py-3 font-medium">Ref text</th>
                    <th className="px-4 py-3 font-medium">Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {refRanges.map((r) => (
                    <tr key={r.id} className="border-t border-[var(--border)]">
                      <td className="px-4 py-3">{r.sex}</td>
                      <td className="px-4 py-3">
                        {r.ageMinDays ?? '—'} – {r.ageMaxDays ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        {r.refLow != null || r.refHigh != null
                          ? `${r.refLow ?? '—'} – ${r.refHigh ?? '—'}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3">{r.refText ?? '—'}</td>
                      <td className="px-4 py-3">{r.priority}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DataTableShell>
          )}
        </>
      )}

      {activeTab === 'Layout' && testData && (
        <AdminCard title="Layout">
          <p className="text-sm text-[var(--muted)]">
            This test uses layout key: <strong>{testData.layoutKey}</strong>. Configure layout rules
            in Catalog → Layouts (or via GET /catalog/layouts).
          </p>
        </AdminCard>
      )}

      {activeTab === 'Annotations' && (
        <DataTableShell
          title="Annotations"
          subtitle="GET /catalog/annotations?testId=..."
          isEmpty={annotations.length === 0}
          emptyTitle="No annotations"
        >
          <table className="min-w-full text-sm">
            <thead className="bg-[var(--bg)] text-left text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Placement</th>
                <th className="px-4 py-3 font-medium">Text</th>
                <th className="px-4 py-3 font-medium">Order</th>
              </tr>
            </thead>
            <tbody>
              {annotations.map((a) => (
                <tr key={a.id} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3">{a.annotationType}</td>
                  <td className="px-4 py-3">{a.placement}</td>
                  <td className="max-w-xs truncate px-4 py-3" title={a.text}>
                    {a.text}
                  </td>
                  <td className="px-4 py-3">{a.displayOrder}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>
      )}

      {activeTab === 'Audit' && (
        <AdminCard title="Scoped audit">
          <p className="mb-3 text-sm text-[var(--muted)]">
            Run catalog audit (optional section filter). Findings apply to the whole catalog or
            section.
          </p>
          <button
            type="button"
            onClick={() => runAudit.mutate()}
            disabled={runAudit.isPending}
            className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] disabled:opacity-50"
          >
            {runAudit.isPending ? 'Running…' : 'Run audit'}
          </button>
          {runAudit.isError && (
            <div className="mt-3">
              <NoticeBanner title="Audit failed" tone="warning">
                {runAudit.error instanceof Error ? runAudit.error.message : 'Unknown error'}
              </NoticeBanner>
            </div>
          )}
          {runAudit.data && (
            <p className="mt-3 text-sm text-[var(--muted)]">
              Audit run created: {runAudit.data.id}
            </p>
          )}
        </AdminCard>
      )}
    </div>
  );
}
