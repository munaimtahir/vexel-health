'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { client } from '@/lib/api';
import { parseApiError } from '@/lib/api-errors';
import type { paths } from '@vexel/contracts';

type AdminOverviewResponse =
  paths['/admin/overview']['get']['responses'][200]['content']['application/json'];

export default function AdminPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: async () => {
      const { data: res, error: apiError } = await client.GET('/admin/overview');
      if (apiError) {
        throw new Error(
          parseApiError(apiError, 'Failed to load admin overview').message,
        );
      }
      return res;
    },
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Admin Overview</h1>
        <p>Loading...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Admin Overview</h1>
        <p className="text-red-600">
          {error instanceof Error ? error.message : 'Failed to load overview'}
        </p>
      </div>
    );
  }

  const overview = data as AdminOverviewResponse;
  const counts = overview?.counts ?? {};
  const byStatus = counts.encounters_by_status ?? {};
  const system = overview?.system ?? {};
  const pdfHealth = system.pdf_service_health;
  const catalog = overview?.catalog ?? {};
  const features = overview?.features ?? {};

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Admin Overview</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="rounded border bg-white p-4 shadow">
          <h2 className="text-lg font-semibold mb-2">Encounters by status</h2>
          <ul className="text-sm space-y-1">
            {Object.entries(byStatus).map(([status, count]) => (
              <li key={status}>
                {status}: {count}
              </li>
            ))}
            {Object.keys(byStatus).length === 0 && (
              <li className="text-gray-500">No data</li>
            )}
          </ul>
        </div>
        <div className="rounded border bg-white p-4 shadow">
          <h2 className="text-lg font-semibold mb-2">Queue &amp; published</h2>
          <p className="text-sm">
            Verification queue: <strong>{counts.verification_queue_count ?? 0}</strong>
          </p>
          <p className="text-sm">
            Published last 24h: <strong>{counts.published_last_24h_count ?? 0}</strong>
          </p>
        </div>
        <div className="rounded border bg-white p-4 shadow">
          <h2 className="text-lg font-semibold mb-2">PDF service</h2>
          <p className="text-sm">
            Status: <strong>{pdfHealth?.status ?? '—'}</strong>
          </p>
          <p className="text-sm text-gray-600">
            Last checked: {pdfHealth?.last_checked_at ? new Date(pdfHealth.last_checked_at).toLocaleString() : '—'}
          </p>
        </div>
        <div className="rounded border bg-white p-4 shadow">
          <h2 className="text-lg font-semibold mb-2">Catalog</h2>
          <p className="text-sm">Tests: {catalog.tests_count ?? 0}</p>
          <p className="text-sm">Parameters: {catalog.parameters_count ?? 0}</p>
        </div>
        <div className="rounded border bg-white p-4 shadow md:col-span-2">
          <h2 className="text-lg font-semibold mb-2">Feature flags (read-only)</h2>
          <ul className="text-sm flex flex-wrap gap-x-4 gap-y-1">
            {Object.entries(features).map(([key, value]) => (
              <li key={key}>
                {key}: <strong>{value ? 'on' : 'off'}</strong>
              </li>
            ))}
            {Object.keys(features).length === 0 && (
              <li className="text-gray-500">None</li>
            )}
          </ul>
        </div>
      </div>
      <Link href="/patients" className="text-blue-600 hover:underline">
        Back to patients
      </Link>
    </div>
  );
}
