'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { client } from '@/lib/sdk/client';
import { parseApiError } from '@/lib/api-errors';
import { operatorRoutes } from '@/lib/operator/routes';
import { operatorKeys } from '@/lib/sdk/hooks';
import { EncounterHeader } from '@/components/operator/EncounterHeader';
import { StatusPill } from '@/components/operator/StatusPill';
import { mapIdentityHeader } from '@/lib/identity/mapIdentity';
import type { paths } from '@vexel/contracts';

type Encounter = paths['/encounters/{id}']['get']['responses'][200]['content']['application/json'];
type Patient = paths['/patients/{id}']['get']['responses'][200]['content']['application/json'];
type EncounterLabTestsResponse =
  paths['/encounters/{id}/lab-tests']['get']['responses'][200]['content']['application/json'];
type OrderedTest = EncounterLabTestsResponse['data'][number];
type EnterLabResultsRequest =
  NonNullable<
    paths['/encounters/{id}:lab-enter-results']['post']['requestBody']
  >['content']['application/json'];

type ResultDraftMap = Record<string, Record<string, string>>;

function formatReferenceRange(orderedTest: OrderedTest, parameterId: string): string {
  const parameter = orderedTest.parameters.find((item) => item.id === parameterId);
  if (!parameter) {
    return '—';
  }
  if (parameter.refText && parameter.refText.trim().length > 0) {
    return parameter.refText;
  }
  const low = parameter.refLow;
  const high = parameter.refHigh;
  if (low == null && high == null) {
    return '—';
  }
  if (low != null && high != null) {
    return `${low} - ${high}`;
  }
  if (low != null) {
    return `>= ${low}`;
  }
  return `<= ${high}`;
}

