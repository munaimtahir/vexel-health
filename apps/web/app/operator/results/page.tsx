'use client';

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
type EncounterLabTestsResponse =
  paths['/encounters/{id}/lab-tests']['get']['responses'][200]['content']['application/json'];
type OrderedTest = EncounterLabTestsResponse['data'][number];

export default function OperatorResultsEntryPage() {
  const { data: rows, isLoading, error } = useQuery({
    queryKey: operatorKeys.resultEntryQueue(),
    queryFn: async () => {
      const { data: res, error: apiError } = await client.GET('/encounters', {
        params: { query: { type: 'LAB' } },
      });
      if (apiError) {
        throw new Error(parseApiError(apiError, 'Failed to load result entry queue').message);
      }

      const encounters = ((res as EncountersResponse)?.data ?? []) as Encounter[];
      const resultEntryCandidates = encounters.filter(
        (enc) =>
          enc.prep_complete === true &&
          enc.labEncounterStatus !== 'PUBLISHED' &&
          enc.status !== 'DOCUMENTED',
      );
      const patientLookup = await fetchPatientDisplayLookup(
        resultEntryCandidates.map((enc) => enc.patientId),
      );

      const items = await Promise.all(
        resultEntryCandidates.map(async (enc): Promise<WorklistRow | null> => {
          try {
            const { data, error: testsError } = await client.GET('/encounters/{id}/lab-tests', {
              params: { path: { id: enc.id } },
            });

            if (testsError || !data) {
              return null;
            }

            const orderedTests = (data as EncounterLabTestsResponse).data ?? [];
            if (!orderedTests.length) {
              return null;
            }

            const hasPendingEntry = orderedTests.some(
              (item: OrderedTest) =>
                item.orderItem.status !== 'RESULTS_ENTERED' &&
                item.orderItem.status !== 'VERIFIED',
            );
            if (!hasPendingEntry) {
              return null;
            }

            const patient = patientLookup[enc.patientId] ?? { name: '—', regNo: '—' };
            return {
              encounterId: enc.id,
              regNo: patient.regNo,
              patientName: patient.name,
              encounterCode: enc.encounterCode ?? '—',
              status: 'RECEIVED',
              updated: enc.createdAt ? new Date(enc.createdAt).toLocaleString() : '—',
            } satisfies WorklistRow;
          } catch {
            return null;
          }
        }),
      );

      return items.filter((row): row is WorklistRow => row !== null);
    },
  });

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4 text-[var(--text)]">Result entry</h1>
        <p className="text-[var(--muted)]">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4 text-[var(--text)]">Result entry</h1>
        <p className="text-[var(--error)]">
          {error instanceof Error ? error.message : 'Error loading queue'}
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4 text-[var(--text)]">Result entry</h1>
      <p className="text-[var(--muted)] mb-4">
        Sample received encounters pending results submission for verification.
      </p>
      <WorklistTable
        rows={rows ?? []}
        detailHref={operatorRoutes.resultsEntryDetail}
        emptyMessage="No encounters pending result entry."
      />
    </div>
  );
}
