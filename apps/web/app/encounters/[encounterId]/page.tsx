'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { paths } from '@vexel/contracts';
import { client } from '@/lib/api';
import { parseApiError } from '@/lib/api-errors';

type Encounter =
  paths['/encounters/{id}']['get']['responses'][200]['content']['application/json'];
type Patient =
  paths['/patients/{id}']['get']['responses'][200]['content']['application/json'];
type EncounterPrepResponse =
  paths['/encounters/{id}/prep']['get']['responses'][200]['content']['application/json'];
type SavePrepRequest =
  paths['/encounters/{id}:save-prep']['post']['requestBody']['content']['application/json'];

type PrepFormState = {
  specimenType: string;
  collectedAt: string;
  collectorName: string;
  receivedAt: string;
  fastingRequired: boolean;
  fastingConfirmed: boolean;
  contrastPlanned: boolean;
  creatinineChecked: boolean;
  pregnancyScreenDone: boolean;
  notes: string;
  systolicBp: string;
  diastolicBp: string;
  pulse: string;
  temperatureC: string;
  respiratoryRate: string;
  weightKg: string;
  spo2: string;
  triageNotes: string;
  sampleReceivedAt: string;
  aboGroup: string;
  rhType: string;
  componentRequested: string;
  unitsRequested: string;
  urgency: '' | 'ROUTINE' | 'URGENT';
  admissionReason: string;
  ward: string;
  bed: string;
  admittingNotes: string;
};

const defaultPrepFormState: PrepFormState = {
  specimenType: '',
  collectedAt: '',
  collectorName: '',
  receivedAt: '',
  fastingRequired: false,
  fastingConfirmed: false,
  contrastPlanned: false,
  creatinineChecked: false,
  pregnancyScreenDone: false,
  notes: '',
  systolicBp: '',
  diastolicBp: '',
  pulse: '',
  temperatureC: '',
  respiratoryRate: '',
  weightKg: '',
  spo2: '',
  triageNotes: '',
  sampleReceivedAt: '',
  aboGroup: '',
  rhType: '',
  componentRequested: '',
  unitsRequested: '',
  urgency: '',
  admissionReason: '',
  ward: '',
  bed: '',
  admittingNotes: '',
};

function toDateTimeLocal(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toIsoOrUndefined(value: string): string | undefined {
  if (!value.trim()) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}

function toNumberOrUndefined(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }

  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return undefined;
  }

  return numeric;
}

function buildPrepPayload(
  encounterType: Encounter['type'],
  state: PrepFormState,
): SavePrepRequest {
  if (encounterType === 'LAB') {
    return {
      specimenType: state.specimenType || undefined,
      collectedAt: toIsoOrUndefined(state.collectedAt),
      collectorName: state.collectorName || undefined,
      receivedAt: toIsoOrUndefined(state.receivedAt),
    };
  }

  if (encounterType === 'RAD') {
    return {
      fastingRequired: state.fastingRequired,
      fastingConfirmed: state.fastingConfirmed,
      contrastPlanned: state.contrastPlanned,
      creatinineChecked: state.creatinineChecked,
      pregnancyScreenDone: state.pregnancyScreenDone,
      notes: state.notes || undefined,
    };
  }

  if (encounterType === 'OPD') {
    return {
      systolicBp: toNumberOrUndefined(state.systolicBp),
      diastolicBp: toNumberOrUndefined(state.diastolicBp),
      pulse: toNumberOrUndefined(state.pulse),
      temperatureC: toNumberOrUndefined(state.temperatureC),
      respiratoryRate: toNumberOrUndefined(state.respiratoryRate),
      weightKg: toNumberOrUndefined(state.weightKg),
      spo2: toNumberOrUndefined(state.spo2),
      triageNotes: state.triageNotes || undefined,
    };
  }

  if (encounterType === 'BB') {
    return {
      sampleReceivedAt: toIsoOrUndefined(state.sampleReceivedAt),
      aboGroup: state.aboGroup || undefined,
      rhType: state.rhType || undefined,
      componentRequested: state.componentRequested || undefined,
      unitsRequested: toNumberOrUndefined(state.unitsRequested),
      urgency: state.urgency || undefined,
    };
  }

  return {
    admissionReason: state.admissionReason || undefined,
    ward: state.ward || undefined,
    bed: state.bed || undefined,
    admittingNotes: state.admittingNotes || undefined,
  };
}

