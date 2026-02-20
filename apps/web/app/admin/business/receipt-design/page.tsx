'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { parseApiError, type FieldErrors } from '@/lib/api-errors';
import { client } from '@/lib/sdk/client';
import { adminKeys } from '@/lib/sdk/hooks';
import type { paths } from '@vexel/contracts';

const WIDTH_MODES = [
  { value: 'a4', label: 'A4' },
  { value: 'thermal80', label: 'Thermal 80mm' },
  { value: 'thermal58', label: 'Thermal 58mm' },
] as const;

const GRAND_TOTAL_STYLES = [
  { value: 'bold', label: 'Bold' },
  { value: 'accent', label: 'Accent Color' },
] as const;

type ReceiptDesignResponse =
  paths['/admin/business/receipt-design']['get']['responses'][200]['content']['application/json'];
type UpdateReceiptDesignRequest =
  paths['/admin/business/receipt-design']['put']['requestBody']['content']['application/json'];

const initialDraft: UpdateReceiptDesignRequest = {
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
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<UpdateReceiptDesignRequest>(initialDraft);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const { data, error, isLoading } = useQuery({
    queryKey: adminKeys.receiptDesign(),
    queryFn: async () => {
      const { data, error } = await client.GET('/admin/business/receipt-design');
      if (error) throw new Error(parseApiError(error, 'Failed to load receipt design config').message);
      return data as ReceiptDesignResponse;
    },
  });

  useEffect(() => {
    if (!data) return;
    setDraft({
      showLogo: data.showLogo,
      businessNameOverride: data.businessNameOverride,
      showAddress: data.showAddress,
      showContact: data.showContact,
      showQuantityColumn: data.showQuantityColumn,
      showUnitPrice: data.showUnitPrice,
      showDiscountColumn: data.showDiscountColumn,
      showTaxColumn: data.showTaxColumn,
      showSubtotal: data.showSubtotal,
      showDiscount: data.showDiscount,
      showTax: data.showTax,
      grandTotalStyle: data.grandTotalStyle,
      thankYouMessage: data.thankYouMessage,
      termsAndConditions: data.termsAndConditions,
      showQrCodePlaceholder: data.showQrCodePlaceholder,
      receiptWidthMode: data.receiptWidthMode,
    });
  }, [data]);

  const validationMessages = useMemo(
    () =>
      Object.entries(fieldErrors).flatMap(([field, messages]) =>
        messages.map((message) => `${field}: ${message}`),
      ),
    [fieldErrors],
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await client.PUT('/admin/business/receipt-design', {
        body: {
          ...draft,
          businessNameOverride: draft.businessNameOverride.trim(),
          thankYouMessage: draft.thankYouMessage.trim(),
          termsAndConditions: draft.termsAndConditions.trim(),
        },
      });

      if (error) {
        const parsed = parseApiError(error, 'Failed to save receipt design config');
        setFieldErrors(parsed.fieldErrors);
        throw new Error(parsed.message);
      }

      return data as ReceiptDesignResponse;
    },
    onSuccess: async (updated) => {
      setFieldErrors({});
      setSavedAt(updated.updatedAt);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.receiptDesign() }),
        queryClient.invalidateQueries({ queryKey: adminKeys.overview() }),
      ]);
    },
  });

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavedAt(null);
    setFieldErrors({});
    saveMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Receipt Design"
        subtitle="Configure tenant-scoped receipt layout metadata for deterministic backend PDF rendering."
      />

      {error ? (
        <NoticeBanner title="Unable to load receipt design config" tone="warning">
          {error instanceof Error ? error.message : 'Unknown error'}
        </NoticeBanner>
      ) : null}

      {saveMutation.error ? (
        <NoticeBanner title="Unable to save receipt design config" tone="warning">
          {saveMutation.error instanceof Error ? saveMutation.error.message : 'Unknown error'}
        </NoticeBanner>
      ) : null}

      {validationMessages.length > 0 ? (
        <NoticeBanner title="Validation issues" tone="warning">
          {validationMessages.join(' | ')}
        </NoticeBanner>
      ) : null}

      {savedAt ? (
        <NoticeBanner title="Receipt design saved" tone="success">
          Saved at {new Date(savedAt).toLocaleString()}.
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
                onChange={(value) =>
                  setDraft((prev) => ({ ...prev, grandTotalStyle: value as UpdateReceiptDesignRequest['grandTotalStyle'] }))
                }
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
              onChange={(value) =>
                setDraft((prev) => ({ ...prev, receiptWidthMode: value as UpdateReceiptDesignRequest['receiptWidthMode'] }))
              }
            />
          </AdminCard>

          <button
            type="submit"
            disabled={saveMutation.isPending || isLoading}
            className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] disabled:opacity-60"
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Design'}
          </button>
        </div>

        <div className="space-y-6 xl:col-span-1">
          <AdminCard title="Preview" subtitle="PDF bytes are generated by backend service.">
            <PreviewPanel message="Receipt rendering is handled by the backend PDF service." />
          </AdminCard>

          <AdminCard title="Current Design Snapshot">
            <SectionTitle title="Tenant-scoped metadata" />
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
              <FieldRow
                label="Updated"
                value={`${data?.updatedAt ? new Date(data.updatedAt).toLocaleString() : '—'}${data?.updatedBy ? ` by ${data.updatedBy}` : ''}`}
              />
            </dl>
          </AdminCard>
        </div>
      </form>
    </div>
  );
}
