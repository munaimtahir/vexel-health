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

export default function OperatorSamplesPage() {
  const { data: rows, isLoading, error } = useQuery({
    queryKey: ['operator', 'samples', 'encounters'],
    queryFn: async () => {
      const { data: res, error: apiError } = await client.GET('/encounters', {
        params: { query: { type: 'LAB' } },
      });
      if (apiError) {
        throw new Error(parseApiError(apiError, 'Failed to load samples list').message);
      }
      const encounters = ((res as EncountersResponse)?.data ?? []) as Encounter[];
      const sampleQueue = encounters.filter((enc) => {
        const labStatus = (enc.labEncounterStatus ?? '').toUpperCase();
        return labStatus === 'ORDERED' && enc.prep_complete !== true;
      });
      const patientLookup = await fetchPatientDisplayLookup(
        sampleQueue.map((enc) => enc.patientId),
      );

      return sampleQueue.map((enc) => {
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
        <h1 className="text-2xl font-bold mb-4">Samples</h1>
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4">Samples</h1>
        <p className="text-red-600">{error instanceof Error ? error.message : 'Error loading list'}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Samples</h1>
      <p className="text-gray-600 mb-4">
        Phlebotomy stage. In this single-branch setup, collected and received are marked together.
      </p>
      <WorklistTable
        rows={rows ?? []}
        detailHref={operatorRoutes.samplesDetail}
        emptyMessage="No encounters pending sample handling."
      />
    </div>
  );
}