function prepSummaryRows(prep: EncounterPrepResponse): Array<[string, string]> {
  if (prep.type === 'LAB' && prep.labPrep) {
    return [
      ['Specimen Type', prep.labPrep.specimenType ?? '-'],
      [
        'Collected At',
        prep.labPrep.collectedAt
          ? new Date(prep.labPrep.collectedAt).toLocaleString()
          : '-',
      ],
      ['Collector Name', prep.labPrep.collectorName ?? '-'],
      [
        'Received At',
        prep.labPrep.receivedAt
          ? new Date(prep.labPrep.receivedAt).toLocaleString()
          : '-',
      ],
    ];
  }

  if (prep.type === 'RAD' && prep.radPrep) {
    return [
      ['Fasting Required', String(prep.radPrep.fastingRequired ?? '-')],
      ['Fasting Confirmed', String(prep.radPrep.fastingConfirmed ?? '-')],
      ['Contrast Planned', String(prep.radPrep.contrastPlanned ?? '-')],
      ['Creatinine Checked', String(prep.radPrep.creatinineChecked ?? '-')],
      [
        'Pregnancy Screen Done',
        String(prep.radPrep.pregnancyScreenDone ?? '-'),
      ],
      ['Notes', prep.radPrep.notes ?? '-'],
    ];
  }

  if (prep.type === 'OPD' && prep.opdPrep) {
    return [
      ['Systolic BP', String(prep.opdPrep.systolicBp ?? '-')],
      ['Diastolic BP', String(prep.opdPrep.diastolicBp ?? '-')],
      ['Pulse', String(prep.opdPrep.pulse ?? '-')],
      ['Temperature (C)', String(prep.opdPrep.temperatureC ?? '-')],
      ['Respiratory Rate', String(prep.opdPrep.respiratoryRate ?? '-')],
      ['Weight (kg)', String(prep.opdPrep.weightKg ?? '-')],
      ['SpO2', String(prep.opdPrep.spo2 ?? '-')],
      ['Triage Notes', prep.opdPrep.triageNotes ?? '-'],
    ];
  }

  if (prep.type === 'BB' && prep.bbPrep) {
    return [
      [
        'Sample Received At',
        prep.bbPrep.sampleReceivedAt
          ? new Date(prep.bbPrep.sampleReceivedAt).toLocaleString()
          : '-',
      ],
      ['ABO Group', prep.bbPrep.aboGroup ?? '-'],
      ['RH Type', prep.bbPrep.rhType ?? '-'],
      ['Component Requested', prep.bbPrep.componentRequested ?? '-'],
      ['Units Requested', String(prep.bbPrep.unitsRequested ?? '-')],
      ['Urgency', prep.bbPrep.urgency ?? '-'],
    ];
  }

  if (prep.type === 'IPD' && prep.ipdPrep) {
    return [
      ['Admission Reason', prep.ipdPrep.admissionReason ?? '-'],
      ['Ward', prep.ipdPrep.ward ?? '-'],
      ['Bed', prep.ipdPrep.bed ?? '-'],
      ['Admitting Notes', prep.ipdPrep.admittingNotes ?? '-'],
    ];
  }

  return [['Prep Data', 'Not saved yet']];
}

