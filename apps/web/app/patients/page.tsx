'use client';
import { useQuery } from '@tanstack/react-query';
import { client } from '@/lib/api';
import Link from 'next/link';
import { useState } from 'react';
import type { paths } from '@vexel/contracts';
import { parseApiError } from '@/lib/api-errors';

type PatientsResponse = paths['/patients']['get']['responses'][200]['content']['application/json'];
type Patient = NonNullable<PatientsResponse['data']>[number];

export default function PatientsPage() {
    const [searchInput, setSearchInput] = useState('');
    const [query, setQuery] = useState('');

    const { data, isLoading, error } = useQuery({
        queryKey: ['patients', query],
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

    if (isLoading) return <div className="p-8">Loading patients...</div>;
    if (error) return <div className="p-8 text-red-500">{error instanceof Error ? error.message : 'Error loading patients'}</div>;

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Patients</h1>
                <div className="flex gap-3">
                    <Link
                        href="/encounters/new"
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                        Create Encounter
                    </Link>
                    <Link
                        href="/patients/register"
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                    >
                        Register New
                    </Link>
                </div>
            </div>

            <form
                className="mb-4 flex gap-2"
                onSubmit={(event) => {
                    event.preventDefault();
                    setQuery(searchInput.trim());
                }}
            >
                <input
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Search by patient name or Reg No"
                    className="w-full max-w-md border border-gray-300 rounded p-2"
                />
                <button
                    type="submit"
                    className="bg-gray-900 text-white px-4 py-2 rounded hover:bg-gray-700"
                >
                    Search
                </button>
            </form>

            <div className="bg-white shadow rounded overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reg No</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DOB</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {data?.data?.map((patient: Patient) => (
                            <tr key={patient.id ?? `${patient.name}-${patient.createdAt}`}>
                                <td className="px-6 py-4 whitespace-nowrap">{patient.regNo || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{patient.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{patient.dob ? new Date(patient.dob).toLocaleDateString() : '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap capitalize">{patient.gender || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {patient.id ? (
                                        <Link href={`/encounters/new?patientId=${patient.id}`} className="text-blue-600 underline">
                                            Create encounter
                                        </Link>
                                    ) : (
                                        '-'
                                    )}
                                </td>
                            </tr>
                        ))}
                        {(!data?.data || data.data.length === 0) && (
                            <tr>
                                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">No patients found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
