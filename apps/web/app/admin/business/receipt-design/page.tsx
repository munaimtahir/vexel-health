'use client';

import { useState, type FormEvent } from 'react';
import { AdminCard } from '@/components/admin/AdminCard';
import { FieldRow } from '@/components/admin/FieldRow';
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

const HAS_RECEIPT_DESIGN_ENDPOINT = false;

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

function labelFor(options: readonly { value: string; label: string }[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

export default function ReceiptDesignPage() {
  const [draft, setDraft] = useState<ReceiptDesignDraft>(initialDraft);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!HAS_RECEIPT_DESIGN_ENDPOINT) {
      setSavedAt(new Date().toLocaleString());
      return;
    }

    // TODO(contract): Replace local save with @vexel/contracts SDK methods:
    // getTenantReceiptDesign() / updateTenantReceiptDesign()
    setSavedAt(new Date().toLocaleString());
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Receipt Design"
        subtitle="Configure receipt layout metadata for deterministic PDF rendering by backend service."
      />

      {!HAS_RECEIPT_DESIGN_ENDPOINT ? (
        <NoticeBanner title="Backend contract endpoint required" tone="warning">
          Backend contract endpoint required.
        </NoticeBanner>
      ) : null}

      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <AdminCard title="Receipt Header">
            <SectionTitle title="Header visibility" />
            <div className="space-y-0">
              <ToggleField
                label="Show Logo"
                checked={draft.showLogo}
                onChange={(value) => setDraft((prev) => ({ ...prev, showLogo: value }))}
              />
              <TextField
                label="Business Name override (optional)"
                value={draft.businessNameOverride}
                onChange={(value) => setDraft((prev) => ({ ...prev, businessNameOverride: value }))}
                placeholder="Leave blank to use tenant branding"
              />
              <ToggleField
                label="Show Address"
                checked={draft.showAddress}
                onChange={(value) => setDraft((prev) => ({ ...prev, showAddress: value }))}
              />
              <ToggleField
                label="Show Contact"
                checked={draft.showContact}
                onChange={(value) => setDraft((prev) => ({ ...prev, showContact: value }))}
              />
            </div>
          </AdminCard>

          <AdminCard title="Line Item Table">
            <SectionTitle title="Columns to display" />
            <div className="space-y-0">
              <ToggleField
                label="Show Quantity column"
                checked={draft.showQuantityColumn}
                onChange={(value) => setDraft((prev) => ({ ...prev, showQuantityColumn: value }))}
              />
              <ToggleField
                label="Show Unit Price"
                checked={draft.showUnitPrice}
                onChange={(value) => setDraft((prev) => ({ ...prev, showUnitPrice: value }))}
              />
              <ToggleField
                label="Show Discount column"
                checked={draft.showDiscountColumn}
                onChange={(value) => setDraft((prev) => ({ ...prev, showDiscountColumn: value }))}
              />
              <ToggleField
                label="Show Tax column"
                checked={draft.showTaxColumn}
                onChange={(value) => setDraft((prev) => ({ ...prev, showTaxColumn: value }))}
              />
            </div>
          </AdminCard>

          <AdminCard title="Totals Block">
            <SectionTitle title="Totals visibility and style" />
            <div className="space-y-0">
              <ToggleField
                label="Show Subtotal"
                checked={draft.showSubtotal}
                onChange={(value) => setDraft((prev) => ({ ...prev, showSubtotal: value }))}
              />
              <ToggleField
                label="Show Discount"
                checked={draft.showDiscount}
                onChange={(value) => setDraft((prev) => ({ ...prev, showDiscount: value }))}
              />
              <ToggleField
                label="Show Tax"
                checked={draft.showTax}
                onChange={(value) => setDraft((prev) => ({ ...prev, showTax: value }))}
              />
              <SelectField
                label="Highlight Grand Total Style"
                value={draft.grandTotalStyle}
                options={[...GRAND_TOTAL_STYLES]}
                onChange={(value) => setDraft((prev) => ({ ...prev, grandTotalStyle: value }))}
              />
            </div>
          </AdminCard>

          <AdminCard title="Footer">
            <SectionTitle title="Footer content" />
            <div className="space-y-0">
              <TextAreaField
                label="Thank You Message"
                value={draft.thankYouMessage}
                onChange={(value) => setDraft((prev) => ({ ...prev, thankYouMessage: value }))}
                placeholder="e.g. Thank you for your visit"
                rows={2}
              />
              <TextAreaField
                label="Terms and Conditions text"
                value={draft.termsAndConditions}
                onChange={(value) => setDraft((prev) => ({ ...prev, termsAndConditions: value }))}
                placeholder="Optional terms text"
                rows={3}
              />
              <ToggleField
                label="Show QR Code placeholder"
                checked={draft.showQrCodePlaceholder}
                onChange={(value) => setDraft((prev) => ({ ...prev, showQrCodePlaceholder: value }))}
              />
            </div>
          </AdminCard>

          <AdminCard title="Receipt Width Mode">
            <SectionTitle title="Paper / printer width" />
            <SelectField
              label="Width Mode"
              value={draft.receiptWidthMode}
              options={[...WIDTH_MODES]}
              onChange={(value) => setDraft((prev) => ({ ...prev, receiptWidthMode: value }))}
            />
          </AdminCard>

          <button
            type="submit"
            className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)]"
          >
            Save Draft
          </button>
        </div>

        <div className="space-y-6 xl:col-span-1">
          <AdminCard title="Preview" subtitle="Backend integration required">
            <PreviewPanel message="Receipt rendering handled by PDF service — preview requires backend integration" />
          </AdminCard>

          <AdminCard title="Current Design Snapshot">
            <SectionTitle title="Tenant-scoped draft metadata" />
            <dl>
              <FieldRow
                label="Header"
                value={`${draft.showLogo ? 'Logo on' : 'Logo off'} | Address ${draft.showAddress ? 'On' : 'Off'} | Contact ${draft.showContact ? 'On' : 'Off'}`}
              />
              <FieldRow
                label="Line Items"
                value={`Qty ${draft.showQuantityColumn ? 'On' : 'Off'} | Unit Price ${draft.showUnitPrice ? 'On' : 'Off'} | Discount ${draft.showDiscountColumn ? 'On' : 'Off'} | Tax ${draft.showTaxColumn ? 'On' : 'Off'}`}
              />
              <FieldRow
                label="Totals"
                value={`Subtotal ${draft.showSubtotal ? 'On' : 'Off'} | Discount ${draft.showDiscount ? 'On' : 'Off'} | Tax ${draft.showTax ? 'On' : 'Off'} | ${labelFor(GRAND_TOTAL_STYLES, draft.grandTotalStyle)}`}
              />
              <FieldRow
                label="Footer"
                value={`${draft.thankYouMessage || 'No thank-you message'} | QR placeholder ${draft.showQrCodePlaceholder ? 'On' : 'Off'}`}
              />
              <FieldRow label="Width Mode" value={labelFor(WIDTH_MODES, draft.receiptWidthMode)} />
              <FieldRow label="Saved" value={savedAt ? `Saved locally at ${savedAt}` : 'Not saved yet'} />
            </dl>
          </AdminCard>
        </div>
      </form>
    </div>
  );
}