export default function OperatorResultsEntryDetailPage() {
  const params = useParams<{ encounterId: string }>();
  const encounterId = typeof params?.encounterId === 'string' ? params.encounterId : '';
  const queryClient = useQueryClient();

  const [resultDrafts, setResultDrafts] = useState<ResultDraftMap>({});
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [savingDraftOrderItemId, setSavingDraftOrderItemId] = useState<string | null>(null);
  const [submittingOrderItemId, setSubmittingOrderItemId] = useState<string | null>(null);

  const draftStorageKey = useMemo(
    () => `operator.result-entry.drafts.${encounterId}`,
    [encounterId],
  );

  const { data: encounter, isLoading: encLoading, error: encError } = useQuery({
    queryKey: ['encounter', encounterId],
    enabled: !!encounterId,
    queryFn: async () => {
      const { data, error } = await client.GET('/encounters/{id}', {
        params: { path: { id: encounterId } },
      });
      if (error) {
        throw new Error(parseApiError(error, 'Failed to load encounter').message);
      }
      if (!data) {
        throw new Error('Encounter not found');
      }
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
      if (error) {
        throw new Error(parseApiError(error, 'Failed to load patient').message);
      }
      return data as Patient;
    },
  });

  const {
    data: encounterLabTests,
    isLoading: testsLoading,
    error: testsError,
    refetch: refetchEncounterLabTests,
  } = useQuery({
    queryKey: ['encounter-lab-tests', encounterId],
    enabled: !!encounterId,
    queryFn: async () => {
      const { data, error } = await client.GET('/encounters/{id}/lab-tests', {
        params: { path: { id: encounterId } },
      });
      if (error) {
        throw new Error(parseApiError(error, 'Failed to load ordered tests').message);
      }
      return (data ?? { data: [], total: 0 }) as EncounterLabTestsResponse;
    },
  });

  const orderedTests = encounterLabTests?.data ?? [];

  useEffect(() => {
    if (!orderedTests.length) {
      return;
    }

    let localDrafts: ResultDraftMap = {};
    if (typeof window !== 'undefined') {
      try {
        const saved = window.localStorage.getItem(draftStorageKey);
        if (saved) {
          localDrafts = JSON.parse(saved) as ResultDraftMap;
        }
      } catch {
        localDrafts = {};
      }
    }

    setResultDrafts((previous) => {
      const nextDrafts: ResultDraftMap = { ...previous };

      for (const orderedTest of orderedTests) {
        const existingDraft = nextDrafts[orderedTest.orderItem.id] ?? {};
        const fromLocal = localDrafts[orderedTest.orderItem.id] ?? {};
        const resultByParameterId = new Map(
          orderedTest.results.map((result) => [result.parameterId, result.value]),
        );

        const mergedDraft: Record<string, string> = {};
        for (const parameter of orderedTest.parameters) {
          if (existingDraft[parameter.id] !== undefined) {
            mergedDraft[parameter.id] = existingDraft[parameter.id];
            continue;
          }
          if (fromLocal[parameter.id] !== undefined) {
            mergedDraft[parameter.id] = fromLocal[parameter.id];
            continue;
          }
          mergedDraft[parameter.id] = resultByParameterId.get(parameter.id) ?? '';
        }

        nextDrafts[orderedTest.orderItem.id] = mergedDraft;
      }

      return nextDrafts;
    });
  }, [orderedTests, draftStorageKey]);

  useEffect(() => {
    if (!encounterId || typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(draftStorageKey, JSON.stringify(resultDrafts));
  }, [encounterId, draftStorageKey, resultDrafts]);

  const identityProps = mapIdentityHeader({
    patient: patient as unknown as Record<string, unknown>,
    encounter: encounter as unknown as Record<string, unknown>,
  });
  const status = encounter?.labEncounterStatus ?? encounter?.status ?? null;
  const readyForVerification = orderedTests.length > 0 &&
    orderedTests.every(
      (item) =>
        item.orderItem.status === 'RESULTS_ENTERED' ||
        item.orderItem.status === 'VERIFIED',
    );

  if (encLoading || !encounterId) {
    return <div><p className="text-[var(--muted)]">Loading encounter…</p></div>;
  }

  if (encError || !encounter) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4 text-[var(--text)]">Encounter not found</h1>
        <p className="text-[var(--error)]">
          {encError instanceof Error ? encError.message : 'Not found'}
        </p>
        <Link href={operatorRoutes.resultsEntry} className="mt-4 inline-block text-[var(--accent)] hover:underline">
          Back to result entry
        </Link>
      </div>
    );
  }

  if (testsError) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4 text-[var(--text)]">Result entry · Encounter</h1>
        <p className="text-[var(--error)]">
          {testsError instanceof Error ? testsError.message : 'Failed to load ordered tests'}
        </p>
        <Link href={operatorRoutes.resultsEntry} className="mt-4 inline-block text-[var(--accent)] hover:underline">
          Back to result entry
        </Link>
      </div>
    );
  }

  const updateDraftValue = (orderItemId: string, parameterId: string, value: string) => {
    setResultDrafts((previous) => ({
      ...previous,
      [orderItemId]: {
        ...(previous[orderItemId] ?? {}),
        [parameterId]: value,
      },
    }));
  };

  const buildResultItems = (
    orderedTest: OrderedTest,
    mode: 'draft' | 'submit',
  ): EnterLabResultsRequest['results'] => {
    const draftByParameterId = resultDrafts[orderedTest.orderItem.id] ?? {};
    const items = orderedTest.parameters.map((parameter) => ({
      parameterId: parameter.id,
      value: (draftByParameterId[parameter.id] ?? '').trim(),
    }));

    if (mode === 'draft') {
      return items.filter((item) => item.value.length > 0);
    }

    return items;
  };

  const saveDraft = async (orderedTest: OrderedTest) => {
    if (orderedTest.orderItem.status === 'VERIFIED') {
      setActionError('Results are locked after verification.');
      return;
    }

    const resultItems = buildResultItems(orderedTest, 'draft');
    if (resultItems.length === 0) {
      setActionError('Enter at least one value before saving draft.');
      setActionSuccess('');
      return;
    }

    setActionError('');
    setActionSuccess('');
    setSavingDraftOrderItemId(orderedTest.orderItem.id);

    const body: EnterLabResultsRequest = {
      orderItemId: orderedTest.orderItem.id,
      results: resultItems,
    };

    const { error } = await client.POST('/encounters/{id}:lab-enter-results', {
      params: { path: { id: encounter.id } },
      body,
    });

    setSavingDraftOrderItemId(null);

    if (error) {
      setActionError(parseApiError(error, 'Failed to save draft').message);
      return;
    }

    setActionSuccess(`Draft saved for ${orderedTest.test.name}.`);
    await Promise.all([
      refetchEncounterLabTests(),
      queryClient.invalidateQueries({ queryKey: operatorKeys.resultEntryQueue() }),
    ]);
  };

  const submitForVerification = async (orderedTest: OrderedTest) => {
    if (orderedTest.orderItem.status === 'VERIFIED') {
      setActionError('Results are already verified.');
      return;
    }

    const resultItems = buildResultItems(orderedTest, 'submit');
    const missingCount = resultItems.filter((item) => item.value.length === 0).length;
    if (missingCount > 0) {
      setActionError('Fill all parameter values before submitting for verification.');
      setActionSuccess('');
      return;
    }

    setActionError('');
    setActionSuccess('');
    setSubmittingOrderItemId(orderedTest.orderItem.id);

    const body: EnterLabResultsRequest = {
      orderItemId: orderedTest.orderItem.id,
      results: resultItems,
    };

    const { error } = await client.POST('/encounters/{id}:lab-enter-results', {
      params: { path: { id: encounter.id } },
      body,
    });

    setSubmittingOrderItemId(null);

    if (error) {
      setActionError(parseApiError(error, 'Failed to submit results').message);
      return;
    }

    setActionSuccess(`Results submitted for ${orderedTest.test.name}.`);
    await Promise.all([
      refetchEncounterLabTests(),
      queryClient.invalidateQueries({ queryKey: operatorKeys.resultEntryQueue() }),
      queryClient.invalidateQueries({ queryKey: operatorKeys.verificationQueue() }),
    ]);
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text)]">Result Entry · Encounter</h1>
        <Link href={operatorRoutes.resultsEntry} className="text-[var(--accent)] hover:underline">
          Back to result entry
        </Link>
      </div>
      <div className="mb-6">
        <EncounterHeader {...identityProps} status={status} />
      </div>

      {actionError && (
        <div className="mb-4 rounded border border-[var(--error-border)] bg-[var(--error-bg)] p-3 text-sm text-[var(--error)]">
          {actionError}
        </div>
      )}
      {actionSuccess && (
        <div className="mb-4 rounded border border-[var(--success-border)] bg-[var(--success-bg)] p-3 text-sm text-[var(--success)]">
          {actionSuccess}
        </div>
      )}

      <div className="rounded border border-[var(--border)] bg-[var(--surface)] p-6 shadow space-y-4">
        <h2 className="text-lg font-semibold text-[var(--text)]">Result entry table</h2>
        <p className="text-sm text-[var(--muted)]">
          Save Draft stores partial values. Submit for Verification requires all parameters and moves
          test status to RESULTS_ENTERED.
        </p>

        {testsLoading ? (
          <p className="text-sm text-[var(--muted)]">Loading ordered tests…</p>
        ) : orderedTests.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No ordered tests found for this encounter.</p>
        ) : (
          <div className="space-y-5">
            {orderedTests.map((orderedTest) => (
              <div key={orderedTest.orderItem.id} className="rounded-lg border border-[var(--border)] p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--text)]">
                      {orderedTest.test.name} ({orderedTest.test.code})
                    </p>
                    <p className="text-xs text-[var(--muted)]">{orderedTest.test.department}</p>
                  </div>
                  <StatusPill status={orderedTest.orderItem.status} />
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-[var(--bg)]">
                        <th className="border border-[var(--border)] px-3 py-2 text-left font-semibold text-[var(--text)]">Parameter</th>
                        <th className="border border-[var(--border)] px-3 py-2 text-left font-semibold text-[var(--text)]">Unit</th>
                        <th className="border border-[var(--border)] px-3 py-2 text-left font-semibold text-[var(--text)]">Reference</th>
                        <th className="border border-[var(--border)] px-3 py-2 text-left font-semibold text-[var(--text)]">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderedTest.parameters.map((parameter) => (
                        <tr key={parameter.id} className="bg-[var(--surface)]">
                          <td className="border border-[var(--border)] px-3 py-2 text-[var(--text)]">{parameter.name}</td>
                          <td className="border border-[var(--border)] px-3 py-2 text-[var(--text)]">{parameter.unit ?? '—'}</td>
                          <td className="border border-[var(--border)] px-3 py-2 text-[var(--text)]">
                            {formatReferenceRange(orderedTest, parameter.id)}
                          </td>
                          <td className="border border-[var(--border)] px-3 py-2">
                            <input
                              type="text"
                              value={resultDrafts[orderedTest.orderItem.id]?.[parameter.id] ?? ''}
                              onChange={(event) =>
                                updateDraftValue(
                                  orderedTest.orderItem.id,
                                  parameter.id,
                                  event.target.value,
                                )
                              }
                              disabled={orderedTest.orderItem.status === 'VERIFIED'}
                              className="w-full rounded border border-[var(--border)] px-2 py-1.5 text-sm text-[var(--text)] bg-[var(--surface)] disabled:bg-[var(--bg)] disabled:opacity-50"
                              placeholder="Enter value"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void saveDraft(orderedTest);
                    }}
                    disabled={
                      savingDraftOrderItemId === orderedTest.orderItem.id ||
                      submittingOrderItemId === orderedTest.orderItem.id ||
                      orderedTest.orderItem.status === 'VERIFIED'
                    }
                    className="rounded bg-[var(--muted)] px-3 py-2 text-xs font-medium text-[var(--surface)] hover:opacity-80 disabled:opacity-50"
                  >
                    {savingDraftOrderItemId === orderedTest.orderItem.id
                      ? 'Saving Draft…'
                      : 'Save Draft'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void submitForVerification(orderedTest);
                    }}
                    disabled={
                      savingDraftOrderItemId === orderedTest.orderItem.id ||
                      submittingOrderItemId === orderedTest.orderItem.id ||
                      orderedTest.orderItem.status === 'VERIFIED'
                    }
                    className="rounded bg-[var(--accent)] px-3 py-2 text-xs font-medium text-[var(--accent-foreground)] hover:opacity-90 disabled:opacity-50"
                  >
                    {submittingOrderItemId === orderedTest.orderItem.id
                      ? 'Submitting…'
                      : 'Submit for Verification'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="pt-2">
          {readyForVerification ? (
            <Link
              href={operatorRoutes.verifyDetail(encounterId)}
              className="inline-block rounded bg-[var(--success)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Continue to verification
            </Link>
          ) : (
            <p className="text-sm text-[var(--warning)]">
              Complete result entry for all ordered tests before moving to verification.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
