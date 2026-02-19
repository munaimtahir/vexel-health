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
    <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white/95 shadow-[0_12px_40px_rgba(15,23,42,0.16)]">
      <table className="min-w-full divide-y divide-slate-200/80">
        <thead className="bg-gradient-to-r from-cyan-50 via-emerald-50 to-amber-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
              Reg #
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
              Patient
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
              Visit / Encounter
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
              Updated
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200/70 bg-white">
          {rows.map((row) => (
            <tr key={row.encounterId} className="transition hover:bg-cyan-50/60">
              <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-slate-800">
                {row.regNo || '—'}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">
                {row.patientName || '—'}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">
                {row.encounterCode || '—'}
              </td>
              <td className="whitespace-nowrap px-6 py-4">
                <StatusPill status={row.status} />
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                {row.updated}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm">
                <Link
                  href={detailHref(row.encounterId)}
                  className="font-semibold text-cyan-700 hover:text-cyan-800 hover:underline"
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
                className="px-6 py-8 text-center text-sm text-slate-500"
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
