import { client } from '@/lib/sdk/client';
import type { paths } from '@vexel/contracts';

type PatientResponse =
  paths['/patients/{id}']['get']['responses'][200]['content']['application/json'];

export type PatientDisplay = {
  name: string;
  regNo: string;
};

export async function fetchPatientDisplayLookup(
  patientIds: Array<string | null | undefined>,
): Promise<Record<string, PatientDisplay>> {
  const uniqueIds = Array.from(
    new Set(
      patientIds
        .filter((id): id is string => typeof id === 'string' && id.length > 0),
    ),
  );

  const entries = await Promise.all(
    uniqueIds.map(async (patientId) => {
      try {
        const { data, error } = await client.GET('/patients/{id}', {
          params: { path: { id: patientId } },
        });
        if (error || !data) {
          return [patientId, null] as const;
        }

        const patient = data as PatientResponse;
        return [
          patientId,
          {
            name: patient.name ?? '—',
            regNo: patient.regNo ?? '—',
          },
        ] as const;
      } catch {
        return [patientId, null] as const;
      }
    }),
  );

  const lookup: Record<string, PatientDisplay> = {};
  for (const [patientId, display] of entries) {
    if (display) {
      lookup[patientId] = display;
    }
  }

  return lookup;
}
