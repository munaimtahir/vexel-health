'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from '@/lib/sdk/client';
import { parseApiError } from '@/lib/api-errors';
import { operatorRoutes } from '@/lib/operator/routes';
import { EncounterHeader } from '@/components/operator/EncounterHeader';
import { mapIdentityHeader } from '@/lib/identity/mapIdentity';
import { operatorKeys } from '@/lib/sdk/hooks';
import type { paths } from '@vexel/contracts';

type Encounter = paths['/encounters/{id}']['get']['responses'][200]['content']['application/json'];
type Patient = paths['/patients/{id}']['get']['responses'][200]['content']['application/json'];
type ListEncounterLabTestsResponse =
  paths['/encounters/{id}/lab-tests']['get']['responses'][200]['content']['application/json'];
type OrderedTest = ListEncounterLabTestsResponse['data'][number];

export default function OperatorVerifyDetailPage() {
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

  const { data: labTests, isLoading: testsLoading, refetch: refetchLabTests } = useQuery({
    queryKey: ['encounter-lab-tests', encounterId],
    enabled: !!encounterId,
    queryFn: async () => {
      const { data, error } = await client.GET('/encounters/{id}/lab-tests', {
        params: { path: { id: encounterId } },
      });
      if (error) throw new Error(parseApiError(error, 'Failed to load ordered tests').message);
      return (data ?? { data: [], total: 0 }) as ListEncounterLabTestsResponse;
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (orderItemId: string) => {
      const { error } = await client.POST('/encounters/{id}:lab-verify', {
        params: { path: { id: encounterId } },
        body: { orderItemId },
      });
      if (error) throw new Error(parseApiError(error, 'Verification failed').message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['encounter', encounterId] });
      queryClient.invalidateQueries({ queryKey: operatorKeys.verificationQueue() });
      refetchLabTests();
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      const { error } = await client.POST('/encounters/{id}:lab-publish', {
        params: { path: { id: encounterId } },
      });
      if (error) throw new Error(parseApiError(error, 'Publish failed').message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['encounter', encounterId] });
    },
  });

  const identityProps = mapIdentityHeader({
    patient: patient as unknown as Record<string, unknown>,
    encounter: encounter as unknown as Record<string, unknown>,
  });
  const status = encounter?.labEncounterStatus ?? encounter?.status ?? null;
  const orderedTests = labTests?.data ?? [];
  const allVerified = orderedTests.length > 0 && orderedTests.every((item) => item.orderItem.status === 'VERIFIED');

  if (encLoading || !encounterId) {
    return <div><p className="text-[var(--muted)]">Loading encounter…</p></div>;
  }

  if (encError || !encounter) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4 text-[var(--text)]">Encounter not found</h1>
        <p className="text-[var(--error)]">{encError instanceof Error ? encError.message : 'Not found'}</p>
        <Link href={operatorRoutes.verify} className="mt-4 inline-block text-[var(--accent)] hover:underline">Back to verify</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text)]">Verify · Encounter</h1>
        <Link href={operatorRoutes.verify} className="text-[var(--accent)] hover:underline">Back to verify</Link>
      </div>
      <div className="mb-6">
        <EncounterHeader {...identityProps} status={status} />
      </div>
      <div className="rounded border border-[var(--border)] bg-[var(--surface)] p-6 shadow space-y-4">
        <h2 className="text-lg font-semibold text-[var(--text)]">Verification checklist</h2>
        <p className="text-sm text-[var(--muted)]">
          Verify each RESULTS_ENTERED test item. Publish is enabled once all ordered tests are verified.
        </p>
        {testsLoading ? (
          <p className="text-sm text-[var(--muted)]">Loading ordered tests…</p>
        ) : orderedTests.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No ordered tests for this encounter.</p>
        ) : (
          <div className="space-y-3">
            {orderedTests.map((orderedTest: OrderedTest) => (
              <div key={orderedTest.orderItem.id} className="rounded border border-[var(--border)] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-[var(--text)]">
                      {orderedTest.test.name} ({orderedTest.test.code})
                    </p>
                    <p className="text-xs text-[var(--muted)]">{orderedTest.test.department}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-[var(--bg)] px-2 py-1 text-xs font-medium text-[var(--text)]">
                      {orderedTest.orderItem.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => verifyMutation.mutate(orderedTest.orderItem.id)}
                      disabled={
                        verifyMutation.isPending || orderedTest.orderItem.status !== 'RESULTS_ENTERED'
                      }
                      className="rounded bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-[var(--accent-foreground)] hover:opacity-90 disabled:opacity-50"
                    >
                      Verify
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            onClick={() => publishMutation.mutate()}
            disabled={publishMutation.isPending || !allVerified}
            className="rounded bg-[var(--success)] px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
          >
            {publishMutation.isPending ? 'Publishing…' : 'Publish report'}
          </button>
          {!allVerified && (
            <p className="self-center text-sm text-[var(--warning)]">
              Publish is disabled until all ordered tests are verified.
            </p>
          )}
        </div>
        {verifyMutation.isError && (
          <p className="text-sm text-[var(--error)]">{verifyMutation.error instanceof Error ? verifyMutation.error.message : 'Verify failed'}</p>
        )}
        {publishMutation.isError && (
          <p className="text-sm text-[var(--error)]">{publishMutation.error instanceof Error ? publishMutation.error.message : 'Publish failed'}</p>
        )}
      </div>
    </div>
  );
}
