'use client';

import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { client } from '@/lib/api';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { parseApiError, type FieldErrors } from '@/lib/api-errors';
import type { paths } from '@vexel/contracts';

type PatientForm = {
    name: string;
    dob: string;
    gender: 'male' | 'female' | 'other';
    phone: string;
    fatherOrHusbandName?: string;
    cnic?: string;
    address?: string;
};

type PatientsResponse = paths['/patients']['get']['responses'][200]['content']['application/json'];
type Patient = NonNullable<PatientsResponse['data']>[number];
type CreatedPatient = paths['/patients']['post']['responses'][201]['content']['application/json'];
type CreatedEncounter = paths['/encounters']['post']['responses'][201]['content']['application/json'];
type ListLabTestsResponse = paths['/lab/tests']['get']['responses'][200]['content']['application/json'];
type ListEncounterLabTestsResponse =
    paths['/encounters/{id}/lab-tests']['get']['responses'][200]['content']['application/json'];
type RecordPaymentRequest =
    NonNullable<paths['/encounters/{id}/payments']['post']['requestBody']>['content']['application/json'];
type RecordPaymentResponse =
    paths['/encounters/{id}/payments']['post']['responses'][200]['content']['application/json'];

const MOBILE_INPUT_ID = 'register-mobile';

/** Format as 03xx-1234567 (4 digits, dash, up to 7 digits). Max 11 digits. */
function formatPhoneDisplay(digits: string): string {
    const d = digits.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 4) return d;
    return `${d.slice(0, 4)}-${d.slice(4)}`;
}

/** Extract digits from formatted or raw input. */
function getDigitsFromPhone(value: string): string {
    return value.replace(/\D/g, '');
}

function dobToAge(dob: string): string {
    if (!dob) return '';
    const d = new Date(dob);
    if (Number.isNaN(d.getTime())) return '';
    const today = new Date();
    let years = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) years--;
    return String(years);
}

