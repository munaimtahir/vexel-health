'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { client } from '@/lib/sdk/client';
import { parseApiError } from '@/lib/api-errors';
import { operatorRoutes } from '@/lib/operator/routes';
import { EncounterHeader } from '@/components/operator/EncounterHeader';
import { mapIdentityHeader } from '@/lib/identity/mapIdentity';
import type { paths } from '@vexel/contracts';

type Encounter = paths['/encounters/{id}']['get']['responses'][200]['content']['application/json'];
type Patient = paths['/patients/{id}']['get']['responses'][200]['content']['application/json'];
type EncounterPrepResponse =
  paths['/encounters/{id}/prep']['get']['responses'][200]['content']['application/json'];
type UpdateEncounterPrepCommandRequest =
  NonNullable<
    paths['/lims/commands/updateEncounterPrep']['post']['requestBody']
  >['content']['application/json'];

export default function OperatorSamplesDetailPage() {
  const params = useParams<{ encounterId: string }>();
  const encounterId = typeof params?.encounterId === 'string' ? params.encounterId : '';
  const queryClient = useQueryClient();

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

  const { data: patient } = useQuery({
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

  const { data: prep, isLoading: prepLoading, refetch: refetchPrep } = useQuery({
    queryKey: ['encounter-prep', encounterId],
    enabled: !!encounterId,
    queryFn: async () => {
      const { data, error } = await client.GET('/encounters/{id}/prep', {
        params: { path: { id: encounterId } },
      });
      if (error) throw new Error(parseApiError(error, 'Failed to load prep details').message);
      if (!data) throw new Error('Prep details not found');
      return data as EncounterPrepResponse;
    },
  });

  const markCollectedReceived = useMutation({
    mutationFn: async () => {
      if (!encounter) {
        throw new Error('Encounter not loaded');
      }
      const timestamp = new Date().toISOString();
      const body: UpdateEncounterPrepCommandRequest = {
        encounter_id: encounter.id,
        prep: {
          sample_collected_at: timestamp,
          sample_received_at: timestamp,
          notes: 'Collected and received at same branch',
        },
      };
      const { error } = await client.POST('/lims/commands/updateEncounterPrep', {
        body,
      });
      if (error) {
        throw new Error(parseApiError(error, 'Failed to mark sample').message);
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['encounter', encounterId] }),
        refetchPrep(),
      ]);
    },
  });

  const identityProps = mapIdentityHeader({
    patient: patient as unknown as Record<string, unknown>,
    encounter: encounter as unknown as Record<string, unknown>,
  });
  const status = encounter?.labEncounterStatus ?? encounter?.status ?? null;
  const collectedAt = prep?.labPrep?.collectedAt
    ? new Date(prep.labPrep.collectedAt).toLocaleString()
    : '—';
  const receivedAt = prep?.labPrep?.receivedAt
    ? new Date(prep.labPrep.receivedAt).toLocaleString()
    : '—';
  const prepUpdatedAt = prep?.updatedAt ? new Date(prep.updatedAt).toLocaleString() : '—';

  if (encLoading || !encounterId) {
    return <div><p className="text-gray-500">Loading encounter…</p></div>;
  }

  if (encError || !encounter) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4">Encounter not found</h1>
        <p className="text-red-600">{encError instanceof Error ? encError.message : 'Not found'}</p>
        <Link href={operatorRoutes.samples} className="mt-4 inline-block text-blue-600 hover:underline">Back to samples</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Samples · Encounter</h1>
        <Link href={operatorRoutes.samples} className="text-blue-600 hover:underline">Back to samples</Link>
      </div>
      <div className="mb-6">
        <EncounterHeader {...identityProps} status={status} />
      </div>
      <div className="rounded border bg-white p-6 shadow">
        <h2 className="text-lg font-semibold mb-3">Sample collection / receiving controls</h2>
        <p className="text-sm text-gray-600 mb-4">
          Single-branch flow: when phlebotomist marks sample, collected and received are set together.
        </p>
        <div className="mb-4 grid grid-cols-1 gap-2 text-sm text-gray-700">
          <p><span className="font-semibold">Collected At:</span> {prepLoading ? 'Loading…' : collectedAt}</p>
          <p><span className="font-semibold">Received At:</span> {prepLoading ? 'Loading…' : receivedAt}</p>
          <p><span className="font-semibold">Prep Updated:</span> {prepLoading ? 'Loading…' : prepUpdatedAt}</p>
        </div>
        <button
          type="button"
          onClick={() => markCollectedReceived.mutate()}
          disabled={markCollectedReceived.isPending || encounter.type !== 'LAB'}
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {markCollectedReceived.isPending ? 'Marking…' : 'Mark Collected = Received'}
        </button>
        {markCollectedReceived.isSuccess && (
          <p className="mt-3 text-sm text-green-700">
            Sample marked as collected and received.
          </p>
        )}
        {markCollectedReceived.isError && (
          <p className="mt-3 text-sm text-red-600">
            {markCollectedReceived.error instanceof Error
              ? markCollectedReceived.error.message
              : 'Failed to mark sample'}
          </p>
        )}
      </div>
    </div>
  );
}
