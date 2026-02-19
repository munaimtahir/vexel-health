'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { client } from '@/lib/api';
import { parseApiError } from '@/lib/api-errors';
import { IdentityHeader } from '@/components/identity/IdentityHeader';
import { mapIdentityHeader } from '@/lib/identity/mapIdentity';
import type { paths } from '@vexel/contracts';

type PatientResponse = paths['/patients/{id}']['get']['responses'][200]['content']['application/json'];
type EncountersResponse = paths['/encounters']['get']['responses'][200]['content']['application/json'];
type Encounter = NonNullable<EncountersResponse['data']>[number];

export default function PatientDetailPage() {
    const params = useParams<{ patientId: string }>();
    const patientId = typeof params.patientId === 'string' ? params.patientId : '';

    const {
        data: patient,
        isLoading: patientLoading,
        error: patientError,
    } = useQuery<PatientResponse>({
        queryKey: ['patient', patientId],
        enabled: Boolean(patientId),
        queryFn: async () => {
            const { data, error } = await client.GET('/patients/{id}', {
                params: { path: { id: patientId } },
            });
            if (error) throw new Error(parseApiError(error, 'Failed to load patient').message);
            if (!data) throw new Error('Patient not found');
            return data;
        },
    });

    const { data: encountersData } = useQuery<EncountersResponse>({
        queryKey: ['encounters', 'patient', patientId],
        enabled: Boolean(patientId),
        queryFn: async () => {
            const { data, error } = await client.GET('/encounters', {
                params: { query: { patientId } },
            });
            if (error) throw new Error(parseApiError(error, 'Failed to load encounters').message);
            return data ?? { data: [], total: 0 };
        },
    });

    const encounters: Encounter[] = encountersData?.data ?? [];

    if (patientLoading) {
        return (
            <div className="p-8">
                <p className="text-gray-600">Loading patient...</p>
            </div>
        );
    }

    if (patientError || !patient) {
        return (
            <div className="p-8 max-w-2xl mx-auto">
                <h1 className="text-2xl font-bold mb-4">Patient Not Found</h1>
                <p className="text-gray-600 mb-4">
                    {patientError instanceof Error ? patientError.message : 'This patient could not be loaded.'}
                </p>
                <Link href="/patients" className="text-blue-600 underline">Back to patients</Link>
            </div>
        );
    }

    const identityProps = mapIdentityHeader({
        patient: patient as unknown as Record<string, unknown>,
    });

    return (
        <div className="p-8 max-w-3xl mx-auto">
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-2xl font-bold">Patient Detail</h1>
                <Link href="/patients" className="text-blue-600 underline">Back to patients</Link>
            </div>

            <div className="mb-6">
                <IdentityHeader {...identityProps} />
            </div>

            <div className="mb-6 flex flex-wrap gap-3">
                <Link
                    href={`/encounters/new?patientId=${patient.id}`}
                    className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                    Create Visit
                </Link>
            </div>

            <div className="rounded border bg-white p-6 shadow">
                <h2 className="text-lg font-semibold mb-4">Encounters</h2>
                {encounters.length === 0 ? (
                    <p className="text-sm text-gray-500">No encounters yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Visit Code</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {encounters.map((enc) => (
                                    <tr key={enc.id}>
                                        <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">{enc.encounterCode ?? '—'}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">{enc.type ?? '—'}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {'labEncounterStatus' in enc && enc.labEncounterStatus
                                                ? enc.labEncounterStatus
                                                : (enc.status ?? '—')}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                            {enc.createdAt ? new Date(enc.createdAt).toLocaleString() : '—'}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <Link href={`/encounters/${enc.id}`} className="text-blue-600 underline">
                                                Open
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
