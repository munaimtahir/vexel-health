'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import type { paths } from '@vexel/contracts';
import { client } from '@/lib/api';
import { parseApiError } from '@/lib/api-errors';

type Encounter =
  paths['/encounters/{id}']['get']['responses'][200]['content']['application/json'];
type Patient =
  paths['/patients/{id}']['get']['responses'][200]['content']['application/json'];

export default function EncounterDetailPage() {
  const params = useParams<{ encounterId: string }>();
  const encounterId = typeof params.encounterId === 'string' ? params.encounterId : '';

  const {
    data: encounter,
    isLoading: encounterLoading,
    error: encounterError,
  } = useQuery<Encounter>({
    queryKey: ['encounter', encounterId],
    enabled: Boolean(encounterId),
    queryFn: async () => {
      const { data, error } = await client.GET('/encounters/{id}', {
        params: {
          path: { id: encounterId },
        },
      });

      if (error) {
        throw new Error(parseApiError(error, 'Failed to load encounter').message);
      }

      if (!data) {
        throw new Error('Encounter not found');
      }

      return data;
    },
  });

  const {
    data: patient,
    isLoading: patientLoading,
    error: patientError,
  } = useQuery<Patient>({
    queryKey: ['encounter-patient', encounter?.patientId],
    enabled: Boolean(encounter?.patientId),
    queryFn: async () => {
      const { data, error } = await client.GET('/patients/{id}', {
        params: {
          path: { id: encounter!.patientId },
        },
      });

      if (error) {
        throw new Error(parseApiError(error, 'Failed to load patient').message);
      }

      if (!data) {
        throw new Error('Patient not found');
      }

      return data;
    },
  });

  if (encounterLoading) {
    return <div className="p-8">Loading encounter...</div>;
  }

  if (encounterError || !encounter) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Encounter Not Found</h1>
        <p className="text-gray-600 mb-4">
          {encounterError instanceof Error
            ? encounterError.message
            : 'This encounter could not be loaded.'}
        </p>
        <div className="flex gap-4">
          <Link href="/encounters/new" className="text-blue-600 underline">
            Create encounter
          </Link>
          <Link href="/patients" className="text-blue-600 underline">
            Back to patients
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Encounter Detail</h1>
        <Link href="/patients" className="text-blue-600 underline">
          Back to patients
        </Link>
      </div>

      {patientError && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-red-700">
          {patientError instanceof Error
            ? patientError.message
            : 'Failed to load patient details'}
        </div>
      )}

      <div className="rounded border bg-white p-6 shadow">
        <div className="grid grid-cols-1 gap-4 text-sm">
          <p>
            <span className="font-semibold">Patient:</span> {patient?.name ?? '-'}
          </p>
          <p>
            <span className="font-semibold">Reg No:</span>{' '}
            {patientLoading ? 'Loading...' : patient?.regNo ?? '-'}
          </p>
          <p>
            <span className="font-semibold">Encounter Code:</span>{' '}
            {encounter.encounterCode}
          </p>
          <p>
            <span className="font-semibold">Status:</span> {encounter.status}
          </p>
          <p>
            <span className="font-semibold">Type:</span> {encounter.type}
          </p>
          <p>
            <span className="font-semibold">Created:</span>{' '}
            {encounter.createdAt
              ? new Date(encounter.createdAt).toLocaleString()
              : '-'}
          </p>
        </div>
      </div>
    </div>
  );
}
