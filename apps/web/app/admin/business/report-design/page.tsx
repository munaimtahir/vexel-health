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

const LOGO_POSITIONS = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
] as const;

const DIVIDER_STYLES = [
  { value: 'thin', label: 'Thin' },
  { value: 'none', label: 'None' },
  { value: 'accent', label: 'Accent' },
] as const;

const LAYOUT_STYLES = [
  { value: 'compact', label: 'Compact' },
  { value: 'spacious', label: 'Spacious' },
] as const;

const FONT_SIZES = [
  { value: 'small', label: 'Small' },
  { value: 'normal', label: 'Normal' },
  { value: 'large', label: 'Large' },
] as const;

const ABNORMAL_STYLES = [
  { value: 'bold', label: 'Bold' },
  { value: 'color', label: 'Color Accent' },
  { value: 'border', label: 'Border' },
] as const;

const SIGNATORY_STYLES = [
  { value: 'single', label: 'Single' },
  { value: 'dual', label: 'Dual Column' },
] as const;

type ReportDesignResponse =
  paths['/admin/business/report-design']['get']['responses'][200]['content']['application/json'];
type UpdateReportDesignRequest =
  paths['/admin/business/report-design']['put']['requestBody']['content']['application/json'];

const initialDraft: UpdateReportDesignRequest = {
  showLogo: true,
  logoPosition: 'left',
  headerText1: '',
  headerText2: '',
  headerDividerStyle: 'thin',
  patientLayoutStyle: 'compact',
  showRefNumber: true,
  showConsultant: true,
  showSampleTime: true,
  resultsFontSize: 'normal',
  showUnitsColumn: true,
  showReferenceRange: true,
  abnormalHighlightStyle: 'bold',
  footerText: '',
  showSignatories: true,
  signatoryBlockStyle: 'single',
};

