import type { ReactNode } from 'react';

type StatusPillProps = {
  status: string | null | undefined;
  children?: ReactNode;
};

const toneClasses: Record<string, string> = {
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  enabled: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  verified: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  published: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  draft: 'border-slate-200 bg-slate-100 text-slate-700',
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  queued: 'border-amber-200 bg-amber-50 text-amber-700',
  running: 'border-blue-200 bg-blue-50 text-blue-700',
  completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  revoked: 'border-rose-200 bg-rose-50 text-rose-700',
  accepted: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  expired: 'border-slate-200 bg-slate-100 text-slate-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  inactive: 'border-slate-200 bg-slate-100 text-slate-700',
  archived: 'border-slate-200 bg-slate-100 text-slate-700',
  failed: 'border-rose-200 bg-rose-50 text-rose-700',
  error: 'border-rose-200 bg-rose-50 text-rose-700',
};

function normalizeStatus(status: string | null | undefined): string {
  if (!status) return 'pending';
  return status.toLowerCase().replace(/\s+/g, '_');
}

function toLabel(status: string | null | undefined): string {
  if (!status) return 'Pending';
  return status
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function StatusPill({ status, children }: StatusPillProps) {
  const normalized = normalizeStatus(status);
  const tone = toneClasses[normalized] ?? toneClasses.pending;

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${tone}`}>
      {children ?? toLabel(status)}
    </span>
  );
}
