'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { client } from '@/lib/sdk/client';
import { parseApiError } from '@/lib/api-errors';
import { operatorRoutes } from '@/lib/operator/routes';
import { WorklistTable, type WorklistRow } from '@/components/operator/WorklistTable';
import { operatorKeys } from '@/lib/sdk/hooks';
import type { paths } from '@vexel/contracts';

type VerificationQueueResponse =
  paths['/lab/verification-queue']['get']['responses'][200]['content']['application/json'];
type VerificationQueueItem = NonNullable<VerificationQueueResponse['items']>[number];

export default function OperatorVerifyPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: operatorKeys.verificationQueue(),
    queryFn: async () => {
      const { data: res, error: apiError } = await client.GET('/lab/verification-queue', {
        params: { query: { limit: 50 } },
      });
      if (apiError) {
        throw new Error(parseApiError(apiError, 'Failed to load verification queue').message);
      }
      return res as VerificationQueueResponse;
    },
  });

  const items = data?.items ?? [];
  const rows: WorklistRow[] = items.map((row: VerificationQueueItem) => ({
    encounterId: row.encounter_id ?? '',
    regNo: row.patient?.mrn ?? '—',
    patientName: row.patient?.name ?? '—',
    encounterCode: row.encounter_id ?? '—',
    status: row.derived_encounter_status ?? null,
    updated: row.results_entered_at
      ? new Date(row.results_entered_at).toLocaleString()
      : '—',
  }));

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4 text-[var(--text)]">Verification queue</h1>
        <p className="text-[var(--muted)]">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4 text-[var(--text)]">Verification queue</h1>
        <p className="text-[var(--error)]">{error instanceof Error ? error.message : 'Error loading queue'}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4 text-[var(--text)]">Verification queue</h1>
      <p className="text-[var(--muted)] mb-4">Encounters awaiting verification. Open detail to verify or publish.</p>
      <WorklistTable
        rows={rows}
        detailHref={operatorRoutes.verifyDetail}
        emptyMessage="No items pending verification."
      />
    </div>
  );
}