export default function EncounterDetailPage() {
  const params = useParams<{ encounterId: string }>();
  const encounterId = typeof params.encounterId === 'string' ? params.encounterId : '';

  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [isSavingPrep, setIsSavingPrep] = useState(false);
  const [isStartingMain, setIsStartingMain] = useState(false);
  const [prepForm, setPrepForm] = useState<PrepFormState>(defaultPrepFormState);

  const {
    data: encounter,
    isLoading: encounterLoading,
    error: encounterError,
    refetch: refetchEncounter,
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

  const {
    data: prep,
    isLoading: prepLoading,
    error: prepError,
    refetch: refetchPrep,
  } = useQuery<EncounterPrepResponse>({
    queryKey: ['encounter-prep', encounterId],
    enabled: Boolean(encounterId),
    queryFn: async () => {
      const { data, error } = await client.GET('/encounters/{id}/prep', {
        params: {
          path: { id: encounterId },
        },
      });

      if (error) {
        throw new Error(parseApiError(error, 'Failed to load prep data').message);
      }

      if (!data) {
        throw new Error('Prep not found');
      }

      return data;
    },
  });

  useEffect(() => {
    if (!prep) {
      setPrepForm(defaultPrepFormState);
      return;
    }

    if (prep.type === 'LAB' && prep.labPrep) {
      setPrepForm((previous) => ({
        ...previous,
        specimenType: prep.labPrep?.specimenType ?? '',
        collectedAt: toDateTimeLocal(prep.labPrep?.collectedAt),
        collectorName: prep.labPrep?.collectorName ?? '',
        receivedAt: toDateTimeLocal(prep.labPrep?.receivedAt),
      }));
      return;
    }

    if (prep.type === 'RAD' && prep.radPrep) {
      setPrepForm((previous) => ({
        ...previous,
        fastingRequired: prep.radPrep?.fastingRequired ?? false,
        fastingConfirmed: prep.radPrep?.fastingConfirmed ?? false,
        contrastPlanned: prep.radPrep?.contrastPlanned ?? false,
        creatinineChecked: prep.radPrep?.creatinineChecked ?? false,
        pregnancyScreenDone: prep.radPrep?.pregnancyScreenDone ?? false,
        notes: prep.radPrep?.notes ?? '',
      }));
      return;
    }

    if (prep.type === 'OPD' && prep.opdPrep) {
      setPrepForm((previous) => ({
        ...previous,
        systolicBp:
          prep.opdPrep?.systolicBp === null || prep.opdPrep?.systolicBp === undefined
            ? ''
            : String(prep.opdPrep.systolicBp),
        diastolicBp:
          prep.opdPrep?.diastolicBp === null || prep.opdPrep?.diastolicBp === undefined
            ? ''
            : String(prep.opdPrep.diastolicBp),
        pulse:
          prep.opdPrep?.pulse === null || prep.opdPrep?.pulse === undefined
            ? ''
            : String(prep.opdPrep.pulse),
        temperatureC:
          prep.opdPrep?.temperatureC === null || prep.opdPrep?.temperatureC === undefined
            ? ''
            : String(prep.opdPrep.temperatureC),
        respiratoryRate:
          prep.opdPrep?.respiratoryRate === null ||
          prep.opdPrep?.respiratoryRate === undefined
            ? ''
            : String(prep.opdPrep.respiratoryRate),
        weightKg:
          prep.opdPrep?.weightKg === null || prep.opdPrep?.weightKg === undefined
            ? ''
            : String(prep.opdPrep.weightKg),
        spo2:
          prep.opdPrep?.spo2 === null || prep.opdPrep?.spo2 === undefined
            ? ''
            : String(prep.opdPrep.spo2),
        triageNotes: prep.opdPrep?.triageNotes ?? '',
      }));
      return;
    }

    if (prep.type === 'BB' && prep.bbPrep) {
      setPrepForm((previous) => ({
        ...previous,
        sampleReceivedAt: toDateTimeLocal(prep.bbPrep?.sampleReceivedAt),
        aboGroup: prep.bbPrep?.aboGroup ?? '',
        rhType: prep.bbPrep?.rhType ?? '',
        componentRequested: prep.bbPrep?.componentRequested ?? '',
        unitsRequested:
          prep.bbPrep?.unitsRequested === null || prep.bbPrep?.unitsRequested === undefined
            ? ''
            : String(prep.bbPrep.unitsRequested),
        urgency: prep.bbPrep?.urgency ?? '',
      }));
      return;
    }

    if (prep.type === 'IPD' && prep.ipdPrep) {
      setPrepForm((previous) => ({
        ...previous,
        admissionReason: prep.ipdPrep?.admissionReason ?? '',
        ward: prep.ipdPrep?.ward ?? '',
        bed: prep.ipdPrep?.bed ?? '',
        admittingNotes: prep.ipdPrep?.admittingNotes ?? '',
      }));
    }
  }, [prep]);

  const prepRows = useMemo(() => {
    if (!prep) {
      return [['Prep Data', 'Not saved yet']] as Array<[string, string]>;
    }

    return prepSummaryRows(prep);
  }, [prep]);

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

  const savePrep = async () => {
    setActionError('');
    setActionSuccess('');
    setIsSavingPrep(true);

    const payload = buildPrepPayload(encounter.type, prepForm);

    const { data, error } = await client.POST('/encounters/{id}:save-prep', {
      params: {
        path: { id: encounter.id },
      },
      body: payload,
    });

    setIsSavingPrep(false);

    if (error) {
      setActionError(parseApiError(error, 'Failed to save prep').message);
      return;
    }

    if (!data) {
      setActionError('Failed to save prep');
      return;
    }

    setActionSuccess('Prep saved');
    await refetchPrep();
  };

  const startMain = async () => {
    setActionError('');
    setActionSuccess('');
    setIsStartingMain(true);

    const { error } = await client.POST('/encounters/{id}:start-main', {
      params: {
        path: { id: encounter.id },
      },
    });

    setIsStartingMain(false);

    if (error) {
      setActionError(parseApiError(error, 'Failed to start main').message);
      return;
    }

    setActionSuccess('Encounter moved to IN_PROGRESS');
    await Promise.all([refetchEncounter(), refetchPrep()]);
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
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

      {prepError && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-red-700">
          {prepError instanceof Error ? prepError.message : 'Failed to load prep data'}
        </div>
      )}

      {actionError && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-red-700">
          {actionError}
        </div>
      )}
      {actionSuccess && (
        <div className="mb-4 rounded border border-green-200 bg-green-50 p-3 text-green-700">
          {actionSuccess}
        </div>
      )}

      <div className="rounded border bg-white p-6 shadow mb-6">
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

      <div className="rounded border bg-white p-6 shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Preparation Data</h2>
        {prepLoading ? (
          <p className="text-sm text-gray-600">Loading prep...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-5">
            {prepRows.map(([label, value]) => (
              <p key={label}>
                <span className="font-semibold">{label}:</span> {value}
              </p>
            ))}
            <p>
              <span className="font-semibold">Updated At:</span>{' '}
              {prep?.updatedAt ? new Date(prep.updatedAt).toLocaleString() : '-'}
            </p>
          </div>
        )}

        {encounter.status === 'PREP' && (
          <div className="space-y-4">
            {encounter.type === 'LAB' && (
              <>
                <div>
                  <label className="block text-sm font-medium">Specimen Type</label>
                  <input
                    value={prepForm.specimenType}
                    onChange={(event) =>
                      setPrepForm((previous) => ({
                        ...previous,
                        specimenType: event.target.value,
                      }))
                    }
                    className="mt-1 block w-full rounded border border-gray-300 p-2"
                    placeholder="Blood"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium">Collected At</label>
                    <input
                      type="datetime-local"
                      value={prepForm.collectedAt}
                      onChange={(event) =>
                        setPrepForm((previous) => ({
                          ...previous,
                          collectedAt: event.target.value,
                        }))
                      }
                      className="mt-1 block w-full rounded border border-gray-300 p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Collector Name</label>
                    <input
                      value={prepForm.collectorName}
                      onChange={(event) =>
                        setPrepForm((previous) => ({
                          ...previous,
                          collectorName: event.target.value,
                        }))
                      }
                      className="mt-1 block w-full rounded border border-gray-300 p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Received At</label>
                    <input
                      type="datetime-local"
                      value={prepForm.receivedAt}
                      onChange={(event) =>
                        setPrepForm((previous) => ({
                          ...previous,
                          receivedAt: event.target.value,
                        }))
                      }
                      className="mt-1 block w-full rounded border border-gray-300 p-2"
                    />
                  </div>
                </div>
              </>
            )}

            {encounter.type === 'RAD' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={prepForm.fastingRequired}
                      onChange={(event) =>
                        setPrepForm((previous) => ({
                          ...previous,
                          fastingRequired: event.target.checked,
                        }))
                      }
                    />
                    Fasting Required
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={prepForm.fastingConfirmed}
                      onChange={(event) =>
                        setPrepForm((previous) => ({
                          ...previous,
                          fastingConfirmed: event.target.checked,
                        }))
                      }
                    />
                    Fasting Confirmed
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={prepForm.contrastPlanned}
                      onChange={(event) =>
                        setPrepForm((previous) => ({
                          ...previous,
                          contrastPlanned: event.target.checked,
                        }))
                      }
                    />
                    Contrast Planned
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={prepForm.creatinineChecked}
                      onChange={(event) =>
                        setPrepForm((previous) => ({
                          ...previous,
                          creatinineChecked: event.target.checked,
                        }))
                      }
                    />
                    Creatinine Checked
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={prepForm.pregnancyScreenDone}
                      onChange={(event) =>
                        setPrepForm((previous) => ({
                          ...previous,
                          pregnancyScreenDone: event.target.checked,
                        }))
                      }
                    />
                    Pregnancy Screen Done
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium">Notes</label>
                  <textarea
                    value={prepForm.notes}
                    onChange={(event) =>
                      setPrepForm((previous) => ({
                        ...previous,
                        notes: event.target.value,
                      }))
                    }
                    className="mt-1 block w-full rounded border border-gray-300 p-2"
                    rows={3}
                  />
                </div>
              </>
            )}

            {encounter.type === 'OPD' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  ['systolicBp', 'Systolic BP'],
                  ['diastolicBp', 'Diastolic BP'],
                  ['pulse', 'Pulse'],
                  ['temperatureC', 'Temperature (C)'],
                  ['respiratoryRate', 'Respiratory Rate'],
                  ['weightKg', 'Weight (kg)'],
                  ['spo2', 'SpO2'],
                ].map(([key, label]) => (
                  <div key={key}>
                    <label className="block text-sm font-medium">{label}</label>
                    <input
                      value={prepForm[key as keyof PrepFormState] as string}
                      onChange={(event) =>
                        setPrepForm((previous) => ({
                          ...previous,
                          [key]: event.target.value,
                        }))
                      }
                      className="mt-1 block w-full rounded border border-gray-300 p-2"
                    />
                  </div>
                ))}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium">Triage Notes</label>
                  <textarea
                    value={prepForm.triageNotes}
                    onChange={(event) =>
                      setPrepForm((previous) => ({
                        ...previous,
                        triageNotes: event.target.value,
                      }))
                    }
                    className="mt-1 block w-full rounded border border-gray-300 p-2"
                    rows={3}
                  />
                </div>
              </div>
            )}

            {encounter.type === 'BB' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium">Sample Received At</label>
                  <input
                    type="datetime-local"
                    value={prepForm.sampleReceivedAt}
                    onChange={(event) =>
                      setPrepForm((previous) => ({
                        ...previous,
                        sampleReceivedAt: event.target.value,
                      }))
                    }
                    className="mt-1 block w-full rounded border border-gray-300 p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">ABO Group</label>
                  <input
                    value={prepForm.aboGroup}
                    onChange={(event) =>
                      setPrepForm((previous) => ({
                        ...previous,
                        aboGroup: event.target.value,
                      }))
                    }
                    className="mt-1 block w-full rounded border border-gray-300 p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">RH Type</label>
                  <input
                    value={prepForm.rhType}
                    onChange={(event) =>
                      setPrepForm((previous) => ({
                        ...previous,
                        rhType: event.target.value,
                      }))
                    }
                    className="mt-1 block w-full rounded border border-gray-300 p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Component Requested</label>
                  <input
                    value={prepForm.componentRequested}
                    onChange={(event) =>
                      setPrepForm((previous) => ({
                        ...previous,
                        componentRequested: event.target.value,
                      }))
                    }
                    className="mt-1 block w-full rounded border border-gray-300 p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Units Requested</label>
                  <input
                    value={prepForm.unitsRequested}
                    onChange={(event) =>
                      setPrepForm((previous) => ({
                        ...previous,
                        unitsRequested: event.target.value,
                      }))
                    }
                    className="mt-1 block w-full rounded border border-gray-300 p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Urgency</label>
                  <select
                    value={prepForm.urgency}
                    onChange={(event) =>
                      setPrepForm((previous) => ({
                        ...previous,
                        urgency: event.target.value as PrepFormState['urgency'],
                      }))
                    }
                    className="mt-1 block w-full rounded border border-gray-300 p-2"
                  >
                    <option value="">Select...</option>
                    <option value="ROUTINE">ROUTINE</option>
                    <option value="URGENT">URGENT</option>
                  </select>
                </div>
              </div>
            )}

            {encounter.type === 'IPD' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium">Admission Reason</label>
                  <input
                    value={prepForm.admissionReason}
                    onChange={(event) =>
                      setPrepForm((previous) => ({
                        ...previous,
                        admissionReason: event.target.value,
                      }))
                    }
                    className="mt-1 block w-full rounded border border-gray-300 p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Ward</label>
                  <input
                    value={prepForm.ward}
                    onChange={(event) =>
                      setPrepForm((previous) => ({
                        ...previous,
                        ward: event.target.value,
                      }))
                    }
                    className="mt-1 block w-full rounded border border-gray-300 p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Bed</label>
                  <input
                    value={prepForm.bed}
                    onChange={(event) =>
                      setPrepForm((previous) => ({
                        ...previous,
                        bed: event.target.value,
                      }))
                    }
                    className="mt-1 block w-full rounded border border-gray-300 p-2"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium">Admitting Notes</label>
                  <textarea
                    value={prepForm.admittingNotes}
                    onChange={(event) =>
                      setPrepForm((previous) => ({
                        ...previous,
                        admittingNotes: event.target.value,
                      }))
                    }
                    className="mt-1 block w-full rounded border border-gray-300 p-2"
                    rows={3}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  void savePrep();
                }}
                disabled={isSavingPrep}
                className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {isSavingPrep ? 'Saving...' : 'Save Prep'}
              </button>
              <button
                type="button"
                onClick={() => {
                  void startMain();
                }}
                disabled={isStartingMain}
                className="rounded bg-gray-900 px-4 py-2 text-white hover:bg-gray-700 disabled:opacity-60"
              >
                {isStartingMain ? 'Starting...' : 'Proceed to MAIN'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
