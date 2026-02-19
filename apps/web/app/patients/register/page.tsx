'use client';

import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { client } from '@/lib/api';
import { useState, useRef, useCallback, useEffect } from 'react';
import { parseApiError, type FieldErrors } from '@/lib/api-errors';
import type { paths } from '@vexel/contracts';

type PatientForm = {
    name: string;
    dob: string;
    gender: 'male' | 'female' | 'other';
    phone: string;
};

type PatientsResponse = paths['/patients']['get']['responses'][200]['content']['application/json'];
type Patient = NonNullable<PatientsResponse['data']>[number];

export default function RegisterPatientPage() {
    const router = useRouter();
    const { register, handleSubmit, setValue, formState: { errors } } = useForm<PatientForm>();
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [successMessage, setSuccessMessage] = useState('');

    const [mobileInput, setMobileInput] = useState('');
    const [searchResults, setSearchResults] = useState<Patient[] | null>(null);
    const [searching, setSearching] = useState(false);
    const [popoverOpen, setPopoverOpen] = useState(false);
    const mobileContainerRef = useRef<HTMLDivElement>(null);
    const fullNameInputRef = useRef<HTMLInputElement>(null);

    const focusFullName = useCallback(() => {
        setPopoverOpen(false);
        setSearchResults(null);
        setTimeout(() => fullNameInputRef.current?.focus(), 0);
    }, []);

    useEffect(() => {
        if (!popoverOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (mobileContainerRef.current && !mobileContainerRef.current.contains(e.target as Node)) {
                setPopoverOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [popoverOpen]);

    const searchByMobile = useCallback(async () => {
        const trimmed = mobileInput.trim();
        if (!trimmed) return;

        setSearching(true);
        setSearchResults(null);
        setPopoverOpen(false);

        const { data, error: apiError } = await client.GET('/patients', {
            params: { query: { query: trimmed } },
        });

        setSearching(false);

        if (apiError || !data) {
            setError('Failed to search. Please try again.');
            return;
        }

        const list = data.data ?? [];

        if (list.length === 0) {
            setValue('phone', trimmed);
            focusFullName();
            return;
        }

        setValue('phone', trimmed);
        setSearchResults(list);
        setPopoverOpen(true);
    }, [mobileInput, setValue, focusFullName]);

    const handleMobileKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            searchByMobile();
        }
    };

    const handleSelectPatient = (patient: Patient) => {
        const id = patient.id ?? '';
        if (id) router.push(`/patients/${id}`);
    };

    const handleMakeNewEntry = () => {
        setValue('phone', mobileInput.trim());
        focusFullName();
    };

    const onSubmit = async (data: PatientForm) => {
        setError('');
        setFieldErrors({});
        setSuccessMessage('');

        const phone = data.phone || mobileInput.trim();
        const { data: created, error: apiError } = await client.POST('/patients', {
            body: { ...data, phone },
        });

        if (apiError) {
            const parsed = parseApiError(apiError, 'Failed to register patient');
            setError(parsed.message);
            setFieldErrors(parsed.fieldErrors);
            return;
        }

        if (!created) {
            setError('Failed to register patient');
            return;
        }

        setSuccessMessage(`Patient registered. Reg #: ${created.regNo ?? '—'}`);
        if (created.id) {
            setTimeout(() => router.push(`/patients/${created.id}`), 800);
        }
    };

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Register Patient</h1>
            {error && (
                <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-red-700" role="alert">
                    {error}
                </div>
            )}
            {successMessage && (
                <div className="mb-4 rounded border border-green-200 bg-green-50 p-3 text-green-800" role="status">
                    {successMessage} Redirecting to patient detail…
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-white p-6 shadow rounded">
                <div ref={mobileContainerRef} className="relative">
                    <label className="block text-sm font-medium">Mobile number</label>
                    <input
                        type="tel"
                        value={mobileInput}
                        onChange={(e) => setMobileInput(e.target.value)}
                        onKeyDown={handleMobileKeyDown}
                        placeholder="Enter mobile number and press Enter to search"
                        className="mt-1 block w-full border border-gray-300 rounded p-2"
                        autoComplete="tel"
                    />
                    {searching && (
                        <p className="mt-1 text-sm text-gray-500">Searching…</p>
                    )}
                    {popoverOpen && searchResults && searchResults.length > 0 && (
                        <div
                            className="absolute z-10 mt-1 w-full rounded border border-gray-200 bg-white shadow-lg max-h-64 overflow-y-auto"
                            role="listbox"
                        >
                            {searchResults.map((patient) => (
                                <button
                                    key={patient.id ?? `${patient.name}-${patient.regNo}`}
                                    type="button"
                                    role="option"
                                    className="w-full text-left px-3 py-2.5 border-b border-gray-100 hover:bg-gray-50 flex justify-between items-center"
                                    onClick={() => handleSelectPatient(patient)}
                                >
                                    <span className="font-medium text-gray-900">{patient.name ?? '—'}</span>
                                    <span className="text-sm text-gray-500">Reg No: {patient.regNo ?? '—'}</span>
                                </button>
                            ))}
                            <button
                                type="button"
                                role="option"
                                className="w-full text-left px-3 py-2.5 text-blue-600 hover:bg-blue-50 font-medium"
                                onClick={handleMakeNewEntry}
                            >
                                + Make new entry
                            </button>
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium">Full Name</label>
                    <input
                        {...register('name', { required: true })}
                        ref={(el) => {
                            register('name').ref(el);
                            fullNameInputRef.current = el;
                        }}
                        className="mt-1 block w-full border border-gray-300 rounded p-2"
                    />
                    {errors.name && <span className="text-red-500 text-sm">Required</span>}
                    {fieldErrors.name?.map((message) => (
                        <span key={message} className="text-red-500 text-sm block">{message}</span>
                    ))}
                </div>

                <div>
                    <label className="block text-sm font-medium">Date of Birth</label>
                    <input
                        type="date"
                        {...register('dob', { required: true })}
                        className="mt-1 block w-full border border-gray-300 rounded p-2"
                    />
                    {errors.dob && <span className="text-red-500 text-sm">Required</span>}
                    {fieldErrors.dob?.map((message) => (
                        <span key={message} className="text-red-500 text-sm block">{message}</span>
                    ))}
                </div>

                <div>
                    <label className="block text-sm font-medium">Gender</label>
                    <select
                        {...register('gender', { required: true })}
                        className="mt-1 block w-full border border-gray-300 rounded p-2"
                    >
                        <option value="">Select...</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                    </select>
                    {errors.gender && <span className="text-red-500 text-sm">Required</span>}
                    {fieldErrors.gender?.map((message) => (
                        <span key={message} className="text-red-500 text-sm block">{message}</span>
                    ))}
                </div>

                <input type="hidden" {...register('phone')} />

                <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                >
                    Register
                </button>
            </form>
        </div>
    );
}
