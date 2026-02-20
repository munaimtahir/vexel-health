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

type CatalogParameterResponse =
  paths['/catalog/parameters/{parameterId}']['get']['responses'][200]['content']['application/json'];
type CatalogReferenceRangesResponse =
  paths['/catalog/parameters/{parameterId}/reference-ranges']['get']['responses'][200]['content']['application/json'];
type CatalogAnnotationsResponse =
  paths['/catalog/annotations']['get']['responses'][200]['content']['application/json'];

export default function ParameterDetailPage() {
  const params = useParams<{ parameterId: string }>();
  const parameterId = typeof params.parameterId === 'string' ? params.parameterId : '';

  const { data: parameterData, error } = useQuery({
    queryKey: adminKeys.catalogParameter(parameterId),
    enabled: parameterId.length > 0,
    queryFn: async () => {
      const { data, error } = await client.GET('/catalog/parameters/{parameterId}', {
        params: {
          path: {
            parameterId,
          },
        },
      });
      if (error) throw new Error(parseApiError(error, 'Failed to load parameter detail').message);
      return data as CatalogParameterResponse;
    },
  });

  const { data: rangesData, error: rangesError } = useQuery({
    queryKey: [...adminKeys.catalogParameter(parameterId), 'reference-ranges'],
    enabled: parameterId.length > 0,
    queryFn: async () => {
      const { data, error } = await client.GET('/catalog/parameters/{parameterId}/reference-ranges', {
        params: {
          path: {
            parameterId,
          },
        },
      });
      if (error) throw new Error(parseApiError(error, 'Failed to load reference ranges').message);
      return data as CatalogReferenceRangesResponse;
    },
  });

  const { data: annotationsData, error: annotationsError } = useQuery({
    queryKey: adminKeys.catalogAnnotations(undefined, parameterId),
    enabled: parameterId.length > 0,
    queryFn: async () => {
      const { data, error } = await client.GET('/catalog/annotations', {
        params: {
          query: {
            parameterId,
          },
        },
      });
      if (error) throw new Error(parseApiError(error, 'Failed to load parameter annotations').message);
      return data as CatalogAnnotationsResponse;
    },
  });

  const ranges = rangesData?.data ?? [];
  const annotations = annotationsData?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parameter Detail"
        subtitle="Global catalog parameter definition and reference configuration."
        actions={
          <Link
            href={adminRoutes.catalogParameters}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium"
          >
            Back to Parameters
          </Link>
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

      {annotationsError ? (
        <NoticeBanner title="Unable to load parameter annotations" tone="warning">
          {annotationsError instanceof Error ? annotationsError.message : 'Unknown error'}
        </NoticeBanner>
      ) : null}

      <AdminCard title="Summary">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">ID</p>
            <p className="mt-1 text-sm font-medium">{parameterData?.id ?? parameterId}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Code</p>
            <p className="mt-1 text-sm font-medium">{parameterData?.parameterCode ?? '—'}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Name</p>
            <p className="mt-1 text-sm font-medium">{parameterData?.parameterName ?? '—'}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Status</p>
            <div className="mt-1">
              <StatusPill status={parameterData?.status === 'active' ? 'active' : 'inactive'} />
            </div>
          </div>
        </div>
      </AdminCard>

      <AdminCard title="Definition">
        <dl className="space-y-2 text-sm">
          <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] py-2">
            <dt className="text-[var(--muted)]">Result Type</dt>
            <dd className="font-medium">{parameterData?.resultType ?? '—'}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] py-2">
            <dt className="text-[var(--muted)]">Precision</dt>
            <dd className="font-medium">{parameterData?.precision ?? '—'}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] py-2">
            <dt className="text-[var(--muted)]">Default Value</dt>
            <dd className="font-medium">{parameterData?.defaultValue ?? '—'}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] py-2">
            <dt className="text-[var(--muted)]">Enum Options</dt>
            <dd className="font-medium">{parameterData?.enumOptions?.join(', ') ?? '—'}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-2">
            <dt className="text-[var(--muted)]">Formula Spec</dt>
            <dd className="font-medium">{parameterData?.formulaSpec ?? '—'}</dd>
          </div>
        </dl>
      </AdminCard>

      <AdminCard title="Reference Ranges">
        {ranges.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No explicit reference ranges found for this parameter.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--bg)] text-left text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Sex</th>
                  <th className="px-4 py-3 font-medium">Age (days)</th>
                  <th className="px-4 py-3 font-medium">Range</th>
                  <th className="px-4 py-3 font-medium">Ref text</th>
                </tr>
              </thead>
              <tbody>
                {ranges.map((range) => (
                  <tr key={range.id} className="border-t border-[var(--border)]">
                    <td className="px-4 py-3">{range.sex}</td>
                    <td className="px-4 py-3">
                      {range.ageMinDays ?? '—'} - {range.ageMaxDays ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      {range.refLow != null || range.refHigh != null
                        ? `${range.refLow ?? '—'} to ${range.refHigh ?? '—'}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3">{range.refText ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>

      <AdminCard title="Annotations">
        {annotations.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No annotations linked to this parameter.</p>
        ) : (
          <div className="space-y-2">
            {annotations.map((annotation) => (
              <div key={annotation.id} className="rounded-lg border border-[var(--border)] p-3">
                <p className="text-xs text-[var(--muted)]">
                  {annotation.annotationType} · {annotation.placement}
                </p>
                <p className="mt-1 text-sm">{annotation.text}</p>
              </div>
            ))}
          </div>
        )}
      </AdminCard>
    </div>
  );
}
