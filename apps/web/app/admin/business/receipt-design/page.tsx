'use client';

import { useState, type FormEvent } from 'react';
import { AdminCard } from '@/components/admin/AdminCard';
import { FeatureGate } from '@/components/admin/FeatureGate';
import { NoticeBanner } from '@/components/admin/NoticeBanner';
import { PageHeader } from '@/components/admin/PageHeader';
import { SectionTitle } from '@/components/admin/SectionTitle';
import { PreviewPanel } from '@/components/admin/design/PreviewPanel';
import { SelectField } from '@/components/admin/design/SelectField';
import { TextAreaField } from '@/components/admin/design/TextAreaField';
import { TextField } from '@/components/admin/design/TextField';
import { ToggleField } from '@/components/admin/design/ToggleField';

const WIDTH_MODES = [
  { value: 'a4', label: 'A4' },
  { value: 'thermal80', label: 'Thermal 80mm' },
  { value: 'thermal58', label: 'Thermal 58mm' },
] as const;

const GRAND_TOTAL_STYLES = [
  { value: 'bold', label: 'Bold' },
  { value: 'accent', label: 'Accent Color' },
] as const;

type ReceiptDesignDraft = {
  showLogo: boolean;
  businessNameOverride: string;
  showAddress: boolean;
  showContact: boolean;
  showQuantityColumn: boolean;
  showUnitPrice: boolean;
  showDiscountColumn: boolean;
  showTaxColumn: boolean;
  showSubtotal: boolean;
  showDiscount: boolean;
  showTax: boolean;
  grandTotalStyle: string;
  thankYouMessage: string;
  termsAndConditions: string;
  showQrCodePlaceholder: boolean;
  receiptWidthMode: string;
};

const initialDraft: ReceiptDesignDraft = {
  showLogo: true,
  businessNameOverride: '',
  showAddress: true,
  showContact: true,
  showQuantityColumn: true,
  showUnitPrice: true,
  showDiscountColumn: false,
  showTaxColumn: true,
  showSubtotal: true,
  showDiscount: true,
  showTax: true,
  grandTotalStyle: 'bold',
  thankYouMessage: '',
  termsAndConditions: '',
  showQrCodePlaceholder: false,
  receiptWidthMode: 'a4',
};

