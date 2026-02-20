'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { AdminCard } from '@/components/admin/AdminCard';
import { NoticeBanner } from '@/components/admin/NoticeBanner';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatusPill } from '@/components/admin/StatusPill';
import { adminRoutes } from '@/lib/admin/routes';
import { parseApiError } from '@/lib/api-errors';
import { client } from '@/lib/sdk/client';
import { adminKeys } from '@/lib/sdk/hooks';
import type { paths } from '@vexel/contracts';

type ParameterResponse = paths['/lab/parameters/{parameterId}']['get']['responses'][200]['content']['application/json'];
type ReferenceRangesResponse =
  paths['/lab/tests/{testId}/reference-ranges']['get']['responses'][200]['content']['application/json'];

export default function ParameterDetailPage() {
  const params = useParams<{ parameterId: string }>();
  const parameterId = typeof params.parameterId === 'string' ? params.parameterId : '';

  const { data: parameterData, error } = useQuery({
    queryKey: adminKeys.parameter(parameterId),
    enabled: parameterId.length > 0,
    queryFn: async () => {
      const { data, error } = await client.GET('/lab/parameters/{parameterId}', {
        params: {
          path: {
            parameterId,
          },
        },
      });
      if (error) throw new Error(parseApiError(error, 'Failed to load parameter detail').message);
      return data as ParameterResponse;
    },
  });

  const { data: rangesData, error: rangesError } = useQuery({
    queryKey: adminKeys.referenceRanges(parameterData?.testId ?? ''),
    enabled: Boolean(parameterData?.testId),
    queryFn: async () => {
      const { data, error } = await client.GET('/lab/tests/{testId}/reference-ranges', {
        params: {
          path: {
            testId: parameterData?.testId ?? '',
          },
        },
      });
      if (error) throw new Error(parseApiError(error, 'Failed to load reference ranges').message);
      return data as ReferenceRangesResponse;
    },
  });

  const filteredRanges = (rangesData?.data ?? []).filter((range) => range.parameterId === parameterData?.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parameter Detail"
        subtitle="Tenant-scoped parameter definition, units, data type, and reference defaults."
        actions={
          parameterData?.testId ? (
            <Link
              href={adminRoutes.catalogTestDetail(parameterData.testId)}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium"
            >
              Open Test
            </Link>
          ) : null
        }
      />

      {error ? (
        <NoticeBanner title="Unable to load parameter detail" tone="warning">
          {error instanceof Error ? error.message : 'Unknown error'}
        </NoticeBanner>
      ) : null}

      {rangesError ? (
        <NoticeBanner title="Unable to load parameter reference ranges" tone="warning">
          {rangesError instanceof Error ? rangesError.message : 'Unknown error'}
        </NoticeBanner>
      ) : null}

      <AdminCard title="Summary">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">ID</p>
            <p className="mt-1 text-sm font-medium">{(parameterData?.id ?? parameterId) || '—'}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Name</p>
            <p className="mt-1 text-sm font-medium">{parameterData?.name ?? '—'}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Unit</p>
            <p className="mt-1 text-sm font-medium">{parameterData?.unit ?? '—'}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Status</p>
            <div className="mt-1">
              <StatusPill status={parameterData?.active ? 'active' : 'inactive'} />
            </div>
          </div>
        </div>
      </AdminCard>

      <AdminCard title="Definition">
        <dl className="space-y-2 text-sm">
          <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] py-2">
            <dt className="text-[var(--muted)]">Test</dt>
            <dd className="font-medium">
              {parameterData?.testCode ?? '—'} {parameterData?.testName ? `· ${parameterData.testName}` : ''}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] py-2">
            <dt className="text-[var(--muted)]">Data Type</dt>
            <dd className="font-medium">{parameterData?.dataType ?? '—'}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] py-2">
            <dt className="text-[var(--muted)]">Display Order</dt>
            <dd className="font-medium">{parameterData?.displayOrder ?? '—'}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-2">
            <dt className="text-[var(--muted)]">Reference Defaults</dt>
            <dd className="font-medium">
              {parameterData?.referenceDefaults?.text ??
                (parameterData?.referenceDefaults?.low != null || parameterData?.referenceDefaults?.high != null
                  ? `${parameterData.referenceDefaults.low ?? '—'} to ${parameterData.referenceDefaults.high ?? '—'}`
                  : '—')}
            </dd>
          </div>
        </dl>
      </AdminCard>

      <AdminCard title="Reference Ranges">
        {(filteredRanges ?? []).length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No explicit reference ranges found for this parameter.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--bg)] text-left text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Sex</th>
                  <th className="px-4 py-3 font-medium">Age (days)</th>
                  <th className="px-4 py-3 font-medium">Range</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {filteredRanges.map((range) => (
                  <tr key={range.id} className="border-t border-[var(--border)]">
                    <td className="px-4 py-3">{range.sex ?? 'ALL'}</td>
                    <td className="px-4 py-3">
                      {range.ageMinDays != null || range.ageMaxDays != null
                        ? `${range.ageMinDays ?? '0'} - ${range.ageMaxDays ?? '∞'}`
                        : 'All ages'}
                    </td>
                    <td className="px-4 py-3">
                      {range.textRange ??
                        (range.low != null || range.high != null ? `${range.low ?? '—'} to ${range.high ?? '—'}` : '—')}
                    </td>
                    <td className="px-4 py-3">{range.updatedAt ? new Date(range.updatedAt).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
    </div>
  );
}
