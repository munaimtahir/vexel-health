'use client';

type ToggleFieldProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
};

export function ToggleField({ label, checked, onChange, description }: ToggleFieldProps) {
  return (
    <div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[220px_1fr] sm:gap-4">
      <div>
        <span className="text-sm font-medium text-[var(--muted)]">{label}</span>
        {description ? (
          <p className="mt-0.5 text-xs text-[var(--muted)]">{description}</p>
        ) : null}
      </div>
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
        />
        <span className="text-sm text-[var(--text)]">{checked ? 'On' : 'Off'}</span>
      </label>
    </div>
  );
}