function ageToDob(ageStr: string): string {
    const age = parseInt(ageStr, 10);
    if (Number.isNaN(age) || age < 0 || age > 150) return '';
    const today = new Date();
    const d = new Date(today.getFullYear() - age, today.getMonth(), today.getDate());
    return d.toISOString().slice(0, 10);
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export default function RegisterPatientPage() {
    const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<PatientForm>();
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [successMessage, setSuccessMessage] = useState('');

    const [registeredPatient, setRegisteredPatient] = useState<CreatedPatient | null>(null);
    const [createdEncounter, setCreatedEncounter] = useState<CreatedEncounter | null>(null);
    const [createEncounterError, setCreateEncounterError] = useState('');
    const [isCreatingEncounter, setIsCreatingEncounter] = useState(false);

    const [mobileInput, setMobileInput] = useState('');
    const [searchResults, setSearchResults] = useState<Patient[] | null>(null);
    const [searching, setSearching] = useState(false);
    const [popoverOpen, setPopoverOpen] = useState(false);
    const [ageInput, setAgeInput] = useState('');

    const [selectedLabTestId, setSelectedLabTestId] = useState('');
    const [isAddingLabTest, setIsAddingLabTest] = useState(false);
    const [isRecordingPayment, setIsRecordingPayment] = useState(false);
    const [paymentError, setPaymentError] = useState('');
    const [paymentSuccess, setPaymentSuccess] = useState('');
    const [billingSnapshot, setBillingSnapshot] = useState<RecordPaymentResponse | null>(null);
    const [paymentForm, setPaymentForm] = useState<{
        amount: string;
        method: RecordPaymentRequest['method'];
        reference: string;
    }>({
        amount: '',
        method: 'CASH',
        reference: '',
    });

    const mobileContainerRef = useRef<HTMLDivElement>(null);
    const mobileInputRef = useRef<HTMLInputElement>(null);
    const formRef = useRef<HTMLFormElement>(null);
    const fullNameInputRef = useRef<HTMLInputElement>(null);

    const dob = watch('dob');

    useEffect(() => {
        if (dob) setAgeInput(dobToAge(dob));
    }, [dob]);

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
        const digits = getDigitsFromPhone(mobileInput);
        if (digits.length < 11) return;

        setSearching(true);
        setSearchResults(null);
        setPopoverOpen(false);

        const { data, error: apiError } = await client.GET('/patients', {
            params: { query: { query: formatPhoneDisplay(digits) } },
        });

        setSearching(false);

        if (apiError || !data) {
            setError('Failed to search. Please try again.');
            return;
        }

        const list = data.data ?? [];

        if (list.length === 0) {
            setValue('phone', formatPhoneDisplay(digits));
            focusFullName();
            return;
        }

        setValue('phone', formatPhoneDisplay(digits));
        setSearchResults(list);
        setPopoverOpen(true);
    }, [mobileInput, setValue, focusFullName]);

    const handleMobileKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            searchByMobile();
            return;
        }
        const digits = getDigitsFromPhone(mobileInput);
        if (e.key === '-') {
            if (digits.length >= 4) {
                e.preventDefault();
                const next = digits.length === 4 ? `${digits}-` : formatPhoneDisplay(digits);
                setMobileInput(next);
                requestAnimationFrame(() => {
                    mobileInputRef.current?.setSelectionRange(5, 5);
                });
            } else {
                e.preventDefault();
            }
            return;
        }
        const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
        if (allowed.includes(e.key)) return;
        if (e.ctrlKey || e.metaKey) return;
        if (/^\d$/.test(e.key)) return;
        e.preventDefault();
    };

    const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        const digits = getDigitsFromPhone(raw).slice(0, 11);
        setMobileInput(formatPhoneDisplay(digits));
    };

    const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
        if (e.key !== 'Enter') return;
        const target = e.target as HTMLElement;
        if (target.id === MOBILE_INPUT_ID) return;
        if (target.tagName === 'TEXTAREA') return;
        if (target.getAttribute('type') === 'submit' || (target.tagName === 'BUTTON' && (target as HTMLButtonElement).type === 'submit')) return;

        e.preventDefault();
        const form = formRef.current;
        if (!form) return;
        const focusable = form.querySelectorAll<HTMLElement>(
            'input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])'
        );
        const list = Array.from(focusable);
        const idx = list.indexOf(target);
        if (idx >= 0 && idx < list.length - 1) {
            list[idx + 1].focus();
        }
    };

    const handleSelectPatient = (patient: Patient) => {
        const id = patient.id ?? '';
        if (id) window.location.href = `/patients/${id}`;
    };

    const handleMakeNewEntry = () => {
        const digits = getDigitsFromPhone(mobileInput);
        setValue('phone', digits.length >= 11 ? formatPhoneDisplay(digits) : mobileInput);
        focusFullName();
    };

    const handleAgeChange = (value: string) => {
        setAgeInput(value);
        const d = ageToDob(value);
        if (d) setValue('dob', d);
    };

    const onSubmit = async (data: PatientForm) => {
        setError('');
        setFieldErrors({});
        setSuccessMessage('');

        const digits = getDigitsFromPhone(data.phone || mobileInput);
        const phone = digits.length >= 11 ? formatPhoneDisplay(digits) : (data.phone || mobileInput);
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
        setRegisteredPatient(created);
    };

    const createEncounter = async () => {
        if (!registeredPatient?.id) return;
        setCreateEncounterError('');
        setPaymentError('');
        setPaymentSuccess('');
        setBillingSnapshot(null);
        setPaymentForm({ amount: '', method: 'CASH', reference: '' });
        setIsCreatingEncounter(true);

        const { data: enc, error: apiError } = await client.POST('/encounters', {
            body: { patientId: registeredPatient.id, type: 'LAB' },
        });

        setIsCreatingEncounter(false);

        if (apiError) {
            setCreateEncounterError(parseApiError(apiError, 'Failed to create encounter').message);
            return;
        }
        if (enc?.id) {
            setCreatedEncounter(enc);
        }
    };

    const { data: labCatalog, isLoading: labCatalogLoading } = useQuery<ListLabTestsResponse>({
        queryKey: ['lab-catalog-tests'],
        enabled: Boolean(createdEncounter?.id),
        queryFn: async () => {
            const { data, error } = await client.GET('/lab/tests');
            if (error) throw new Error(parseApiError(error, 'Failed to load LAB catalog').message);
            return data ?? { data: [], total: 0 };
        },
    });

    const { data: encounterLabTests, refetch: refetchEncounterLabTests } = useQuery<ListEncounterLabTestsResponse>({
        queryKey: ['encounter-lab-tests', createdEncounter?.id],
        enabled: Boolean(createdEncounter?.id),
        queryFn: async () => {
            if (!createdEncounter?.id) return { data: [], total: 0 };
            const { data, error } = await client.GET('/encounters/{id}/lab-tests', {
                params: { path: { id: createdEncounter.id } },
            });
            if (error) throw new Error(parseApiError(error, 'Failed to load ordered tests').message);
            return data ?? { data: [], total: 0 };
        },
    });

    useEffect(() => {
        if (labCatalog?.data?.length && !selectedLabTestId) {
            setSelectedLabTestId(labCatalog.data[0].id);
        }
    }, [labCatalog?.data, selectedLabTestId]);

    const addLabTest = async () => {
        if (!createdEncounter?.id || !selectedLabTestId) return;
        setIsAddingLabTest(true);
        const { error: apiError } = await client.POST('/encounters/{id}:lab-add-test', {
            params: { path: { id: createdEncounter.id } },
            body: { testId: selectedLabTestId },
        });
        setIsAddingLabTest(false);
        if (apiError) {
            setCreateEncounterError(parseApiError(apiError, 'Failed to add test').message);
            return;
        }
        await refetchEncounterLabTests();
    };

    const orderedTests = encounterLabTests?.data ?? [];
    const latestPayment =
        billingSnapshot?.payments && billingSnapshot.payments.length > 0
            ? billingSnapshot.payments[billingSnapshot.payments.length - 1]
            : null;

    const recordPayment = async () => {
        if (!createdEncounter?.id) return;
        setPaymentError('');
        setPaymentSuccess('');

        if (orderedTests.length === 0) {
            setPaymentError('Add at least one test before recording payment.');
            return;
        }

        const amount = Number(paymentForm.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
            setPaymentError('Enter a valid payment amount.');
            return;
        }

        setIsRecordingPayment(true);
        const { data, error: apiError } = await client.POST('/encounters/{id}/payments', {
            params: { path: { id: createdEncounter.id } },
            body: {
                amount,
                method: paymentForm.method,
                reference: paymentForm.reference.trim() || undefined,
            },
        });
        setIsRecordingPayment(false);

        if (apiError) {
            setPaymentError(parseApiError(apiError, 'Failed to record payment').message);
            return;
        }

        if (!data) {
            setPaymentError('Failed to record payment');
            return;
        }

        setBillingSnapshot(data);
        setPaymentForm((previous) => ({ ...previous, amount: '', reference: '' }));
        setPaymentSuccess('Payment recorded. Receipt is ready to print.');
    };

    const printLatestReceipt = () => {
        if (!createdEncounter || !registeredPatient || !billingSnapshot || !latestPayment) {
            setPaymentError('Record a payment before printing receipt.');
            return;
        }

        const orderedItems = orderedTests.map((item) => `${item.test.name} (${item.test.code})`);
        const issuedAt =
            latestPayment.receivedAt && !Number.isNaN(new Date(latestPayment.receivedAt).getTime())
                ? new Date(latestPayment.receivedAt).toLocaleString()
                : new Date().toLocaleString();

        const receiptWindow = window.open('', '_blank', 'width=800,height=900,noopener,noreferrer');
        if (!receiptWindow) {
            setPaymentError('Pop-up blocked. Allow pop-ups to print receipt.');
            return;
        }

        const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Receipt ${escapeHtml(createdEncounter.encounterCode ?? createdEncounter.id)}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 24px; color: #0f172a; }
      .row { display: flex; justify-content: space-between; margin: 6px 0; }
      .card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; margin-top: 14px; }
      h1 { margin: 0 0 4px 0; font-size: 22px; }
      h2 { margin: 0 0 8px 0; font-size: 16px; }
      ul { margin: 6px 0 0 18px; padding: 0; }
      .muted { color: #475569; font-size: 12px; }
      .total { font-weight: 700; font-size: 16px; }
    </style>
  </head>
  <body>
    <h1>Payment Receipt</h1>
    <div class="muted">Generated at ${escapeHtml(new Date().toLocaleString())}</div>
    <div class="card">
      <div class="row"><strong>Patient</strong><span>${escapeHtml(registeredPatient.name ?? '—')}</span></div>
      <div class="row"><strong>Reg #</strong><span>${escapeHtml(registeredPatient.regNo ?? '—')}</span></div>
      <div class="row"><strong>Encounter</strong><span>${escapeHtml(createdEncounter.encounterCode ?? createdEncounter.id)}</span></div>
      <div class="row"><strong>Payment Time</strong><span>${escapeHtml(issuedAt)}</span></div>
      <div class="row"><strong>Method</strong><span>${escapeHtml(latestPayment.method ?? '—')}</span></div>
      <div class="row"><strong>Reference</strong><span>${escapeHtml(latestPayment.reference ?? '—')}</span></div>
    </div>
    <div class="card">
      <h2>Ordered Tests</h2>
      ${orderedItems.length === 0 ? '<div>—</div>' : `<ul>${orderedItems.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}</ul>`}
    </div>
    <div class="card">
      <div class="row total"><span>Amount Received</span><span>${escapeHtml(String(latestPayment.amount ?? 0))}</span></div>
      <div class="row"><span>Invoice Status</span><span>${escapeHtml(billingSnapshot.invoice.status)}</span></div>
      <div class="row"><span>Total Paid</span><span>${escapeHtml(String(billingSnapshot.invoice.paid_amount))}</span></div>
    </div>
  </body>
</html>`;

        receiptWindow.document.open();
        receiptWindow.document.write(html);
        receiptWindow.document.close();
        receiptWindow.focus();
        receiptWindow.print();
    };

    return (
        <div className="p-6 lg:p-8">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">Register Patient</h1>
                <Link href="/patients" className="text-blue-600 underline">
                    Back to patients
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                <div className="lg:col-span-2 space-y-6">
                    {error && (
                        <div className="rounded border border-red-200 bg-red-50 p-3 text-red-700" role="alert">
                            {error}
                        </div>
                    )}
                    {successMessage && (
                        <div className="rounded border border-green-200 bg-green-50 p-3 text-green-800" role="status">
                            {successMessage}
                        </div>
                    )}

                    {!registeredPatient ? (
                        <form
                            ref={formRef}
                            onSubmit={handleSubmit(onSubmit)}
                            onKeyDown={handleFormKeyDown}
                            className="space-y-4 bg-white p-6 shadow rounded"
                        >
                            <div ref={mobileContainerRef} className="relative">
                                <label htmlFor={MOBILE_INPUT_ID} className="block text-sm font-medium">
                                    Mobile number
                                </label>
                                <input
                                    ref={mobileInputRef}
                                    id={MOBILE_INPUT_ID}
                                    type="tel"
                                    inputMode="numeric"
                                    maxLength={12}
                                    value={mobileInput}
                                    onChange={handleMobileChange}
                                    onKeyDown={handleMobileKeyDown}
                                    placeholder="03xx-1234567"
                                    className="mt-1 block w-full border border-gray-300 rounded p-2 font-mono tracking-wider"
                                    autoComplete="tel"
                                    aria-describedby="mobile-format-hint"
                                />
                                <p id="mobile-format-hint" className="mt-1 text-xs text-gray-500">
                                    Format: 03xx-1234567. Dash appears after 4 digits. Press Enter to search.
                                </p>
                                {searching && <p className="mt-1 text-sm text-gray-500">Searching…</p>}
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
                                <label htmlFor="register-name" className="block text-sm font-medium">
                                    Full name
                                </label>
                                <input
                                    id="register-name"
                                    {...register('name', { required: true })}
                                    ref={(el) => {
                                        register('name').ref(el);
                                        fullNameInputRef.current = el;
                                    }}
                                    className="mt-1 block w-full border border-gray-300 rounded p-2"
                                    autoComplete="name"
                                />
                                {errors.name && <span className="text-red-500 text-sm block">Required</span>}
                                {fieldErrors.name?.map((message) => (
                                    <span key={message} className="text-red-500 text-sm block">{message}</span>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="register-age" className="block text-sm font-medium">
                                        Age (years)
                                    </label>
                                    <input
                                        id="register-age"
                                        type="number"
                                        min={0}
                                        max={150}
                                        value={ageInput}
                                        onChange={(e) => handleAgeChange(e.target.value)}
                                        placeholder="Age"
                                        className="mt-1 block w-full border border-gray-300 rounded p-2"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="register-dob" className="block text-sm font-medium">
                                        Date of birth
                                    </label>
                                    <input
                                        id="register-dob"
                                        type="date"
                                        {...register('dob', { required: true })}
                                        onChange={(e) => {
                                            register('dob').onChange(e);
                                            setAgeInput(dobToAge(e.target.value));
                                        }}
                                        className="mt-1 block w-full border border-gray-300 rounded p-2"
                                    />
                                </div>
                            </div>
                            {errors.dob && <span className="text-red-500 text-sm block">Required</span>}
                            {(fieldErrors.dob ?? []).length > 0 && (
                                <span className="text-red-500 text-sm block">{(fieldErrors.dob ?? []).map((m) => m)}</span>
                            )}

                            <div>
                                <label htmlFor="register-gender" className="block text-sm font-medium">
                                    Gender
                                </label>
                                <select id="register-gender" {...register('gender', { required: true })} className="mt-1 block w-full border border-gray-300 rounded p-2">
                                    <option value="">Select…</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                                {errors.gender && <span className="text-red-500 text-sm block">Required</span>}
                                {fieldErrors.gender?.map((message) => (
                                    <span key={message} className="text-red-500 text-sm block">{message}</span>
                                ))}
                            </div>

                            <div>
                                <label htmlFor="register-father" className="block text-sm font-medium text-gray-600">
                                    Father / Husband name <span className="text-gray-400">(optional)</span>
                                </label>
                                <input id="register-father" {...register('fatherOrHusbandName')} className="mt-1 block w-full border border-gray-300 rounded p-2" placeholder="Optional" />
                            </div>
                            <div>
                                <label htmlFor="register-cnic" className="block text-sm font-medium text-gray-600">
                                    CNIC <span className="text-gray-400">(optional)</span>
                                </label>
                                <input id="register-cnic" {...register('cnic')} className="mt-1 block w-full border border-gray-300 rounded p-2" placeholder="Optional" />
                            </div>
                            <div>
                                <label htmlFor="register-address" className="block text-sm font-medium text-gray-600">
                                    Address <span className="text-gray-400">(optional)</span>
                                </label>
                                <textarea id="register-address" {...register('address')} rows={2} className="mt-1 block w-full border border-gray-300 rounded p-2" placeholder="Optional" />
                            </div>

                            <input type="hidden" {...register('phone')} />

                            <button type="submit" className="w-full bg-blue-600 text-white py-2.5 rounded hover:bg-blue-700 font-medium">
                                Register patient
                            </button>
                        </form>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-white p-6 shadow rounded">
                                <h2 className="text-lg font-semibold mb-4">Create encounter</h2>
                                <p className="text-sm text-gray-600 mb-4">
                                    Patient: <strong>{registeredPatient.name}</strong> (Reg #: {registeredPatient.regNo ?? '—'})
                                </p>
                                {createEncounterError && (
                                    <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-red-700 text-sm">
                                        {createEncounterError}
                                    </div>
                                )}
                                <div className="flex flex-wrap items-center gap-3">
                                    <div className="min-w-[8rem]">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                        <span className="block rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm">Lab</span>
                                    </div>
                                    <div className="pt-6">
                                        <button
                                            type="button"
                                            onClick={createEncounter}
                                            disabled={isCreatingEncounter || Boolean(createdEncounter?.id)}
                                            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            {createdEncounter?.id ? 'Encounter created' : isCreatingEncounter ? 'Creating…' : 'New encounter'}
                                        </button>
                                    </div>
                                </div>
                                {createdEncounter?.id && (
                                    <p className="mt-3 text-sm text-green-700">
                                        Encounter created. Select tests on the right. Sample collection happens after test selection and billing.
                                    </p>
                                )}
                            </div>
                            <Link href="/patients/register" className="inline-block text-sm text-blue-600 underline">
                                Register another patient
                            </Link>
                        </div>
                    )}
                </div>

                {createdEncounter?.id && (
                    <div className="bg-white p-6 shadow rounded">
                        <h2 className="text-lg font-semibold mb-4">Order tests</h2>
                        {labCatalogLoading ? (
                            <p className="text-sm text-gray-600">Loading LAB catalog…</p>
                        ) : (
                            <>
                                <div className="flex flex-wrap items-end gap-3 mb-4">
                                    <div className="min-w-0 flex-1">
                                        <label className="block text-sm font-medium mb-1">Catalog test</label>
                                        <select
                                            value={selectedLabTestId}
                                            onChange={(e) => setSelectedLabTestId(e.target.value)}
                                            className="block w-full rounded border border-gray-300 p-2 text-sm"
                                        >
                                            {(labCatalog?.data ?? []).map((test) => (
                                                <option key={test.id} value={test.id}>
                                                    {test.department} – {test.name} ({test.code})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={addLabTest}
                                        disabled={isAddingLabTest || !selectedLabTestId}
                                        className="rounded bg-blue-600 px-4 py-2 text-white text-sm hover:bg-blue-700 disabled:opacity-60"
                                    >
                                        {isAddingLabTest ? 'Adding…' : 'Add to encounter'}
                                    </button>
                                </div>
                                <div className="border-t pt-4">
                                    <p className="text-sm font-medium text-gray-700 mb-2">Ordered tests</p>
                                    {orderedTests.length === 0 ? (
                                        <p className="text-sm text-gray-500">No tests added yet.</p>
                                    ) : (
                                        <ul className="space-y-1 text-sm">
                                            {orderedTests.map((item) => (
                                                <li key={item.orderItem.id}>
                                                    {item.test.name} ({item.test.code})
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                <div className="border-t pt-4 mt-4 space-y-3">
                                    <h3 className="text-sm font-semibold text-gray-800">Billing and receipt</h3>
                                    <p className="text-xs text-gray-600">
                                        After selecting tests, record payment and print receipt. Sample collection continues in the Samples stage.
                                    </p>
                                    {paymentError && (
                                        <div className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">
                                            {paymentError}
                                        </div>
                                    )}
                                    {paymentSuccess && (
                                        <div className="rounded border border-green-200 bg-green-50 p-2 text-sm text-green-700">
                                            {paymentSuccess}
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Amount</label>
                                            <input
                                                type="number"
                                                min="0.01"
                                                step="0.01"
                                                value={paymentForm.amount}
                                                onChange={(e) => setPaymentForm((prev) => ({ ...prev, amount: e.target.value }))}
                                                className="block w-full rounded border border-gray-300 p-2 text-sm"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Method</label>
                                            <select
                                                value={paymentForm.method}
                                                onChange={(e) => setPaymentForm((prev) => ({
                                                    ...prev,
                                                    method: e.target.value as RecordPaymentRequest['method'],
                                                }))}
                                                className="block w-full rounded border border-gray-300 p-2 text-sm"
                                            >
                                                <option value="CASH">CASH</option>
                                                <option value="CARD">CARD</option>
                                                <option value="ONLINE">ONLINE</option>
                                                <option value="OTHER">OTHER</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Reference (optional)</label>
                                            <input
                                                type="text"
                                                value={paymentForm.reference}
                                                onChange={(e) => setPaymentForm((prev) => ({ ...prev, reference: e.target.value }))}
                                                className="block w-full rounded border border-gray-300 p-2 text-sm"
                                                placeholder="Receipt or reference"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={recordPayment}
                                            disabled={isRecordingPayment}
                                            className="rounded bg-blue-600 px-4 py-2 text-white text-sm hover:bg-blue-700 disabled:opacity-60"
                                        >
                                            {isRecordingPayment ? 'Recording…' : 'Record payment'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={printLatestReceipt}
                                            disabled={!latestPayment}
                                            className="rounded bg-gray-900 px-4 py-2 text-white text-sm hover:bg-gray-700 disabled:opacity-60"
                                        >
                                            Print latest receipt
                                        </button>
                                    </div>
                                    {billingSnapshot && (
                                        <div className="rounded border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                                            <p>
                                                <span className="font-semibold">Invoice:</span> {billingSnapshot.invoice.invoice_id}
                                            </p>
                                            <p>
                                                <span className="font-semibold">Status:</span> {billingSnapshot.invoice.status}
                                            </p>
                                            <p>
                                                <span className="font-semibold">Paid:</span> {billingSnapshot.invoice.paid_amount}
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <Link
                                    href={`/encounters/${createdEncounter.id}`}
                                    className="mt-4 inline-block text-sm text-blue-600 underline"
                                >
                                    Open full encounter →
                                </Link>
                                <Link
                                    href="/operator/samples"
                                    className="mt-2 inline-block text-sm text-blue-600 underline"
                                >
                                    Continue to Samples queue →
                                </Link>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
