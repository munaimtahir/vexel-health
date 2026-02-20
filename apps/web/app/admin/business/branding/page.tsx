'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminCard } from '@/components/admin/AdminCard';
import { FieldRow } from '@/components/admin/FieldRow';
import { NoticeBanner } from '@/components/admin/NoticeBanner';
import { PageHeader } from '@/components/admin/PageHeader';
import { SectionTitle } from '@/components/admin/SectionTitle';
import { adminRoutes } from '@/lib/admin/routes';
import { parseApiError, type FieldErrors } from '@/lib/api-errors';
import { client } from '@/lib/sdk/client';
import { adminKeys } from '@/lib/sdk/hooks';
import type { paths } from '@vexel/contracts';

type BrandingResponse = paths['/admin/business/branding']['get']['responses'][200]['content']['application/json'];
type UpdateBrandingRequest = paths['/admin/business/branding']['put']['requestBody']['content']['application/json'];

const initialDraft: UpdateBrandingRequest = {
  businessName: '',
  address: '',
  phone: '',
  headerLine1: '',
  headerLine2: '',
};

function toTimestampLabel(value?: string): string {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

export default function BrandingPage() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<UpdateBrandingRequest>(initialDraft);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const { data, isLoading, error } = useQuery({
    queryKey: adminKeys.branding(),
    queryFn: async () => {
      const { data, error } = await client.GET('/admin/business/branding');
      if (error) throw new Error(parseApiError(error, 'Failed to load branding config').message);
      return data as BrandingResponse;
    },
  });

  useEffect(() => {
    if (!data) return;
    setDraft({
      businessName: data.businessName,
      address: data.address,
      phone: data.phone,
      headerLine1: data.headerLine1,
      headerLine2: data.headerLine2,
      ...(data.logoAssetName ? { logoAssetName: data.logoAssetName } : {}),
      ...(data.headerAssetName ? { headerAssetName: data.headerAssetName } : {}),
      ...(data.footerAssetName ? { footerAssetName: data.footerAssetName } : {}),
    });
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body: UpdateBrandingRequest = {
        businessName: draft.businessName.trim(),
        address: draft.address.trim(),
        phone: draft.phone.trim(),
        headerLine1: draft.headerLine1.trim(),
        headerLine2: draft.headerLine2.trim(),
        ...(draft.logoAssetName?.trim() ? { logoAssetName: draft.logoAssetName.trim() } : {}),
        ...(draft.headerAssetName?.trim() ? { headerAssetName: draft.headerAssetName.trim() } : {}),
        ...(draft.footerAssetName?.trim() ? { footerAssetName: draft.footerAssetName.trim() } : {}),
      };

      const { data, error } = await client.PUT('/admin/business/branding', {
        body,
      });

      if (error) {
        const parsed = parseApiError(error, 'Failed to save branding config');
        setFieldErrors(parsed.fieldErrors);
        throw new Error(parsed.message);
      }

      return data as BrandingResponse;
    },
    onSuccess: async (updated) => {
      setFieldErrors({});
      setSavedAt(updated.updatedAt);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.branding() }),
        queryClient.invalidateQueries({ queryKey: adminKeys.overview() }),
      ]);
    },
  });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavedAt(null);
    setFieldErrors({});
    saveMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branding"
        subtitle="Manage tenant-scoped branding fields used by deterministic document generation."
        actions={
          <>
            <Link
              href={adminRoutes.businessReportDesign}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium text-[var(--text)] hover:bg-[var(--bg)]"
            >
              Report Design
            </Link>
            <Link
              href={adminRoutes.businessReceiptDesign}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium text-[var(--text)] hover:bg-[var(--bg)]"
            >
              Receipt Design
            </Link>
          </>
        }
      />

      {error ? (
        <NoticeBanner title="Unable to load branding config" tone="warning">
          {error instanceof Error ? error.message : 'Unknown error'}
        </NoticeBanner>
      ) : null}

      {saveMutation.error ? (
        <NoticeBanner title="Unable to save branding config" tone="warning">
          {saveMutation.error instanceof Error ? saveMutation.error.message : 'Unknown error'}
        </NoticeBanner>
      ) : null}

      {savedAt ? (
        <NoticeBanner title="Branding config saved" tone="success">
          Saved at {new Date(savedAt).toLocaleString()}.
        </NoticeBanner>
      ) : null}

      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <AdminCard title="Identity Fields" className="xl:col-span-2">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-sm font-medium text-[var(--muted)]">Lab / Business Name</span>
              <input
                value={draft.businessName}
                onChange={(event) => setDraft((prev) => ({ ...prev, businessName: event.target.value }))}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                placeholder="Example Diagnostic Labs"
                required
              />
              {(fieldErrors.businessName ?? []).map((message) => (
                <p key={message} className="text-xs text-rose-600">
                  {message}
                </p>
              ))}
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-[var(--muted)]">Phone</span>
              <input
                value={draft.phone}
                onChange={(event) => setDraft((prev) => ({ ...prev, phone: event.target.value }))}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                placeholder="+1 555 000 000"
                required
              />
              {(fieldErrors.phone ?? []).map((message) => (
                <p key={message} className="text-xs text-rose-600">
                  {message}
                </p>
              ))}
            </label>

            <label className="space-y-1 md:col-span-2">
              <span className="text-sm font-medium text-[var(--muted)]">Address</span>
              <textarea
                value={draft.address}
                onChange={(event) => setDraft((prev) => ({ ...prev, address: event.target.value }))}
                className="min-h-24 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                placeholder="Clinic / lab address"
                required
              />
              {(fieldErrors.address ?? []).map((message) => (
                <p key={message} className="text-xs text-rose-600">
                  {message}
                </p>
              ))}
            </label>

            <label className="space-y-1 md:col-span-2">
              <span className="text-sm font-medium text-[var(--muted)]">Report Header Line 1</span>
              <input
                value={draft.headerLine1}
                onChange={(event) => setDraft((prev) => ({ ...prev, headerLine1: event.target.value }))}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                placeholder="Trusted Clinical Diagnostics"
                required
              />
              {(fieldErrors.headerLine1 ?? []).map((message) => (
                <p key={message} className="text-xs text-rose-600">
                  {message}
                </p>
              ))}
            </label>

            <label className="space-y-1 md:col-span-2">
              <span className="text-sm font-medium text-[var(--muted)]">Report Header Line 2</span>
              <input
                value={draft.headerLine2}
                onChange={(event) => setDraft((prev) => ({ ...prev, headerLine2: event.target.value }))}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                placeholder="ISO compliant laboratory"
                required
              />
              {(fieldErrors.headerLine2 ?? []).map((message) => (
                <p key={message} className="text-xs text-rose-600">
                  {message}
                </p>
              ))}
            </label>
          </div>
        </AdminCard>

        <AdminCard title="Asset Names" subtitle="Set referenced asset identifiers; upload workflow is separate.">
          <div className="space-y-4">
            <label className="block space-y-1">
              <span className="text-sm font-medium text-[var(--muted)]">Logo Asset Name</span>
              <input
                value={draft.logoAssetName ?? ''}
                onChange={(event) => setDraft((prev) => ({ ...prev, logoAssetName: event.target.value }))}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                placeholder="assets/logo-v1.png"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium text-[var(--muted)]">Header Asset Name (optional)</span>
              <input
                value={draft.headerAssetName ?? ''}
                onChange={(event) => setDraft((prev) => ({ ...prev, headerAssetName: event.target.value }))}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                placeholder="assets/header-v1.png"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium text-[var(--muted)]">Footer Asset Name (optional)</span>
              <input
                value={draft.footerAssetName ?? ''}
                onChange={(event) => setDraft((prev) => ({ ...prev, footerAssetName: event.target.value }))}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                placeholder="assets/footer-v1.png"
              />
            </label>

            <button
              type="submit"
              disabled={saveMutation.isPending || isLoading}
              className="mt-2 w-full rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] disabled:opacity-60"
            >
              {saveMutation.isPending ? 'Saving...' : 'Save Branding'}
            </button>
          </div>
        </AdminCard>
      </form>

      <AdminCard title="Current Snapshot" subtitle="Last persisted tenant branding payload.">
        <SectionTitle title="Branding data" />
        <dl>
          <FieldRow label="Business Name" value={data?.businessName || draft.businessName || '—'} />
          <FieldRow label="Address" value={data?.address || draft.address || '—'} />
          <FieldRow label="Phone" value={data?.phone || draft.phone || '—'} />
          <FieldRow label="Header Line 1" value={data?.headerLine1 || draft.headerLine1 || '—'} />
          <FieldRow label="Header Line 2" value={data?.headerLine2 || draft.headerLine2 || '—'} />
          <FieldRow label="Logo Asset" value={data?.logoAssetName || draft.logoAssetName || 'Not set'} />
          <FieldRow label="Header Asset" value={data?.headerAssetName || draft.headerAssetName || 'Not set'} />
          <FieldRow label="Footer Asset" value={data?.footerAssetName || draft.footerAssetName || 'Not set'} />
          <FieldRow
            label="Updated"
            value={`${toTimestampLabel(data?.updatedAt)}${data?.updatedBy ? ` by ${data.updatedBy}` : ''}`}
          />
        </dl>
      </AdminCard>
    </div>
  );
}
