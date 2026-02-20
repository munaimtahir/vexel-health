'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AdminCard } from '@/components/admin/AdminCard';
import { Divider } from '@/components/admin/Divider';
import { FieldRow } from '@/components/admin/FieldRow';
import { NoticeBanner } from '@/components/admin/NoticeBanner';
import { PageHeader } from '@/components/admin/PageHeader';
import { adminRoutes } from '@/lib/admin/routes';
import { parseApiError } from '@/lib/api-errors';
import { client } from '@/lib/sdk/client';
import { adminKeys } from '@/lib/sdk/hooks';
import type { paths } from '@vexel/contracts';

type MeResponse = paths['/me']['get']['responses'][200]['content']['application/json'];
type FeaturesResponse = paths['/me/features']['get']['responses'][200]['content']['application/json'];
type BrandingResponse = paths['/admin/business/branding']['get']['responses'][200]['content']['application/json'];
type ReportDesignResponse =
  paths['/admin/business/report-design']['get']['responses'][200]['content']['application/json'];
type ReceiptDesignResponse =
  paths['/admin/business/receipt-design']['get']['responses'][200]['content']['application/json'];

function toTimestampLabel(value?: string): string {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

export default function BusinessOverviewPage() {
  const { data: meData, error: meError } = useQuery({
    queryKey: adminKeys.me(),
    queryFn: async () => {
      const { data, error } = await client.GET('/me');
      if (error) throw new Error(parseApiError(error, 'Failed to load profile').message);
      return data as MeResponse;
    },
  });

  const { data: featuresData, error: featuresError } = useQuery({
    queryKey: adminKeys.features(),
    queryFn: async () => {
      const { data, error } = await client.GET('/me/features');
      if (error) throw new Error(parseApiError(error, 'Failed to load features').message);
      return data as FeaturesResponse;
    },
  });

  const { data: brandingData, error: brandingError } = useQuery({
    queryKey: adminKeys.branding(),
    queryFn: async () => {
      const { data, error } = await client.GET('/admin/business/branding');
      if (error) throw new Error(parseApiError(error, 'Failed to load branding config').message);
      return data as BrandingResponse;
    },
  });

  const { data: reportDesignData, error: reportDesignError } = useQuery({
    queryKey: adminKeys.reportDesign(),
    queryFn: async () => {
      const { data, error } = await client.GET('/admin/business/report-design');
      if (error) throw new Error(parseApiError(error, 'Failed to load report design config').message);
      return data as ReportDesignResponse;
    },
  });

  const { data: receiptDesignData, error: receiptDesignError } = useQuery({
    queryKey: adminKeys.receiptDesign(),
    queryFn: async () => {
      const { data, error } = await client.GET('/admin/business/receipt-design');
      if (error) throw new Error(parseApiError(error, 'Failed to load receipt design config').message);
      return data as ReceiptDesignResponse;
    },
  });

  const featureEntries = Object.entries(featuresData ?? {});

  return (
    <div className="space-y-6">
      <PageHeader
        title="Business Overview"
        subtitle="Tenant-scoped profile and document-design configuration status."
        actions={
          <>
            <Link
              href={adminRoutes.businessBranding}
              className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)]"
            >
              Branding
            </Link>
            <Link
              href={adminRoutes.businessReportDesign}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--text)]"
            >
              Report Design
            </Link>
            <Link
              href={adminRoutes.businessReceiptDesign}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--text)]"
            >
              Receipt Design
            </Link>
          </>
        }
      />

      {meError ? (
        <NoticeBanner title="Failed to load tenant profile" tone="warning">
          {meError instanceof Error ? meError.message : 'Unknown error'}
        </NoticeBanner>
      ) : null}

      {featuresError ? (
        <NoticeBanner title="Failed to load feature flags" tone="warning">
          {featuresError instanceof Error ? featuresError.message : 'Unknown error'}
        </NoticeBanner>
      ) : null}

      {brandingError ? (
        <NoticeBanner title="Failed to load branding config" tone="warning">
          {brandingError instanceof Error ? brandingError.message : 'Unknown error'}
        </NoticeBanner>
      ) : null}

      {reportDesignError ? (
        <NoticeBanner title="Failed to load report design config" tone="warning">
          {reportDesignError instanceof Error ? reportDesignError.message : 'Unknown error'}
        </NoticeBanner>
      ) : null}

      {receiptDesignError ? (
        <NoticeBanner title="Failed to load receipt design config" tone="warning">
          {receiptDesignError instanceof Error ? receiptDesignError.message : 'Unknown error'}
        </NoticeBanner>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <AdminCard title="Tenant Profile" subtitle="Derived from authenticated session context.">
          <dl>
            <FieldRow label="Tenant ID" value={meData?.tenantId ?? 'Not available'} />
            <Divider />
            <FieldRow label="User Name" value={meData?.name ?? 'Not available'} />
            <Divider />
            <FieldRow label="User Email" value={meData?.email ?? 'Not available'} />
          </dl>
        </AdminCard>

        <AdminCard title="Branding Summary" subtitle="GET /admin/business/branding">
          <dl>
            <FieldRow label="Business Name" value={brandingData?.businessName || '—'} />
            <FieldRow label="Phone" value={brandingData?.phone || '—'} />
            <FieldRow label="Header 1" value={brandingData?.headerLine1 || '—'} />
            <FieldRow
              label="Last Updated"
              value={`${toTimestampLabel(brandingData?.updatedAt)}${brandingData?.updatedBy ? ` by ${brandingData.updatedBy}` : ''}`}
            />
          </dl>
        </AdminCard>

        <AdminCard title="Report Design Snapshot" subtitle="GET /admin/business/report-design">
          <dl>
            <FieldRow label="Logo" value={reportDesignData?.showLogo ? 'Enabled' : 'Disabled'} />
            <FieldRow label="Layout" value={reportDesignData?.patientLayoutStyle ?? '—'} />
            <FieldRow label="Results Font" value={reportDesignData?.resultsFontSize ?? '—'} />
            <FieldRow
              label="Last Updated"
              value={`${toTimestampLabel(reportDesignData?.updatedAt)}${reportDesignData?.updatedBy ? ` by ${reportDesignData.updatedBy}` : ''}`}
            />
          </dl>
        </AdminCard>

        <AdminCard title="Receipt Design Snapshot" subtitle="GET /admin/business/receipt-design">
          <dl>
            <FieldRow label="Logo" value={receiptDesignData?.showLogo ? 'Enabled' : 'Disabled'} />
            <FieldRow label="Width Mode" value={receiptDesignData?.receiptWidthMode ?? '—'} />
            <FieldRow label="Grand Total Style" value={receiptDesignData?.grandTotalStyle ?? '—'} />
            <FieldRow
              label="Last Updated"
              value={`${toTimestampLabel(receiptDesignData?.updatedAt)}${receiptDesignData?.updatedBy ? ` by ${receiptDesignData.updatedBy}` : ''}`}
            />
          </dl>
        </AdminCard>
      </div>

      <AdminCard title="Feature Visibility" subtitle="Backend-authoritative feature flags for current tenant.">
        <div className="flex flex-wrap gap-2">
          {featureEntries.length > 0 ? (
            featureEntries.map(([key, enabled]) => (
              <span
                key={key}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
              >
                <strong>{key}</strong>: {enabled ? 'Enabled' : 'Disabled'}
              </span>
            ))
          ) : (
            <p className="text-sm text-[var(--muted)]">No feature payload returned.</p>
          )}
        </div>
      </AdminCard>
    </div>
  );
}
