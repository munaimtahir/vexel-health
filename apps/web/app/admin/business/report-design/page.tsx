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

const HAS_REPORT_DESIGN_ENDPOINT = false;

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
  const [draft, setDraft] = useState<ReportDesignDraft>(initialDraft);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!HAS_REPORT_DESIGN_ENDPOINT) {
      setSavedAt(new Date().toLocaleString());
      return;
    }

    // TODO(contract): Replace local save with @vexel/contracts SDK methods:
    // getTenantReportDesign() / updateTenantReportDesign()
    setSavedAt(new Date().toLocaleString());
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Report Design"
        subtitle="Configure layout metadata for PDF report templates. Rendering remains backend-only via the deterministic PDF service."
      />

      {!HAS_REPORT_DESIGN_ENDPOINT ? (
        <NoticeBanner title="Requires backend contract endpoint: GET/PUT tenant report design" tone="warning">
          Backend contract endpoint required.
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
                onChange={(value) => setDraft((prev) => ({ ...prev, logoPosition: value }))}
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
                onChange={(value) => setDraft((prev) => ({ ...prev, headerDividerStyle: value }))}
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
                onChange={(value) => setDraft((prev) => ({ ...prev, patientLayoutStyle: value }))}
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
                onChange={(value) => setDraft((prev) => ({ ...prev, resultsFontSize: value }))}
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
                onChange={(value) => setDraft((prev) => ({ ...prev, abnormalHighlightStyle: value }))}
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
                onChange={(value) => setDraft((prev) => ({ ...prev, signatoryBlockStyle: value }))}
              />
            </div>
          </AdminCard>

          <button
            type="submit"
            className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)]"
          >
            Save Draft
          </button>
        </div>

        <div className="space-y-6 xl:col-span-1">
          <AdminCard title="Preview" subtitle="Backend service integration required">
            <PreviewPanel message="Deterministic PDF preview will render here (backend service integration required)" />
          </AdminCard>

          <AdminCard title="Current Design Snapshot">
            <SectionTitle title="Tenant-scoped draft metadata" />
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
              <FieldRow label="Saved" value={savedAt ? `Saved locally at ${savedAt}` : 'Not saved yet'} />
            </dl>
          </AdminCard>
        </div>
      </form>
    </div>
  );
}
