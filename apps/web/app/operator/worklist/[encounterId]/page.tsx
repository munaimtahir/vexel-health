'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { client } from '@/lib/sdk/client';
import { parseApiError } from '@/lib/api-errors';
import { operatorRoutes } from '@/lib/operator/routes';
import { EncounterHeader } from '@/components/operator/EncounterHeader';
import { mapIdentityHeader } from '@/lib/identity/mapIdentity';
import type { paths } from '@vexel/contracts';

type Encounter = paths['/encounters/{id}']['get']['responses'][200]['content']['application/json'];
type Patient = paths['/patients/{id}']['get']['responses'][200]['content']['application/json'];

export default function OperatorWorklistDetailPage() {
  const params = useParams<{ encounterId: string }>();
  const encounterId = typeof params?.encounterId === 'string' ? params.encounterId : '';

  const { data: encounter, isLoading: encLoading, error: encError } = useQuery({
    queryKey: ['encounter', encounterId],
    enabled: !!encounterId,
    queryFn: async () => {
      const { data, error } = await client.GET('/encounters/{id}', {
        params: { path: { id: encounterId } },
      });
      if (error) throw new Error(parseApiError(error, 'Failed to load encounter').message);
      if (!data) throw new Error('Encounter not found');
      return data as Encounter;
    },
  });

  const { data: patient, isLoading: patientLoading } = useQuery({
    queryKey: ['patient', encounter?.patientId],
    enabled: !!encounter?.patientId,
    queryFn: async () => {
      const { data, error } = await client.GET('/patients/{id}', {
        params: { path: { id: encounter!.patientId } },
      });
      if (error) throw new Error(parseApiError(error, 'Failed to load patient').message);
      return data as Patient;
    },
  });

  const identityProps = mapIdentityHeader({
    patient: patient as unknown as Record<string, unknown>,
    encounter: encounter as unknown as Record<string, unknown>,
  });
  const status = encounter?.labEncounterStatus ?? encounter?.status ?? null;

  if (encLoading || !encounterId) {
    return (
      <div>
        <p className="text-gray-500">Loading encounter…</p>
      </div>
    );
  }

  if (encError || !encounter) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4">Encounter not found</h1>
        <p className="text-red-600">{encError instanceof Error ? encError.message : 'Not found'}</p>
        <Link href={operatorRoutes.worklist} className="mt-4 inline-block text-blue-600 hover:underline">
          Back to worklist
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Worklist · Encounter</h1>
        <Link href={operatorRoutes.worklist} className="text-blue-600 hover:underline">
          Back to worklist
        </Link>
      </div>
      <div className="mb-6">
        <EncounterHeader {...identityProps} status={status} />
      </div>
      {patientLoading && <p className="text-sm text-gray-500">Loading patient…</p>}
      <div className="rounded border bg-white p-6 shadow">
        <h2 className="text-lg font-semibold mb-3">Workflow shortcuts</h2>
        <p className="text-sm text-gray-600 mb-3">
          Open the relevant stage directly for this encounter.
        </p>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href={operatorRoutes.samplesDetail(encounterId)} className="text-blue-600 hover:underline">
            Go to Samples
          </Link>
          <Link href={operatorRoutes.verifyDetail(encounterId)} className="text-blue-600 hover:underline">
            Go to Verify
          </Link>
          <Link href={operatorRoutes.publishedReportDetail(encounterId)} className="text-blue-600 hover:underline">
            Go to Published Report
          </Link>
        </div>
      </div>
    </div>
  );
}
