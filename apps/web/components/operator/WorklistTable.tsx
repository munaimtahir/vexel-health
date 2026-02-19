'use client';

import Link from 'next/link';
import { StatusPill } from './StatusPill';

export type WorklistRow = {
  encounterId: string;
  regNo: string;
  patientName: string;
  encounterCode: string;
  /** Backend status (e.g. labEncounterStatus or status) */
  status: string | null | undefined;
  updated: string;
};

type WorklistTableProps = {
  rows: WorklistRow[];
  detailHref: (encounterId: string) => string;
  emptyMessage?: string;
};

export function WorklistTable({
  rows,
  detailHref,
  emptyMessage = 'No items.',
}: WorklistTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
      <table className="min-w-full divide-y divide-[var(--border)]">
        <thead className="bg-[var(--bg)]">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
              Reg #
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
              Patient
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
              Visit / Encounter
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
              Updated
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)] bg-[var(--surface)]">
          {rows.map((row) => (
            <tr key={row.encounterId} className="hover:bg-[var(--bg)]/60 transition">
              <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-[var(--text)]">
                {row.regNo || '—'}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--text)]">
                {row.patientName || '—'}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--text)]">
                {row.encounterCode || '—'}
              </td>
              <td className="whitespace-nowrap px-6 py-4">
                <StatusPill status={row.status} />
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--muted)]">
                {row.updated}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm">
                <Link
                  href={detailHref(row.encounterId)}
                  className="font-medium text-[var(--accent)] hover:underline"
                >
                  Open
                </Link>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={6}
                className="px-6 py-8 text-center text-sm text-[var(--muted)]"
              >
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
