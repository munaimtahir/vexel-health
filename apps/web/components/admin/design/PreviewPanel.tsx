'use client';

type PreviewPanelProps = {
  message: string;
};

export function PreviewPanel({ message }: PreviewPanelProps) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg)] p-8 text-center">
      <p className="max-w-sm text-sm text-[var(--muted)]">{message}</p>
    </div>
  );
}
