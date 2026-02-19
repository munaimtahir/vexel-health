'use client';

import { useQuery } from '@tanstack/react-query';
import { client } from '@/lib/sdk/client';
import { parseApiError } from '@/lib/api-errors';
import { operatorRoutes } from '@/lib/operator/routes';
import { WorklistTable, type WorklistRow } from '@/components/operator/WorklistTable';
import { fetchPatientDisplayLookup } from '@/lib/operator/patient-lookup';
import type { paths } from '@vexel/contracts';

type EncountersResponse =
  paths['/encounters']['get']['responses'][200]['content']['application/json'];
type Encounter = NonNullable<NonNullable<EncountersResponse['data']>[number]>;

export default function OperatorPublishedReportsPage() {
  const { data: rows, isLoading, error } = useQuery({
    queryKey: ['operator', 'reports', 'published'],
    queryFn: async () => {
      const { data: res, error: apiError } = await client.GET('/encounters', {
        params: { query: { type: 'LAB' } },
      });
      if (apiError) {
        throw new Error(parseApiError(apiError, 'Failed to load reports').message);
      }
      const allEncounters = ((res as EncountersResponse)?.data ?? []) as Encounter[];
      const published = allEncounters.filter(
        (enc) => enc.labEncounterStatus === 'PUBLISHED' || enc.status === 'DOCUMENTED'
      );
      const patientLookup = await fetchPatientDisplayLookup(
        published.map((enc) => enc.patientId),
      );

      return published.map((enc) => {
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

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4 text-[var(--text)]">Published reports</h1>
        <p className="text-[var(--muted)]">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4 text-[var(--text)]">Published reports</h1>
        <p className="text-[var(--error)]">{error instanceof Error ? error.message : 'Error loading list'}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4 text-[var(--text)]">Published reports</h1>
      <p className="text-[var(--muted)] mb-4">
        Final stage queue. Contains only encounters with published LAB reports.
      </p>
      <WorklistTable
        rows={rows ?? []}
        detailHref={operatorRoutes.publishedReportDetail}
        emptyMessage="No published reports."
      />
    </div>
  );
}
