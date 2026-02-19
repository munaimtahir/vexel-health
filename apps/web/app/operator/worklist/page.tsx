'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { client } from '@/lib/sdk/client';
import { parseApiError } from '@/lib/api-errors';
import { operatorRoutes } from '@/lib/operator/routes';
import { operatorKeys } from '@/lib/sdk/hooks';
import { WorklistTable, type WorklistRow } from '@/components/operator/WorklistTable';
import type { paths } from '@vexel/contracts';

type EncountersResponse =
  paths['/encounters']['get']['responses'][200]['content']['application/json'];
type Encounter = NonNullable<NonNullable<EncountersResponse['data']>[number]>;

export default function OperatorWorklistPage() {
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');

  const { data, isLoading, error } = useQuery({
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
      return res as EncountersResponse;
    },
  });

  const encounters = (data?.data ?? []) as Encounter[];
  const rows: WorklistRow[] = encounters.map((enc) => ({
    encounterId: enc.id,
    regNo: '—',
    patientName: '—',
    encounterCode: enc.encounterCode ?? '—',
    status: enc.labEncounterStatus ?? enc.status,
    updated: enc.createdAt ? new Date(enc.createdAt).toLocaleString() : '—',
  }));

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
        <p className="text-red-600">{error instanceof Error ? error.message : 'Error loading worklist'}</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-2 text-[var(--text)]">Worklist</h2>
      <p className="text-sm text-[var(--muted)] mb-4">Lab encounters with current status from backend.</p>
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
          placeholder="Search by name or Reg # (TODO: wire to API if supported)"
          className="max-w-md rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        />
        <button type="submit" className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] hover:opacity-90 transition">
          Search
        </button>
      </form>
      <WorklistTable
        rows={rows}
        detailHref={operatorRoutes.worklistDetail}
        emptyMessage="No encounters found."
      />
    </div>
  );
}
