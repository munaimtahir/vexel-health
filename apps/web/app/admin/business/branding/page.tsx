'use client';

import Link from 'next/link';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { AdminCard } from '@/components/admin/AdminCard';
import { FieldRow } from '@/components/admin/FieldRow';
import { NoticeBanner } from '@/components/admin/NoticeBanner';
import { PageHeader } from '@/components/admin/PageHeader';
import { SectionTitle } from '@/components/admin/SectionTitle';
import { adminRoutes } from '@/lib/admin/routes';

type BrandingDraft = {
  businessName: string;
  address: string;
  phone: string;
  headerLine1: string;
  headerLine2: string;
  logoName: string;
  headerImageName: string;
  footerImageName: string;
};

const initialDraft: BrandingDraft = {
  businessName: '',
  address: '',
  phone: '',
  headerLine1: '',
  headerLine2: '',
  logoName: '',
  headerImageName: '',
  footerImageName: '',
};

function pickFileName(event: ChangeEvent<HTMLInputElement>): string {
  return event.target.files?.[0]?.name ?? '';
}

export default function BrandingPage() {
  const [draft, setDraft] = useState<BrandingDraft>(initialDraft);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavedAt(new Date().toLocaleString());
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branding"
        subtitle="Per-tenant report identity scaffold. Storage and upload APIs are contract-pending."
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

      <NoticeBanner title="Requires backend contract endpoint" tone="warning">
        Current OpenAPI contract does not expose tenant branding CRUD or asset upload endpoints. This form is local-state scaffold only.
      </NoticeBanner>

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
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-[var(--muted)]">Phone</span>
              <input
                value={draft.phone}
                onChange={(event) => setDraft((prev) => ({ ...prev, phone: event.target.value }))}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                placeholder="+1 555 000 000"
              />
            </label>

            <label className="space-y-1 md:col-span-2">
              <span className="text-sm font-medium text-[var(--muted)]">Address</span>
              <textarea
                value={draft.address}
                onChange={(event) => setDraft((prev) => ({ ...prev, address: event.target.value }))}
                className="min-h-24 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                placeholder="Clinic / lab address"
              />
            </label>

            <label className="space-y-1 md:col-span-2">
              <span className="text-sm font-medium text-[var(--muted)]">Report Header Line 1</span>
              <input
                value={draft.headerLine1}
                onChange={(event) => setDraft((prev) => ({ ...prev, headerLine1: event.target.value }))}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                placeholder="Trusted Clinical Diagnostics"
              />
            </label>

            <label className="space-y-1 md:col-span-2">
              <span className="text-sm font-medium text-[var(--muted)]">Report Header Line 2</span>
              <input
                value={draft.headerLine2}
                onChange={(event) => setDraft((prev) => ({ ...prev, headerLine2: event.target.value }))}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                placeholder="ISO compliant laboratory"
              />
            </label>
          </div>
        </AdminCard>

        <AdminCard title="Assets" subtitle="Upload placeholders only.">
          <div className="space-y-4">
            <label className="block space-y-1">
              <span className="text-sm font-medium text-[var(--muted)]">Logo Image</span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setDraft((prev) => ({ ...prev, logoName: pickFileName(event) }))}
                className="block w-full text-sm text-[var(--muted)]"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium text-[var(--muted)]">Header Image (optional)</span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setDraft((prev) => ({ ...prev, headerImageName: pickFileName(event) }))}
                className="block w-full text-sm text-[var(--muted)]"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium text-[var(--muted)]">Footer Image (optional)</span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setDraft((prev) => ({ ...prev, footerImageName: pickFileName(event) }))}
                className="block w-full text-sm text-[var(--muted)]"
              />
            </label>

            <button
              type="submit"
              className="mt-2 w-full rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)]"
            >
              Save Draft
            </button>
            {savedAt ? <p className="text-xs text-[var(--muted)]">Saved locally at {savedAt}</p> : null}
          </div>
        </AdminCard>
      </form>

      <AdminCard title="Preview" subtitle="Report/PDF visual preview will be wired in a later phase.">
        <SectionTitle title="Preview Panel Placeholder" />
        <dl>
          <FieldRow label="Business Name" value={draft.businessName || '—'} />
          <FieldRow label="Address" value={draft.address || '—'} />
          <FieldRow label="Phone" value={draft.phone || '—'} />
          <FieldRow label="Header Line 1" value={draft.headerLine1 || '—'} />
          <FieldRow label="Header Line 2" value={draft.headerLine2 || '—'} />
          <FieldRow label="Logo" value={draft.logoName || 'Not selected'} />
          <FieldRow label="Header Asset" value={draft.headerImageName || 'Not selected'} />
          <FieldRow label="Footer Asset" value={draft.footerImageName || 'Not selected'} />
        </dl>
      </AdminCard>
    </div>
  );
}
