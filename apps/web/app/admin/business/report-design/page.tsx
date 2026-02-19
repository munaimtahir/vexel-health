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

type ReportDesignDraft = {
  showLogo: boolean;
  logoPosition: string;
  headerText1: string;
  headerText2: string;
  headerDividerStyle: string;
  patientLayoutStyle: string;
  showRefNumber: boolean;
  showConsultant: boolean;
  showSampleTime: boolean;
  resultsFontSize: string;
  showUnitsColumn: boolean;
  showReferenceRange: boolean;
  abnormalHighlightStyle: string;
  footerText: string;
  showSignatories: boolean;
  signatoryBlockStyle: string;
};

const initialDraft: ReportDesignDraft = {
  showLogo: true,
  logoPosition: 'left',
  headerText1: '',
  headerText2: '',
  headerDividerStyle: 'thin',
  patientLayoutStyle: 'spacious',
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

export default function ReportDesignPage() {
  const [draft, setDraft] = useState<ReportDesignDraft>(initialDraft);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavedAt(new Date().toLocaleString());
  };

  return (
    <FeatureGate
      featureKey="lims.report_design"
      fallback={
        <NoticeBanner title="Feature not enabled" tone="info">
          Report Design is not enabled for your tenant. Contact your administrator to enable the{' '}
          <code className="rounded bg-[var(--bg)] px-1">lims.report_design</code> feature flag.
        </NoticeBanner>
      }
    >
      <div className="space-y-6">
        <PageHeader
          title="Report Design"
          subtitle="Configure layout metadata for the PDF report engine. Rendering is performed by the deterministic PDF service."
        />

        <NoticeBanner title="Requires backend contract endpoint: GET/PUT tenant report design" tone="warning">
        Current OpenAPI contract does not expose getTenantReportDesign / updateTenantReportDesign. This form is
        local-state scaffold only. Persistence requires backend contract alignment.
      </NoticeBanner>

      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <AdminCard title="Header Configuration">
            <SectionTitle title="Report header" />
            <div className="space-y-0">
              <ToggleField
                label="Show Logo"
                checked={draft.showLogo}
                onChange={(v) => setDraft((p) => ({ ...p, showLogo: v }))}
              />
              <SelectField
                label="Logo Position"
                value={draft.logoPosition}
                options={[...LOGO_POSITIONS]}
                onChange={(v) => setDraft((p) => ({ ...p, logoPosition: v }))}
              />
              <TextField
                label="Header Text Line 1"
                value={draft.headerText1}
                onChange={(v) => setDraft((p) => ({ ...p, headerText1: v }))}
                placeholder="e.g. Lab name or title"
              />
              <TextField
                label="Header Text Line 2"
                value={draft.headerText2}
                onChange={(v) => setDraft((p) => ({ ...p, headerText2: v }))}
                placeholder="Optional subtitle"
              />
              <SelectField
                label="Header Divider Style"
                value={draft.headerDividerStyle}
                options={[...DIVIDER_STYLES]}
                onChange={(v) => setDraft((p) => ({ ...p, headerDividerStyle: v }))}
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
                onChange={(v) => setDraft((p) => ({ ...p, patientLayoutStyle: v }))}
              />
              <ToggleField
                label="Show Ref #"
                checked={draft.showRefNumber}
                onChange={(v) => setDraft((p) => ({ ...p, showRefNumber: v }))}
              />
              <ToggleField
                label="Show Consultant"
                checked={draft.showConsultant}
                onChange={(v) => setDraft((p) => ({ ...p, showConsultant: v }))}
              />
              <ToggleField
                label="Show Sample Time"
                checked={draft.showSampleTime}
                onChange={(v) => setDraft((p) => ({ ...p, showSampleTime: v }))}
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
                onChange={(v) => setDraft((p) => ({ ...p, resultsFontSize: v }))}
              />
              <ToggleField
                label="Show Units Column"
                checked={draft.showUnitsColumn}
                onChange={(v) => setDraft((p) => ({ ...p, showUnitsColumn: v }))}
              />
              <ToggleField
                label="Show Reference Range"
                checked={draft.showReferenceRange}
                onChange={(v) => setDraft((p) => ({ ...p, showReferenceRange: v }))}
              />
              <SelectField
                label="Abnormal Highlight Style"
                value={draft.abnormalHighlightStyle}
                options={[...ABNORMAL_STYLES]}
                onChange={(v) => setDraft((p) => ({ ...p, abnormalHighlightStyle: v }))}
              />
            </div>
          </AdminCard>

          <AdminCard title="Footer Configuration">
            <SectionTitle title="Footer and signatories" />
            <div className="space-y-0">
              <TextAreaField
                label="Footer Text"
                value={draft.footerText}
                onChange={(v) => setDraft((p) => ({ ...p, footerText: v }))}
                placeholder="Disclaimer or standard footer text"
                rows={3}
              />
              <ToggleField
                label="Show Signatories"
                checked={draft.showSignatories}
                onChange={(v) => setDraft((p) => ({ ...p, showSignatories: v }))}
              />
              <SelectField
                label="Signatory Block Style"
                value={draft.signatoryBlockStyle}
                options={[...SIGNATORY_STYLES]}
                onChange={(v) => setDraft((p) => ({ ...p, signatoryBlockStyle: v }))}
              />
            </div>
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
          <AdminCard title="Preview" subtitle="Backend service integration required">
            <PreviewPanel message="Deterministic PDF preview will render here (backend service integration required)" />
          </AdminCard>
        </div>
      </form>
    </div>
    </FeatureGate>
  );
}