export default function ReceiptDesignPage() {
  const [draft, setDraft] = useState<ReceiptDesignDraft>(initialDraft);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavedAt(new Date().toLocaleString());
  };

  return (
    <FeatureGate
      featureKey="lims.receipt_design"
      fallback={
        <NoticeBanner title="Feature not enabled" tone="info">
          Receipt Design is not enabled for your tenant. Contact your administrator to enable the{' '}
          <code className="rounded bg-[var(--bg)] px-1">lims.receipt_design</code> feature flag.
        </NoticeBanner>
      }
    >
      <div className="space-y-6">
        <PageHeader
          title="Receipt Design"
          subtitle="Configure layout metadata for receipt printing. Rendering is handled by the PDF service."
        />

        <NoticeBanner title="Backend contract endpoint required" tone="warning">
        Current OpenAPI contract does not expose getTenantReceiptDesign / updateTenantReceiptDesign. This form is
        local-state scaffold only. Persistence requires backend contract alignment.
      </NoticeBanner>

      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <AdminCard title="Receipt Header">
            <SectionTitle title="Header visibility" />
            <div className="space-y-0">
              <ToggleField
                label="Show Logo"
                checked={draft.showLogo}
                onChange={(v) => setDraft((p) => ({ ...p, showLogo: v }))}
              />
              <TextField
                label="Business Name Override"
                value={draft.businessNameOverride}
                onChange={(v) => setDraft((p) => ({ ...p, businessNameOverride: v }))}
                placeholder="Optional; leave blank to use tenant branding"
              />
              <ToggleField
                label="Show Address"
                checked={draft.showAddress}
                onChange={(v) => setDraft((p) => ({ ...p, showAddress: v }))}
              />
              <ToggleField
                label="Show Contact"
                checked={draft.showContact}
                onChange={(v) => setDraft((p) => ({ ...p, showContact: v }))}
              />
            </div>
          </AdminCard>

          <AdminCard title="Line Item Table">
            <SectionTitle title="Columns to display" />
            <div className="space-y-0">
              <ToggleField
                label="Show Quantity Column"
                checked={draft.showQuantityColumn}
                onChange={(v) => setDraft((p) => ({ ...p, showQuantityColumn: v }))}
              />
              <ToggleField
                label="Show Unit Price"
                checked={draft.showUnitPrice}
                onChange={(v) => setDraft((p) => ({ ...p, showUnitPrice: v }))}
              />
              <ToggleField
                label="Show Discount Column"
                checked={draft.showDiscountColumn}
                onChange={(v) => setDraft((p) => ({ ...p, showDiscountColumn: v }))}
              />
              <ToggleField
                label="Show Tax Column"
                checked={draft.showTaxColumn}
                onChange={(v) => setDraft((p) => ({ ...p, showTaxColumn: v }))}
              />
            </div>
          </AdminCard>

          <AdminCard title="Totals Block">
            <SectionTitle title="Totals visibility and style" />
            <div className="space-y-0">
              <ToggleField
                label="Show Subtotal"
                checked={draft.showSubtotal}
                onChange={(v) => setDraft((p) => ({ ...p, showSubtotal: v }))}
              />
              <ToggleField
                label="Show Discount"
                checked={draft.showDiscount}
                onChange={(v) => setDraft((p) => ({ ...p, showDiscount: v }))}
              />
              <ToggleField
                label="Show Tax"
                checked={draft.showTax}
                onChange={(v) => setDraft((p) => ({ ...p, showTax: v }))}
              />
              <SelectField
                label="Highlight Grand Total Style"
                value={draft.grandTotalStyle}
                options={[...GRAND_TOTAL_STYLES]}
                onChange={(v) => setDraft((p) => ({ ...p, grandTotalStyle: v }))}
              />
            </div>
          </AdminCard>

          <AdminCard title="Footer">
            <SectionTitle title="Footer content" />
            <div className="space-y-0">
              <TextAreaField
                label="Thank You Message"
                value={draft.thankYouMessage}
                onChange={(v) => setDraft((p) => ({ ...p, thankYouMessage: v }))}
                placeholder="e.g. Thank you for your business"
                rows={2}
              />
              <TextAreaField
                label="Terms & Conditions"
                value={draft.termsAndConditions}
                onChange={(v) => setDraft((p) => ({ ...p, termsAndConditions: v }))}
                placeholder="Optional terms text"
                rows={3}
              />
              <ToggleField
                label="Show QR Code Placeholder"
                checked={draft.showQrCodePlaceholder}
                onChange={(v) => setDraft((p) => ({ ...p, showQrCodePlaceholder: v }))}
              />
            </div>
          </AdminCard>

          <AdminCard title="Receipt Width Mode">
            <SectionTitle title="Paper / printer width" />
            <SelectField
              label="Width Mode"
              value={draft.receiptWidthMode}
              options={[...WIDTH_MODES]}
              onChange={(v) => setDraft((p) => ({ ...p, receiptWidthMode: v }))}
            />
          </AdminCard>

          <button
            type="submit"
            className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)]"
          >
            Save Draft
          </button>
          {savedAt ? (
            <p className="text-sm text-[var(--muted)]">Saved locally at {savedAt}</p>
          ) : null}
        </div>

        <div className="xl:col-span-1">
          <AdminCard title="Preview" subtitle="Backend integration required">
            <PreviewPanel message="Receipt rendering handled by PDF service — preview requires backend integration" />
          </AdminCard>
        </div>
      </form>
    </div>
    </FeatureGate>
  );
}
