'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { client } from '@/lib/sdk/client';
import { parseApiError } from '@/lib/api-errors';
import { operatorRoutes } from '@/lib/operator/routes';
import { operatorKeys } from '@/lib/sdk/hooks';
import { WorklistTable, type WorklistRow } from '@/components/operator/WorklistTable';
import { fetchPatientDisplayLookup } from '@/lib/operator/patient-lookup';
import type { paths } from '@vexel/contracts';

type EncountersResponse =
  paths['/encounters']['get']['responses'][200]['content']['application/json'];
type Encounter = NonNullable<NonNullable<EncountersResponse['data']>[number]>;

export default function OperatorWorklistPage() {
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');

  const { data: rows, isLoading, error } = useQuery({
    queryKey: operatorKeys.encounterList({ type: 'LAB' }),
    queryFn: async () => {
      const { data: res, error: apiError } = await client.GET('/encounters', {
        params: {
          query: {
            type: 'LAB',
          },
        },
      });
      if (apiError) {
        throw new Error(parseApiError(apiError, 'Failed to load worklist').message);
      }
      const encounters = ((res as EncountersResponse)?.data ?? []) as Encounter[];
      const patientLookup = await fetchPatientDisplayLookup(
        encounters.map((enc) => enc.patientId),
      );

      return encounters.map((enc) => {
        const patient = patientLookup[enc.patientId] ?? { name: '—', regNo: '—' };
        return {
          encounterId: enc.id,
          regNo: patient.regNo,
          patientName: patient.name,
          encounterCode: enc.encounterCode ?? '—',
          status: enc.labEncounterStatus ?? enc.status,
          updated: enc.createdAt ? new Date(enc.createdAt).toLocaleString() : '—',
        } satisfies WorklistRow;
      });
    },
  });

  const filteredRows = (rows ?? []).filter((row) => {
    if (!query.trim()) {
      return true;
    }
    const needle = query.trim().toLowerCase();
    return (
      row.patientName.toLowerCase().includes(needle) ||
      row.regNo.toLowerCase().includes(needle) ||
      row.encounterCode.toLowerCase().includes(needle)
    );
  });

  if (isLoading) {
    return (
      <div>
        <h2 className="text-xl font-bold mb-2 text-[var(--text)]">Worklist</h2>
        <p className="text-[var(--muted)]">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h2 className="text-xl font-bold mb-2 text-[var(--text)]">Worklist</h2>
        <p className="text-[var(--error)]">{error instanceof Error ? error.message : 'Error loading worklist'}</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-2 text-[var(--text)]">Worklist</h2>
      <p className="text-sm text-[var(--muted)] mb-4">
        Cross-stage visibility for LAB encounters, useful for supervisor follow-up.
      </p>
      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(searchInput.trim());
        }}
      >
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by patient, Reg #, or encounter code"
          className="max-w-md rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        />
        <button type="submit" className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] hover:opacity-90 transition">
          Search
        </button>
      </form>
      <WorklistTable
        rows={filteredRows}
        detailHref={operatorRoutes.worklistDetail}
        emptyMessage="No encounters found."
      />
    </div>
  );
}
