'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { paths } from '@vexel/contracts';
import { client } from '@/lib/api';
import { parseApiError } from '@/lib/api-errors';

type PatientsResponse =
  paths['/patients']['get']['responses'][200]['content']['application/json'];
type Patient = NonNullable<PatientsResponse['data']>[number];
type CreateEncounterRequest =
  paths['/encounters']['post']['requestBody']['content']['application/json'];

const encounterTypes: CreateEncounterRequest['type'][] = [
  'LAB',
  'RAD',
  'OPD',
  'BB',
  'IPD',
];

export default function CreateEncounterPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading encounter form...</div>}>
      <CreateEncounterContent />
    </Suspense>
  );
}

function CreateEncounterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preferredPatientId = searchParams.get('patientId') ?? '';

  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState(preferredPatientId);
  const [encounterType, setEncounterType] =
    useState<CreateEncounterRequest['type']>('LAB');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data, isLoading, error: queryError } = useQuery({
    queryKey: ['encounter-patients', query],
    queryFn: async () => {
      const { data, error: apiError } = await client.GET('/patients', {
        params: {
          query: {
            query: query || undefined,
          },
        },
      });

      if (apiError) {
        throw new Error(parseApiError(apiError, 'Failed to load patients').message);
      }

      return data;
    },
  });

  const patients = useMemo(() => data?.data ?? [], [data]);

  useEffect(() => {
    if (preferredPatientId) {
      setSelectedPatientId((current) => current || preferredPatientId);
    }
  }, [preferredPatientId]);

  const submit = async () => {
    setError('');

    if (!selectedPatientId) {
      setError('Select a patient to continue');
      return;
    }

    setIsSubmitting(true);

    const { data: created, error: apiError } = await client.POST('/encounters', {
      body: {
        patientId: selectedPatientId,
        type: encounterType,
      },
    });

    setIsSubmitting(false);

    if (apiError) {
      setError(parseApiError(apiError, 'Failed to create encounter').message);
      return;
    }

    if (!created?.id) {
      setError('Failed to create encounter');
      return;
    }

    router.push(`/encounters/${created.id}`);
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Create Encounter</h1>
        <Link href="/patients" className="text-blue-600 underline">
          Back to patients
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-red-700">
          {error}
        </div>
      )}
      {queryError && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-red-700">
          {queryError instanceof Error
            ? queryError.message
            : 'Failed to load patients'}
        </div>
      )}

      <div className="rounded border bg-white p-5 shadow space-y-5">
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setQuery(searchInput.trim());
          }}
        >
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search patient by name or Reg No"
            className="w-full border border-gray-300 rounded p-2"
          />
          <button
            type="submit"
            className="rounded bg-gray-900 px-4 py-2 text-white hover:bg-gray-700"
          >
            Search
          </button>
        </form>

        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">Choose patient</p>
          <div className="max-h-64 overflow-y-auto rounded border">
            {isLoading && <p className="p-3 text-sm text-gray-500">Loading patients...</p>}
            {!isLoading && patients.length === 0 && (
              <p className="p-3 text-sm text-gray-500">No patients found.</p>
            )}
            {!isLoading &&
              patients.map((patient: Patient) => (
                <label
                  key={patient.id ?? `${patient.name}-${patient.createdAt}`}
                  className="flex cursor-pointer items-center gap-3 border-b p-3 last:border-b-0"
                >
                  <input
                    type="radio"
                    name="selectedPatient"
                    value={patient.id}
                    checked={selectedPatientId === patient.id}
                    onChange={() => setSelectedPatientId(patient.id ?? '')}
                  />
                  <span className="text-sm">
                    <span className="font-medium">{patient.name}</span>
                    <span className="ml-2 text-gray-500">Reg No: {patient.regNo ?? '-'}</span>
                  </span>
                </label>
              ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Encounter type
          </label>
          <select
            value={encounterType}
            onChange={(event) =>
              setEncounterType(event.target.value as CreateEncounterRequest['type'])
            }
            className="w-full rounded border border-gray-300 p-2"
          >
            {encounterTypes.map((type) => (
              <option value={type} key={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={isSubmitting}
          className="w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Creating...' : 'Create Encounter'}
        </button>
      </div>
    </div>
  );
}
