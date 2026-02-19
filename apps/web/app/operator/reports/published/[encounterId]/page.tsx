'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { client } from '@/lib/sdk/client';
import { parseApiError } from '@/lib/api-errors';
import { operatorRoutes } from '@/lib/operator/routes';
import { EncounterHeader } from '@/components/operator/EncounterHeader';
import { mapIdentityHeader } from '@/lib/identity/mapIdentity';
import type { paths } from '@vexel/contracts';

type Encounter = paths['/encounters/{id}']['get']['responses'][200]['content']['application/json'];
type Patient = paths['/patients/{id}']['get']['responses'][200]['content']['application/json'];

export default function OperatorPublishedReportDetailPage() {
  const params = useParams<{ encounterId: string }>();
  const encounterId = typeof params?.encounterId === 'string' ? params.encounterId : '';
  const [downloadError, setDownloadError] = useState('');

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

  const identityProps = mapIdentityHeader({
    patient: patient as unknown as Record<string, unknown>,
    encounter: encounter as unknown as Record<string, unknown>,
  });
  const status = encounter?.labEncounterStatus ?? encounter?.status ?? null;

  const handleDownload = async () => {
    setDownloadError('');
    const { data: docData, error: publishError } = await client.POST('/encounters/{id}:lab-publish', {
      params: { path: { id: encounterId } },
    });
    if (publishError) {
      setDownloadError(parseApiError(publishError, 'Publish or get document failed').message);
      return;
    }
    const docId = docData && typeof docData === 'object' && 'id' in docData ? (docData as { id: string }).id : null;
    if (!docId) {
      setDownloadError('Document not found. Publish may be required first.');
      return;
    }
    const { data: file, error: fileError } = await client.GET('/documents/{documentId}/file', {
      params: { path: { documentId: docId } },
      parseAs: 'arrayBuffer',
    });
    if (fileError) {
      setDownloadError(parseApiError(fileError, 'Download failed').message);
      return;
    }
    if (file) {
      const blob = new Blob([file], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${encounter?.encounterCode ?? 'report'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (encLoading || !encounterId) {
    return <div><p className="text-[var(--muted)]">Loading…</p></div>;
  }

  if (encError || !encounter) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4 text-[var(--text)]">Report not found</h1>
        <p className="text-[var(--error)]">{encError instanceof Error ? encError.message : 'Not found'}</p>
        <Link href={operatorRoutes.publishedReports} className="mt-4 inline-block text-[var(--accent)] hover:underline">Back to published reports</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text)]">Published report</h1>
        <Link href={operatorRoutes.publishedReports} className="text-[var(--accent)] hover:underline">Back to list</Link>
      </div>
      <div className="mb-6">
        <EncounterHeader {...identityProps} status={status} />
      </div>
      <div className="rounded border border-[var(--border)] bg-[var(--surface)] p-6 shadow space-y-4">
        <h2 className="text-lg font-semibold text-[var(--text)]">PDF viewer / download</h2>
        <p className="text-sm text-[var(--muted)]">
          Download the already published LAB report PDF for this encounter.
        </p>
        <button
          type="button"
          onClick={() => void handleDownload()}
          className="rounded bg-[var(--accent)] px-4 py-2 text-sm text-[var(--accent-foreground)] hover:opacity-90"
        >
          View / Download PDF
        </button>
        {downloadError && <p className="text-sm text-[var(--error)]">{downloadError}</p>}
      </div>
    </div>
  );
}