function labelFor(options: readonly { value: string; label: string }[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

export default function ReportDesignPage() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<UpdateReportDesignRequest>(initialDraft);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const { data, error, isLoading } = useQuery({
    queryKey: adminKeys.reportDesign(),
    queryFn: async () => {
      const { data, error } = await client.GET('/admin/business/report-design');
      if (error) throw new Error(parseApiError(error, 'Failed to load report design config').message);
      return data as ReportDesignResponse;
    },
  });

  useEffect(() => {
    if (!data) return;
    setDraft({
      showLogo: data.showLogo,
      logoPosition: data.logoPosition,
      headerText1: data.headerText1,
      headerText2: data.headerText2,
      headerDividerStyle: data.headerDividerStyle,
      patientLayoutStyle: data.patientLayoutStyle,
      showRefNumber: data.showRefNumber,
      showConsultant: data.showConsultant,
      showSampleTime: data.showSampleTime,
      resultsFontSize: data.resultsFontSize,
      showUnitsColumn: data.showUnitsColumn,
      showReferenceRange: data.showReferenceRange,
      abnormalHighlightStyle: data.abnormalHighlightStyle,
      footerText: data.footerText,
      showSignatories: data.showSignatories,
      signatoryBlockStyle: data.signatoryBlockStyle,
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
      const { data, error } = await client.PUT('/admin/business/report-design', {
        body: {
          ...draft,
          headerText1: draft.headerText1.trim(),
          headerText2: draft.headerText2.trim(),
          footerText: draft.footerText.trim(),
        },
      });

      if (error) {
        const parsed = parseApiError(error, 'Failed to save report design config');
        setFieldErrors(parsed.fieldErrors);
        throw new Error(parsed.message);
      }

      return data as ReportDesignResponse;
    },
    onSuccess: async (updated) => {
      setFieldErrors({});
      setSavedAt(updated.updatedAt);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.reportDesign() }),
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
        title="Report Design"
        subtitle="Configure tenant-scoped report design metadata for deterministic backend PDF rendering."
      />

      {error ? (
        <NoticeBanner title="Unable to load report design config" tone="warning">
          {error instanceof Error ? error.message : 'Unknown error'}
        </NoticeBanner>
      ) : null}

      {saveMutation.error ? (
        <NoticeBanner title="Unable to save report design config" tone="warning">
          {saveMutation.error instanceof Error ? saveMutation.error.message : 'Unknown error'}
        </NoticeBanner>
      ) : null}

      {validationMessages.length > 0 ? (
        <NoticeBanner title="Validation issues" tone="warning">
          {validationMessages.join(' | ')}
        </NoticeBanner>
      ) : null}

      {savedAt ? (
        <NoticeBanner title="Report design saved" tone="success">
          Saved at {new Date(savedAt).toLocaleString()}.
        </NoticeBanner>
      ) : null}

      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <AdminCard title="Header Configuration">
            <SectionTitle title="Report header" />
            <div className="space-y-0">
              <ToggleField
                label="Show Logo"
                checked={draft.showLogo}
                onChange={(value) => setDraft((prev) => ({ ...prev, showLogo: value }))}
              />
              <SelectField
                label="Logo Position"
                value={draft.logoPosition}
                options={[...LOGO_POSITIONS]}
                onChange={(value) => setDraft((prev) => ({ ...prev, logoPosition: value as UpdateReportDesignRequest['logoPosition'] }))}
              />
              <TextField
                label="Header Text Line 1"
                value={draft.headerText1}
                onChange={(value) => setDraft((prev) => ({ ...prev, headerText1: value }))}
                placeholder="Primary report header line"
              />
              <TextField
                label="Header Text Line 2"
                value={draft.headerText2}
                onChange={(value) => setDraft((prev) => ({ ...prev, headerText2: value }))}
                placeholder="Secondary report header line"
              />
              <SelectField
                label="Header Divider Style"
                value={draft.headerDividerStyle}
                options={[...DIVIDER_STYLES]}
                onChange={(value) =>
                  setDraft((prev) => ({
                    ...prev,
                    headerDividerStyle: value as UpdateReportDesignRequest['headerDividerStyle'],
                  }))
                }
              />
            </div>
          </AdminCard>

          <AdminCard title="Patient Info Block Layout">
            <SectionTitle title="Layout and visibility" />
            <div className="space-y-0">
              <SelectField
                label="Layout Style"
                value={draft.patientLayoutStyle}
                options={[...LAYOUT_STYLES]}
                onChange={(value) =>
                  setDraft((prev) => ({ ...prev, patientLayoutStyle: value as UpdateReportDesignRequest['patientLayoutStyle'] }))
                }
              />
              <ToggleField
                label="Show Ref #"
                checked={draft.showRefNumber}
                onChange={(value) => setDraft((prev) => ({ ...prev, showRefNumber: value }))}
              />
              <ToggleField
                label="Show Consultant"
                checked={draft.showConsultant}
                onChange={(value) => setDraft((prev) => ({ ...prev, showConsultant: value }))}
              />
              <ToggleField
                label="Show Sample Time"
                checked={draft.showSampleTime}
                onChange={(value) => setDraft((prev) => ({ ...prev, showSampleTime: value }))}
              />
            </div>
          </AdminCard>

          <AdminCard title="Results Table Styling">
            <SectionTitle title="Table options" />
            <div className="space-y-0">
              <SelectField
                label="Font Size"
                value={draft.resultsFontSize}
                options={[...FONT_SIZES]}
                onChange={(value) =>
                  setDraft((prev) => ({ ...prev, resultsFontSize: value as UpdateReportDesignRequest['resultsFontSize'] }))
                }
              />
              <ToggleField
                label="Show Units Column"
                checked={draft.showUnitsColumn}
                onChange={(value) => setDraft((prev) => ({ ...prev, showUnitsColumn: value }))}
              />
              <ToggleField
                label="Show Reference Range"
                checked={draft.showReferenceRange}
                onChange={(value) => setDraft((prev) => ({ ...prev, showReferenceRange: value }))}
              />
              <SelectField
                label="Abnormal Highlight Style"
                value={draft.abnormalHighlightStyle}
                options={[...ABNORMAL_STYLES]}
                onChange={(value) =>
                  setDraft((prev) => ({
                    ...prev,
                    abnormalHighlightStyle: value as UpdateReportDesignRequest['abnormalHighlightStyle'],
                  }))
                }
              />
            </div>
          </AdminCard>

          <AdminCard title="Footer Configuration">
            <SectionTitle title="Footer and signatories" />
            <div className="space-y-0">
              <TextAreaField
                label="Footer Text"
                value={draft.footerText}
                onChange={(value) => setDraft((prev) => ({ ...prev, footerText: value }))}
                placeholder="Footer disclaimer or notes"
                rows={3}
              />
              <ToggleField
                label="Show Signatories"
                checked={draft.showSignatories}
                onChange={(value) => setDraft((prev) => ({ ...prev, showSignatories: value }))}
              />
              <SelectField
                label="Signatory Block Style"
                value={draft.signatoryBlockStyle}
                options={[...SIGNATORY_STYLES]}
                onChange={(value) =>
                  setDraft((prev) => ({
                    ...prev,
                    signatoryBlockStyle: value as UpdateReportDesignRequest['signatoryBlockStyle'],
                  }))
                }
              />
            </div>
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
            <PreviewPanel message="Deterministic PDF preview is generated by backend PDF service." />
          </AdminCard>

          <AdminCard title="Current Design Snapshot">
            <SectionTitle title="Tenant-scoped metadata" />
            <dl>
              <FieldRow
                label="Header"
                value={`${draft.showLogo ? 'Logo on' : 'Logo off'} | ${labelFor(LOGO_POSITIONS, draft.logoPosition)} | ${labelFor(DIVIDER_STYLES, draft.headerDividerStyle)}`}
              />
              <FieldRow
                label="Patient Block"
                value={`${labelFor(LAYOUT_STYLES, draft.patientLayoutStyle)} | Ref # ${draft.showRefNumber ? 'On' : 'Off'} | Consultant ${draft.showConsultant ? 'On' : 'Off'} | Sample Time ${draft.showSampleTime ? 'On' : 'Off'}`}
              />
              <FieldRow
                label="Results Table"
                value={`${labelFor(FONT_SIZES, draft.resultsFontSize)} | Units ${draft.showUnitsColumn ? 'On' : 'Off'} | Reference Range ${draft.showReferenceRange ? 'On' : 'Off'} | ${labelFor(ABNORMAL_STYLES, draft.abnormalHighlightStyle)}`}
              />
              <FieldRow
                label="Footer"
                value={`${draft.footerText || 'No footer text'} | Signatories ${draft.showSignatories ? 'On' : 'Off'} | ${labelFor(SIGNATORY_STYLES, draft.signatoryBlockStyle)}`}
              />
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
