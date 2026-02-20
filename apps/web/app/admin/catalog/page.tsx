'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AdminCard } from '@/components/admin/AdminCard';
import { NoticeBanner } from '@/components/admin/NoticeBanner';
import { PageHeader } from '@/components/admin/PageHeader';
import { adminRoutes } from '@/lib/admin/routes';
import { parseApiError } from '@/lib/api-errors';
import { client } from '@/lib/sdk/client';
import { adminKeys } from '@/lib/sdk/hooks';
import type { paths } from '@vexel/contracts';

type AdminOverviewResponse =
  paths['/admin/overview']['get']['responses'][200]['content']['application/json'];
type LabTestsResponse = paths['/lab/tests']['get']['responses'][200]['content']['application/json'];
type ListCatalogTestsResponse =
  paths['/catalog/tests']['get']['responses'][200]['content']['application/json'];

export default function CatalogOverviewPage() {
  const { data: overview, error: overviewError } = useQuery({
    queryKey: adminKeys.overview(),
    queryFn: async () => {
      const { data, error } = await client.GET('/admin/overview');
      if (error) throw new Error(parseApiError(error, 'Failed to load admin overview').message);
      return data as AdminOverviewResponse;
    },
  });

  const { data: testsResponse, error: testsError } = useQuery({
    queryKey: adminKeys.tests(),
    queryFn: async () => {
      const { data, error } = await client.GET('/lab/tests');
      if (error) throw new Error(parseApiError(error, 'Failed to load lab tests').message);
      return data as LabTestsResponse;
    },
  });

  const { data: catalogTestsResponse } = useQuery({
    queryKey: adminKeys.catalogTests(),
    queryFn: async () => {
      const { data, error } = await client.GET('/catalog/tests');
      if (error) return null;
      return data as ListCatalogTestsResponse;
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Catalog Overview"
        subtitle="Tests, parameters, panels, and linking workflow scaffolding."
      />

      {overviewError ? (
        <NoticeBanner title="Unable to load catalog overview" tone="warning">
          {overviewError instanceof Error ? overviewError.message : 'Unknown error'}
        </NoticeBanner>
      ) : null}

      {testsError ? (
        <NoticeBanner title="Unable to load tests" tone="warning">
          {testsError instanceof Error ? testsError.message : 'Unknown error'}
        </NoticeBanner>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminCard title="Tests">
          <p className="text-3xl font-semibold">{testsResponse?.total ?? 0}</p>
          <p className="text-sm text-[var(--muted)]">Legacy: GET /lab/tests</p>
          {catalogTestsResponse != null && (
            <p className="mt-1 text-sm text-[var(--muted)]">
              Catalog: {catalogTestsResponse.total ?? 0} (GET /catalog/tests)
            </p>
          )}
        </AdminCard>
        <AdminCard title="Parameters">
          <p className="text-3xl font-semibold">{overview?.catalog?.parameters_count ?? 0}</p>
          <p className="text-sm text-[var(--muted)]">Reported by admin overview</p>
        </AdminCard>
        <AdminCard title="Panels">
          <p className="text-3xl font-semibold">—</p>
          <p className="text-sm text-[var(--muted)]">Endpoint missing in current contract</p>
        </AdminCard>
        <AdminCard title="Linking Workflow">
          <p className="text-3xl font-semibold">Scaffold</p>
          <p className="text-sm text-[var(--muted)]">No linking API exposed yet</p>
        </AdminCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <AdminCard title="Catalog Areas">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[
              { href: adminRoutes.catalogTests, label: 'Tests' },
              { href: adminRoutes.catalogParameters, label: 'Parameters' },
              { href: adminRoutes.catalogPanels, label: 'Panels' },
              { href: adminRoutes.catalogLinking, label: 'Linking' },
              { href: adminRoutes.catalogImportExport, label: 'Import / Export' },
              { href: adminRoutes.catalogVersions, label: 'Versions' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm font-medium text-[var(--text)]"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </AdminCard>

        <NoticeBanner title="Catalog API" tone="success">
          Catalog endpoints (GET/POST /catalog/tests, parameters, mapping, layouts, annotations, import, export, audit, versions) are in OpenAPI and implemented.
        </NoticeBanner>
      </div>
    </div>
  );
}
