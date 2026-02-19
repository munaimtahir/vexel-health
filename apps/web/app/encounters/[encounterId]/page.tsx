'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { paths } from '@vexel/contracts';
import { client } from '@/lib/api';
import { parseApiError } from '@/lib/api-errors';
import { IdentityHeader } from '@/components/identity/IdentityHeader';
import { mapIdentityHeader } from '@/lib/identity/mapIdentity';

type Encounter =
  paths['/encounters/{id}']['get']['responses'][200]['content']['application/json'];
type Patient =
  paths['/patients/{id}']['get']['responses'][200]['content']['application/json'];
type EncounterPrepResponse =
  paths['/encounters/{id}/prep']['get']['responses'][200]['content']['application/json'];
type SavePrepRequest =
  paths['/encounters/{id}:save-prep']['post']['requestBody']['content']['application/json'];
type EncounterMainResponse =
  paths['/encounters/{id}/main']['get']['responses'][200]['content']['application/json'];
type SaveMainRequest =
  paths['/encounters/{id}:save-main']['post']['requestBody']['content']['application/json'];
type DocumentResponse =
  paths['/encounters/{id}:document']['post']['responses'][200]['content']['application/json'];
type DocumentCommandRequest =
  NonNullable<
    paths['/encounters/{id}:document']['post']['requestBody']
  >['content']['application/json'];
type RequestedDocumentType = DocumentResponse['type'];
type ListLabTestsResponse =
  paths['/lab/tests']['get']['responses'][200]['content']['application/json'];
type AddTestToEncounterRequest =
  NonNullable<
    paths['/encounters/{id}:lab-add-test']['post']['requestBody']
  >['content']['application/json'];
type ListEncounterLabTestsResponse =
  paths['/encounters/{id}/lab-tests']['get']['responses'][200]['content']['application/json'];
type LabOrderedTest = ListEncounterLabTestsResponse['data'][number];
type EnterLabResultsRequest =
  NonNullable<
    paths['/encounters/{id}:lab-enter-results']['post']['requestBody']
  >['content']['application/json'];
type VerifyLabResultsRequest =
  NonNullable<
    paths['/encounters/{id}:lab-verify']['post']['requestBody']
  >['content']['application/json'];
type RecordPaymentRequest =
  NonNullable<
    paths['/encounters/{id}/payments']['post']['requestBody']
  >['content']['application/json'];
type RecordPaymentResponse =
  paths['/encounters/{id}/payments']['post']['responses'][200]['content']['application/json'];
/** Billing returns same shape as record payment response (invoice + payments), or null */
type BillingResponse = RecordPaymentResponse | null;
type UpdateEncounterPrepCommandRequest =
  NonNullable<
    paths['/lims/commands/updateEncounterPrep']['post']['requestBody']
  >['content']['application/json'];

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

type MainFormState = {
  resultSummary: string;
  verifiedBy: string;
  verifiedAt: string;
  reportText: string;
  impression: string;
  radiologistName: string;
  reportedAt: string;
  chiefComplaint: string;
  assessment: string;
  plan: string;
  prescriptionText: string;
  crossmatchResult: '' | 'COMPATIBLE' | 'INCOMPATIBLE';
  componentIssued: string;
  unitsIssued: string;
  issuedAt: string;
  issueNotes: string;
  dailyNote: string;
  orders: string;
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

const defaultMainFormState: MainFormState = {
  resultSummary: '',
  verifiedBy: '',
  verifiedAt: '',
  reportText: '',
  impression: '',
  radiologistName: '',
  reportedAt: '',
  chiefComplaint: '',
  assessment: '',
  plan: '',
  prescriptionText: '',
  crossmatchResult: '',
  componentIssued: '',
  unitsIssued: '',
  issuedAt: '',
  issueNotes: '',
  dailyNote: '',
  orders: '',
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

function buildMainPayload(
  encounterType: Encounter['type'],
  state: MainFormState,
): SaveMainRequest {
  if (encounterType === 'LAB') {
    return {
      resultSummary: state.resultSummary || undefined,
      verifiedBy: state.verifiedBy || undefined,
      verifiedAt: toIsoOrUndefined(state.verifiedAt),
    };
  }

  if (encounterType === 'RAD') {
    return {
      reportText: state.reportText || undefined,
      impression: state.impression || undefined,
      radiologistName: state.radiologistName || undefined,
      reportedAt: toIsoOrUndefined(state.reportedAt),
    };
  }

  if (encounterType === 'OPD') {
    return {
      chiefComplaint: state.chiefComplaint || undefined,
      assessment: state.assessment || undefined,
      plan: state.plan || undefined,
      prescriptionText: state.prescriptionText || undefined,
    };
  }

  if (encounterType === 'BB') {
    return {
      crossmatchResult: state.crossmatchResult || undefined,
      componentIssued: state.componentIssued || undefined,
      unitsIssued: toNumberOrUndefined(state.unitsIssued),
      issuedAt: toIsoOrUndefined(state.issuedAt),
      issueNotes: state.issueNotes || undefined,
    };
  }

  return {
    dailyNote: state.dailyNote || undefined,
    orders: state.orders || undefined,
  };
}

function mainSummaryRows(main: EncounterMainResponse): Array<[string, string]> {
  if (main.type === 'LAB' && main.labMain) {
    return [
      ['Result Summary', main.labMain.resultSummary ?? '-'],
      ['Verified By', main.labMain.verifiedBy ?? '-'],
      [
        'Verified At',
        main.labMain.verifiedAt ? new Date(main.labMain.verifiedAt).toLocaleString() : '-',
      ],
    ];
  }

  if (main.type === 'RAD' && main.radMain) {
    return [
      ['Report Text', main.radMain.reportText ?? '-'],
      ['Impression', main.radMain.impression ?? '-'],
      ['Radiologist', main.radMain.radiologistName ?? '-'],
      [
        'Reported At',
        main.radMain.reportedAt ? new Date(main.radMain.reportedAt).toLocaleString() : '-',
      ],
    ];
  }

  if (main.type === 'OPD' && main.opdMain) {
    return [
      ['Chief Complaint', main.opdMain.chiefComplaint ?? '-'],
      ['Assessment', main.opdMain.assessment ?? '-'],
      ['Plan', main.opdMain.plan ?? '-'],
      ['Prescription', main.opdMain.prescriptionText ?? '-'],
    ];
  }

  if (main.type === 'BB' && main.bbMain) {
    return [
      ['Crossmatch', main.bbMain.crossmatchResult ?? '-'],
      ['Component Issued', main.bbMain.componentIssued ?? '-'],
      ['Units Issued', String(main.bbMain.unitsIssued ?? '-')],
      ['Issued At', main.bbMain.issuedAt ? new Date(main.bbMain.issuedAt).toLocaleString() : '-'],
      ['Issue Notes', main.bbMain.issueNotes ?? '-'],
    ];
  }

  if (main.type === 'IPD' && main.ipdMain) {
    return [
      ['Daily Note', main.ipdMain.dailyNote ?? '-'],
      ['Orders', main.ipdMain.orders ?? '-'],
    ];
  }

  return [['Main Data', 'Not saved yet']];
}

function documentTypeOptions(encounterType: Encounter['type']): RequestedDocumentType[] {
  const options: RequestedDocumentType[] = ['ENCOUNTER_SUMMARY_V1'];

  if (encounterType === 'LAB') {
    options.push('LAB_REPORT_V1');
  } else if (encounterType === 'RAD') {
    options.push('RAD_REPORT_V1');
  } else if (encounterType === 'OPD') {
    options.push('OPD_SUMMARY_V1');
  } else if (encounterType === 'BB') {
    options.push('BB_ISSUE_SLIP_V1');
  } else if (encounterType === 'IPD') {
    options.push('IPD_SUMMARY_V1');
  }

  return options;
}

function defaultDocumentType(encounterType: Encounter['type']): RequestedDocumentType {
  const options = documentTypeOptions(encounterType);
  return options[options.length - 1];
}

export default function EncounterDetailPage() {
  const params = useParams<{ encounterId: string }>();
  const encounterId = typeof params.encounterId === 'string' ? params.encounterId : '';

  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [prepFieldErrors, setPrepFieldErrors] = useState<Record<string, string[]>>({});
  const [isSavingPrep, setIsSavingPrep] = useState(false);
  const [isStartingMain, setIsStartingMain] = useState(false);
  const [isSavingMain, setIsSavingMain] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isGeneratingDocument, setIsGeneratingDocument] = useState(false);
  const [isRefreshingDocument, setIsRefreshingDocument] = useState(false);
  const [isDownloadingDocument, setIsDownloadingDocument] = useState(false);
  const [isAddingLabTest, setIsAddingLabTest] = useState(false);
  const [isPublishingLabReport, setIsPublishingLabReport] = useState(false);
  const [savingLabOrderItemId, setSavingLabOrderItemId] = useState<string | null>(null);
  const [verifyingLabOrderItemId, setVerifyingLabOrderItemId] = useState<string | null>(null);
  const [prepForm, setPrepForm] = useState<PrepFormState>(defaultPrepFormState);
  const [mainForm, setMainForm] = useState<MainFormState>(defaultMainFormState);
  const [documentMeta, setDocumentMeta] = useState<DocumentResponse | null>(null);
  const [selectedLabTestId, setSelectedLabTestId] = useState('');
  const [labResultDrafts, setLabResultDrafts] = useState<
    Record<string, Record<string, string>>
  >({});
  const [selectedDocumentType, setSelectedDocumentType] =
    useState<RequestedDocumentType>('ENCOUNTER_SUMMARY_V1');
  const [paymentForm, setPaymentForm] = useState<{
    amount: string;
    method: RecordPaymentRequest['method'];
    reference: string;
  }>({ amount: '', method: 'CASH', reference: '' });
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [isStartingPrep, setIsStartingPrep] = useState(false);

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

  const {
    data: main,
    isLoading: mainLoading,
    error: mainError,
    refetch: refetchMain,
  } = useQuery<EncounterMainResponse>({
    queryKey: ['encounter-main', encounterId],
    enabled: Boolean(encounterId),
    queryFn: async () => {
      const { data, error } = await client.GET('/encounters/{id}/main', {
        params: {
          path: { id: encounterId },
        },
      });

      if (error) {
        throw new Error(parseApiError(error, 'Failed to load main data').message);
      }

      if (!data) {
        throw new Error('Main data not found');
      }

      return data;
    },
  });

  const {
    data: labCatalog,
    isLoading: labCatalogLoading,
    error: labCatalogError,
  } = useQuery<ListLabTestsResponse>({
    queryKey: ['lab-catalog-tests'],
    enabled: encounter?.type === 'LAB',
    queryFn: async () => {
      const { data, error } = await client.GET('/lab/tests');

      if (error) {
        throw new Error(parseApiError(error, 'Failed to load LAB catalog').message);
      }

      if (!data) {
        return { data: [], total: 0 };
      }

      return data;
    },
  });

  const {
    data: encounterLabTests,
    isLoading: encounterLabTestsLoading,
    error: encounterLabTestsError,
    refetch: refetchEncounterLabTests,
  } = useQuery<ListEncounterLabTestsResponse>({
    queryKey: ['encounter-lab-tests', encounterId],
    enabled: Boolean(encounterId) && encounter?.type === 'LAB',
    queryFn: async () => {
      const { data, error } = await client.GET('/encounters/{id}/lab-tests', {
        params: {
          path: { id: encounterId },
        },
      });

      if (error) {
        throw new Error(
          parseApiError(error, 'Failed to load encounter LAB tests').message,
        );
      }

      if (!data) {
        return { data: [], total: 0 };
      }

      return data;
    },
  });

  const {
    data: billingData,
    refetch: refetchBilling,
  } = useQuery<BillingResponse | null>({
    queryKey: ['encounter-billing', encounterId],
    enabled: Boolean(encounterId),
    queryFn: async (): Promise<BillingResponse | null> => {
      // Path exists in OpenAPI; generated PathsWithMethod may omit it
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (client as any).GET('/encounters/{id}/billing', {
        params: { path: { id: encounterId } },
      });

      if (error) {
        throw new Error(parseApiError(error, 'Failed to load billing').message);
      }

      return (data ?? null) as BillingResponse | null;
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

  useEffect(() => {
    if (!main) {
      setMainForm(defaultMainFormState);
      return;
    }

    if (main.type === 'LAB' && main.labMain) {
      setMainForm((previous) => ({
        ...previous,
        resultSummary: main.labMain?.resultSummary ?? '',
        verifiedBy: main.labMain?.verifiedBy ?? '',
        verifiedAt: toDateTimeLocal(main.labMain?.verifiedAt),
      }));
      return;
    }

    if (main.type === 'RAD' && main.radMain) {
      setMainForm((previous) => ({
        ...previous,
        reportText: main.radMain?.reportText ?? '',
        impression: main.radMain?.impression ?? '',
        radiologistName: main.radMain?.radiologistName ?? '',
        reportedAt: toDateTimeLocal(main.radMain?.reportedAt),
      }));
      return;
    }

    if (main.type === 'OPD' && main.opdMain) {
      setMainForm((previous) => ({
        ...previous,
        chiefComplaint: main.opdMain?.chiefComplaint ?? '',
        assessment: main.opdMain?.assessment ?? '',
        plan: main.opdMain?.plan ?? '',
        prescriptionText: main.opdMain?.prescriptionText ?? '',
      }));
      return;
    }

    if (main.type === 'BB' && main.bbMain) {
      setMainForm((previous) => ({
        ...previous,
        crossmatchResult: main.bbMain?.crossmatchResult ?? '',
        componentIssued: main.bbMain?.componentIssued ?? '',
        unitsIssued:
          main.bbMain?.unitsIssued === null || main.bbMain?.unitsIssued === undefined
            ? ''
            : String(main.bbMain.unitsIssued),
        issuedAt: toDateTimeLocal(main.bbMain?.issuedAt),
        issueNotes: main.bbMain?.issueNotes ?? '',
      }));
      return;
    }

    if (main.type === 'IPD' && main.ipdMain) {
      setMainForm((previous) => ({
        ...previous,
        dailyNote: main.ipdMain?.dailyNote ?? '',
        orders: main.ipdMain?.orders ?? '',
      }));
    }
  }, [main]);

  const prepRows = useMemo(() => {
    if (!prep) {
      return [['Prep Data', 'Not saved yet']] as Array<[string, string]>;
    }

    return prepSummaryRows(prep);
  }, [prep]);

  const mainRows = useMemo(() => {
    if (!main) {
      return [['Main Data', 'Not saved yet']] as Array<[string, string]>;
    }

    return mainSummaryRows(main);
  }, [main]);

  const availableDocumentTypes = useMemo(() => {
    if (!encounter) {
      return ['ENCOUNTER_SUMMARY_V1'] as RequestedDocumentType[];
    }

    return documentTypeOptions(encounter.type);
  }, [encounter]);

  const encounterStatus = (encounter?.status ?? '').toUpperCase();
  const orderedLabTests: LabOrderedTest[] = encounterLabTests?.data ?? [];
  const hasOrderedLabTests = orderedLabTests.length > 0;
  const canOrderLabTests =
    encounterStatus === 'CREATED' ||
    encounterStatus === 'PREP' ||
    encounterStatus === 'IN_PROGRESS';
  const prepFieldErrorFor = (field: string): string | null => {
    const nested = prepFieldErrors[`prep.${field}`];
    if (nested && nested.length > 0) {
      return nested[0];
    }

    const root = prepFieldErrors[field];
    return root && root.length > 0 ? root[0] : null;
  };

  useEffect(() => {
    if (!encounter) {
      return;
    }

    setSelectedDocumentType(defaultDocumentType(encounter.type));
  }, [encounter?.id]);

  useEffect(() => {
    if (!labCatalog?.data?.length) {
      return;
    }

    setSelectedLabTestId((previous) => previous || labCatalog.data[0].id);
  }, [labCatalog?.data]);

  useEffect(() => {
    if (!encounterLabTests?.data) {
      return;
    }

    setLabResultDrafts((previous) => {
      const nextDrafts: Record<string, Record<string, string>> = { ...previous };

      for (const orderedTest of encounterLabTests.data) {
        const existingDraft = nextDrafts[orderedTest.orderItem.id] ?? {};
        const nextOrderDraft: Record<string, string> = { ...existingDraft };
        const resultByParameterId = new Map(
          orderedTest.results.map((result) => [result.parameterId, result.value]),
        );

        for (const parameter of orderedTest.parameters) {
          if (nextOrderDraft[parameter.id] !== undefined) {
            continue;
          }
          nextOrderDraft[parameter.id] = resultByParameterId.get(parameter.id) ?? '';
        }

        nextDrafts[orderedTest.orderItem.id] = nextOrderDraft;
      }

      return nextDrafts;
    });
  }, [encounterLabTests?.data]);

  const identityProps = useMemo(
    () =>
      mapIdentityHeader({
        patient: patient as unknown as Record<string, unknown>,
        encounter: encounter as unknown as Record<string, unknown>,
        moduleRef: undefined,
      }),
    [patient, encounter],
  );

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
    setPrepFieldErrors({});
    setIsSavingPrep(true);
    if (encounter.type === 'LAB') {
      const body: UpdateEncounterPrepCommandRequest = {
        encounter_id: encounter.id,
        prep: {
          sample_collected_at: prepForm.collectedAt
            ? new Date(prepForm.collectedAt).toISOString()
            : '',
          sample_received_at: toIsoOrUndefined(prepForm.receivedAt),
          notes: prepForm.notes.trim() ? prepForm.notes.trim() : undefined,
        },
      };

      const { data, error } = await client.POST('/lims/commands/updateEncounterPrep', {
        body,
      });

      setIsSavingPrep(false);

      if (error) {
        const parsedError = parseApiError(error, 'Failed to save preparation');
        setActionError(parsedError.message);
        setPrepFieldErrors(parsedError.fieldErrors);
        return;
      }

      if (!data) {
        setActionError('Failed to save preparation');
        return;
      }

      setActionSuccess('Preparation saved');
      await Promise.all([refetchEncounter(), refetchPrep(), refetchEncounterLabTests()]);
      return;
    }

    const payload = buildPrepPayload(encounter.type, prepForm);

    const { data, error } = await client.POST('/encounters/{id}:save-prep', {
      params: {
        path: { id: encounter.id },
      },
      body: payload,
    });

    setIsSavingPrep(false);

    if (error) {
      const parsedError = parseApiError(error, 'Failed to save prep');
      setActionError(parsedError.message);
      setPrepFieldErrors(parsedError.fieldErrors);
      return;
    }

    if (!data) {
      setActionError('Failed to save prep');
      return;
    }

    setActionSuccess('Prep saved');
    await refetchPrep();
  };

  const startPrep = async () => {
    setActionError('');
    setActionSuccess('');
    setIsStartingPrep(true);

    const { error } = await client.POST('/encounters/{id}:start-prep', {
      params: {
        path: { id: encounter.id },
      },
    });

    setIsStartingPrep(false);

    if (error) {
      setActionError(parseApiError(error, 'Failed to start preparation').message);
      return;
    }

    setActionSuccess('Encounter moved to PREP');
    await Promise.all([refetchEncounter(), refetchPrep()]);
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
    await Promise.all([refetchEncounter(), refetchPrep(), refetchMain()]);
  };

  const saveMain = async () => {
    setActionError('');
    setActionSuccess('');
    setIsSavingMain(true);

    const payload = buildMainPayload(encounter.type, mainForm);

    const { data, error } = await client.POST('/encounters/{id}:save-main', {
      params: {
        path: { id: encounter.id },
      },
      body: payload,
    });

    setIsSavingMain(false);

    if (error) {
      setActionError(parseApiError(error, 'Failed to save main').message);
      return;
    }

    if (!data) {
      setActionError('Failed to save main');
      return;
    }

    setActionSuccess('Main data saved');
    await refetchMain();
  };

  const finalizeEncounter = async () => {
    setActionError('');
    setActionSuccess('');
    setIsFinalizing(true);

    const { error } = await client.POST('/encounters/{id}:finalize', {
      params: {
        path: { id: encounter.id },
      },
    });

    setIsFinalizing(false);

    if (error) {
      setActionError(parseApiError(error, 'Failed to finalize encounter').message);
      return;
    }

    setActionSuccess('Encounter moved to FINALIZED');
    await Promise.all([refetchEncounter(), refetchMain()]);
  };

  const addLabTestToEncounter = async () => {
    if (!selectedLabTestId) {
      setActionError('Select a LAB test first');
      return;
    }

    setActionError('');
    setActionSuccess('');
    setIsAddingLabTest(true);

    const body: AddTestToEncounterRequest = {
      testId: selectedLabTestId,
    };

    const { error } = await client.POST('/encounters/{id}:lab-add-test', {
      params: {
        path: { id: encounter.id },
      },
      body,
    });

    setIsAddingLabTest(false);

    if (error) {
      setActionError(parseApiError(error, 'Failed to add LAB test').message);
      return;
    }

    setActionSuccess('LAB test added to encounter');
    await refetchEncounterLabTests();
  };

  const updateLabResultDraft = (
    orderItemId: string,
    parameterId: string,
    value: string,
  ) => {
    setLabResultDrafts((previous) => ({
      ...previous,
      [orderItemId]: {
        ...(previous[orderItemId] ?? {}),
        [parameterId]: value,
      },
    }));
  };

  const submitLabOrderResults = async (orderedTest: LabOrderedTest) => {
    setActionError('');
    setActionSuccess('');
    setSavingLabOrderItemId(orderedTest.orderItem.id);

    const resultItems: EnterLabResultsRequest['results'] = orderedTest.parameters.map(
      (parameter) => ({
        parameterId: parameter.id,
        value: labResultDrafts[orderedTest.orderItem.id]?.[parameter.id] ?? '',
      }),
    );

    const body: EnterLabResultsRequest = {
      orderItemId: orderedTest.orderItem.id,
      results: resultItems,
    };

    const { error } = await client.POST('/encounters/{id}:lab-enter-results', {
      params: {
        path: { id: encounter.id },
      },
      body,
    });

    setSavingLabOrderItemId(null);

    if (error) {
      setActionError(parseApiError(error, 'Failed to enter LAB results').message);
      return;
    }

    setActionSuccess(`Results saved for ${orderedTest.test.name}`);
    await refetchEncounterLabTests();
  };

  const verifyLabOrderResults = async (orderedTest: LabOrderedTest) => {
    setActionError('');
    setActionSuccess('');
    setVerifyingLabOrderItemId(orderedTest.orderItem.id);

    const body: VerifyLabResultsRequest = {
      orderItemId: orderedTest.orderItem.id,
    };

    const { error } = await client.POST('/encounters/{id}:lab-verify', {
      params: {
        path: { id: encounter.id },
      },
      body,
    });

    setVerifyingLabOrderItemId(null);

    if (error) {
      setActionError(parseApiError(error, 'Failed to verify LAB results').message);
      return;
    }

    setActionSuccess(`Results verified for ${orderedTest.test.name}`);
    await Promise.all([refetchEncounter(), refetchEncounterLabTests()]);
  };

  const publishLabReport = async () => {
    setActionError('');
    setActionSuccess('');
    setIsPublishingLabReport(true);

    const { data, error } = await client.POST('/encounters/{id}:lab-publish', {
      params: {
        path: { id: encounter.id },
      },
    });

    setIsPublishingLabReport(false);

    if (error) {
      setActionError(parseApiError(error, 'Failed to publish LAB report').message);
      return;
    }

    if (!data) {
      setActionError('Failed to publish LAB report');
      return;
    }

    setDocumentMeta(data);
    setActionSuccess(
      data.status === 'RENDERED'
        ? 'LAB report rendered and ready to download'
        : `LAB report ${data.status.toLowerCase()}`,
    );
    await refetchEncounter();
  };

  const generateDocument = async () => {
    setActionError('');
    setActionSuccess('');
    setIsGeneratingDocument(true);

    const body: DocumentCommandRequest = {
      documentType: selectedDocumentType,
    };

    const { data, error } = await client.POST('/encounters/{id}:document', {
      params: {
        path: { id: encounter.id },
      },
      body,
    });

    setIsGeneratingDocument(false);

    if (error) {
      setActionError(parseApiError(error, 'Failed to generate document').message);
      return;
    }

    if (!data) {
      setActionError('Failed to generate document');
      return;
    }

    setDocumentMeta(data);
    setActionSuccess(
      data.status === 'RENDERED'
        ? `${data.type} rendered and ready to download`
        : `${data.type} ${data.status.toLowerCase()}`,
    );
    await refetchEncounter();
  };

  const refreshDocument = async () => {
    if (!documentMeta?.id) {
      return;
    }

    setActionError('');
    setIsRefreshingDocument(true);
    const { data, error } = await client.GET('/documents/{documentId}', {
      params: {
        path: { documentId: documentMeta.id },
      },
    });
    setIsRefreshingDocument(false);

    if (error) {
      setActionError(parseApiError(error, 'Failed to refresh document').message);
      return;
    }

    if (data) {
      setDocumentMeta(data);
    }
  };

  const downloadDocument = async () => {
    if (!documentMeta?.id) {
      return;
    }

    setActionError('');
    setIsDownloadingDocument(true);

    const { data, error } = await client.GET('/documents/{documentId}/file', {
      params: {
        path: { documentId: documentMeta.id },
      },
      parseAs: 'arrayBuffer',
    });

    setIsDownloadingDocument(false);

    if (error) {
      setActionError(parseApiError(error, 'Failed to download document').message);
      return;
    }

    if (!data) {
      setActionError('No document bytes returned');
      return;
    }

    const blob = new Blob([data], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `${encounter.encounterCode}.pdf`;
    window.document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Encounter Detail</h1>
        <Link href="/patients" className="text-blue-600 underline">
          Back to patients
        </Link>
      </div>

      <div className="mb-6">
        <IdentityHeader {...identityProps} />
      </div>

      {patientError && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-red-700" role="alert">
          {patientError instanceof Error
            ? patientError.message
            : 'Failed to load patient details'}
        </div>
      )}

      {prepError && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-red-700" role="alert">
          {prepError instanceof Error ? prepError.message : 'Failed to load prep data'}
        </div>
      )}
      {mainError && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-red-700" role="alert">
          {mainError instanceof Error ? mainError.message : 'Failed to load main data'}
        </div>
      )}
      {labCatalogError && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-red-700" role="alert">
          {labCatalogError instanceof Error
            ? labCatalogError.message
            : 'Failed to load LAB catalog'}
        </div>
      )}
      {encounterLabTestsError && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-red-700" role="alert">
          {encounterLabTestsError instanceof Error
            ? encounterLabTestsError.message
            : 'Failed to load encounter LAB tests'}
        </div>
      )}

      {actionError && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-red-700" role="alert">
          {actionError}
        </div>
      )}
      {actionSuccess && (
        <div className="mb-4 rounded border border-green-200 bg-green-50 p-3 text-green-700" role="status">
          {actionSuccess}
        </div>
      )}

      {encounter.type === 'LAB' && (
        <div className="mb-6 rounded border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-semibold text-slate-800 mb-2">LAB workflow (complete in order)</h3>
          <ol className="text-xs text-slate-600 list-decimal list-inside space-y-1">
            <li>Add test(s) from catalog</li>
            <li>Record payment and print receipt</li>
            <li>Collect and receive sample (Preparation Data section)</li>
            <li>Enter results → Submit Results per test</li>
            <li>Verify each order item (auto-finalizes encounter)</li>
            <li>Publish LAB Report → Download PDF (Document section)</li>
          </ol>
        </div>
      )}

      <div className="rounded border bg-white p-6 shadow mb-6">
        <div className="grid grid-cols-1 gap-4 text-sm">
          <p>
            <span className="font-semibold">Visit Code:</span>{' '}
            {encounter.encounterCode ?? '—'}
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
          {'labEncounterStatus' in encounter && encounter.labEncounterStatus && (
            <p>
              <span className="font-semibold">Lab status:</span>{' '}
              {encounter.labEncounterStatus}
            </p>
          )}
        </div>
      </div>

      <div className="rounded border bg-white p-6 shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Billing</h2>
        {billingData && (
          <div className="mb-4 text-sm">
            <p><span className="font-semibold">Total:</span> {billingData.invoice.total_amount}</p>
            <p><span className="font-semibold">Paid:</span> {billingData.invoice.paid_amount}</p>
            <p><span className="font-semibold">Status:</span> {billingData.invoice.status}</p>
            {billingData.payments.length > 0 && (
              <ul className="mt-2 list-disc pl-5">
                {billingData.payments.map((p) => (
                  <li key={p.id}>
                    {p.amount} ({p.method}) {p.receivedAt ? new Date(p.receivedAt).toLocaleString() : ''}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const amount = parseFloat(paymentForm.amount);
            if (Number.isNaN(amount) || amount <= 0) {
              setActionError('Enter a valid amount');
              return;
            }
            setActionError('');
            setActionSuccess('');
            setIsRecordingPayment(true);
            const { data, error } = await client.POST('/encounters/{id}/payments', {
              params: { path: { id: encounter.id } },
              body: {
                amount,
                method: paymentForm.method,
                reference: paymentForm.reference || undefined,
              },
            });
            setIsRecordingPayment(false);
            if (error) {
              setActionError(parseApiError(error, 'Failed to record payment').message);
              return;
            }
            setPaymentForm((prev) => ({ ...prev, amount: '', reference: '' }));
            setActionSuccess('Payment recorded');
            await refetchBilling();
          }}
        >
          <div>
            <label className="block text-sm font-medium">Amount</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm((prev) => ({ ...prev, amount: e.target.value }))}
              className="mt-1 block w-full rounded border border-gray-300 p-2"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Method</label>
            <select
              value={paymentForm.method}
              onChange={(e) =>
                setPaymentForm((prev) => ({
                  ...prev,
                  method: e.target.value as 'CASH' | 'CARD' | 'ONLINE' | 'OTHER',
                }))
              }
              className="mt-1 block w-full rounded border border-gray-300 p-2"
            >
              <option value="CASH">CASH</option>
              <option value="CARD">CARD</option>
              <option value="ONLINE">ONLINE</option>
              <option value="OTHER">OTHER</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Reference (optional)</label>
            <input
              type="text"
              value={paymentForm.reference}
              onChange={(e) => setPaymentForm((prev) => ({ ...prev, reference: e.target.value }))}
              className="mt-1 block w-full rounded border border-gray-300 p-2"
              placeholder="Receipt or ref"
            />
          </div>
          <button
            type="submit"
            disabled={isRecordingPayment}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isRecordingPayment ? 'Recording…' : 'Record payment'}
          </button>
        </form>
      </div>

      <div className="rounded border bg-white p-6 shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Preparation Data</h2>
        <p className="text-sm text-slate-600 mb-3">
          <span className="font-medium">Current status:</span> {encounter.status}
        </p>
        {encounterStatus === 'CREATED' && (
          <div className="mb-4">
            {encounter.type === 'LAB' ? (
              <>
                <p className="text-sm text-gray-600 mb-3">
                  LAB preparation uses the same step as Operator Samples. Save
                  collected/received timestamps below to move encounter to
                  IN_PROGRESS.
                </p>
                {!hasOrderedLabTests && (
                  <p className="mt-2 text-sm text-amber-700">
                    Add at least one ordered test before saving LAB preparation.
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-3">
                  Start preparation to continue.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    void startPrep();
                  }}
                  disabled={isStartingPrep}
                  className="rounded bg-gray-900 px-4 py-2 text-white hover:bg-gray-700 disabled:opacity-60"
                >
                  {isStartingPrep ? 'Starting...' : 'Start preparation'}
                </button>
              </>
            )}
          </div>
        )}

        {encounterStatus !== 'CREATED' && prepLoading ? (
          <p className="text-sm text-gray-600">Loading prep...</p>
        ) : encounterStatus !== 'CREATED' ? (
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
        ) : null}

        <div className="space-y-4">
            {encounter.type === 'LAB' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium">
                      Sample Collected At
                    </label>
                    <input
                      type="datetime-local"
                      value={prepForm.collectedAt}
                      onChange={(event) => {
                        setPrepFieldErrors({});
                        setPrepForm((previous) => ({
                          ...previous,
                          collectedAt: event.target.value,
                        }));
                      }}
                      className="mt-1 block w-full rounded border border-gray-300 p-2"
                    />
                    {prepFieldErrorFor('sample_collected_at') && (
                      <p className="mt-1 text-sm text-red-600">
                        {prepFieldErrorFor('sample_collected_at')}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium">
                      Sample Received At (optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={prepForm.receivedAt}
                      onChange={(event) => {
                        setPrepFieldErrors({});
                        setPrepForm((previous) => ({
                          ...previous,
                          receivedAt: event.target.value,
                        }));
                      }}
                      className="mt-1 block w-full rounded border border-gray-300 p-2"
                    />
                    {prepFieldErrorFor('sample_received_at') && (
                      <p className="mt-1 text-sm text-red-600">
                        {prepFieldErrorFor('sample_received_at')}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium">Notes (optional)</label>
                  <textarea
                    value={prepForm.notes}
                    onChange={(event) => {
                      setPrepFieldErrors({});
                      setPrepForm((previous) => ({
                        ...previous,
                        notes: event.target.value,
                      }));
                    }}
                    className="mt-1 block w-full rounded border border-gray-300 p-2"
                    rows={3}
                  />
                  {prepFieldErrorFor('notes') && (
                    <p className="mt-1 text-sm text-red-600">{prepFieldErrorFor('notes')}</p>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Complete sample collection here after tests are added to the order.
                </p>
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

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  void savePrep();
                }}
                disabled={isSavingPrep || (encounter.type === 'LAB' && !hasOrderedLabTests)}
                className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {isSavingPrep ? 'Saving...' : 'Save preparation'}
              </button>
              {encounter.type !== 'LAB' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      void startMain();
                    }}
                    disabled={isStartingMain || encounterStatus !== 'PREP'}
                    className="rounded bg-gray-900 px-4 py-2 text-white hover:bg-gray-700 disabled:opacity-60"
                  >
                    {isStartingMain ? 'Starting...' : 'Proceed to MAIN'}
                  </button>
                  {encounterStatus !== 'PREP' && (
                    <span className="text-sm text-amber-700">
                      Proceed to MAIN is available after encounter is in PREP.
                    </span>
                  )}
                </>
              )}
            </div>
        </div>
      </div>

      <div className="rounded border bg-white p-6 shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Main Data</h2>
        {mainLoading ? (
          <p className="text-sm text-gray-600">Loading main...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-5">
            {mainRows.map(([label, value]) => (
              <p key={label}>
                <span className="font-semibold">{label}:</span> {value}
              </p>
            ))}
            <p>
              <span className="font-semibold">Updated At:</span>{' '}
              {main?.updatedAt ? new Date(main.updatedAt).toLocaleString() : '-'}
            </p>
          </div>
        )}

        {encounterStatus === 'IN_PROGRESS' && (
          <div className="space-y-4">
            {encounter.type === 'LAB' && (
              <p className="rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                LAB MAIN is managed through structured result entry below (Order
                Tests, Enter Results, Verify).
              </p>
            )}

            {encounter.type === 'RAD' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium">Report Text</label>
                  <textarea
                    value={mainForm.reportText}
                    onChange={(event) =>
                      setMainForm((previous) => ({
                        ...previous,
                        reportText: event.target.value,
                      }))
                    }
                    className="mt-1 block w-full rounded border border-gray-300 p-2"
                    rows={4}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Impression</label>
                  <input
                    value={mainForm.impression}
                    onChange={(event) =>
                      setMainForm((previous) => ({
                        ...previous,
                        impression: event.target.value,
                      }))
                    }
                    className="mt-1 block w-full rounded border border-gray-300 p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Radiologist Name</label>
                  <input
                    value={mainForm.radiologistName}
                    onChange={(event) =>
                      setMainForm((previous) => ({
                        ...previous,
                        radiologistName: event.target.value,
                      }))
                    }
                    className="mt-1 block w-full rounded border border-gray-300 p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Reported At</label>
                  <input
                    type="datetime-local"
                    value={mainForm.reportedAt}
                    onChange={(event) =>
                      setMainForm((previous) => ({
                        ...previous,
                        reportedAt: event.target.value,
                      }))
                    }
                    className="mt-1 block w-full rounded border border-gray-300 p-2"
                  />
                </div>
              </div>
            )}

            {encounter.type === 'OPD' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium">Chief Complaint</label>
                  <input
                    value={mainForm.chiefComplaint}
                    onChange={(event) =>
                      setMainForm((previous) => ({
                        ...previous,
                        chiefComplaint: event.target.value,
                      }))
                    }
                    className="mt-1 block w-full rounded border border-gray-300 p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Assessment</label>
                  <input
                    value={mainForm.assessment}
                    onChange={(event) =>
                      setMainForm((previous) => ({
                        ...previous,
                        assessment: event.target.value,
                      }))
                    }
                    className="mt-1 block w-full rounded border border-gray-300 p-2"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium">Plan</label>
                  <textarea
                    value={mainForm.plan}
                    onChange={(event) =>
                      setMainForm((previous) => ({
                        ...previous,
                        plan: event.target.value,
                      }))
                    }
                    className="mt-1 block w-full rounded border border-gray-300 p-2"
                    rows={3}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium">Prescription</label>
                  <textarea
                    value={mainForm.prescriptionText}
                    onChange={(event) =>
                      setMainForm((previous) => ({
                        ...previous,
                        prescriptionText: event.target.value,
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
                  <label className="block text-sm font-medium">Crossmatch Result</label>
                  <select
                    value={mainForm.crossmatchResult}
                    onChange={(event) =>
                      setMainForm((previous) => ({
                        ...previous,
                        crossmatchResult: event.target.value as MainFormState['crossmatchResult'],
                      }))
                    }
                    className="mt-1 block w-full rounded border border-gray-300 p-2"
                  >
                    <option value="">Select...</option>
                    <option value="COMPATIBLE">COMPATIBLE</option>
                    <option value="INCOMPATIBLE">INCOMPATIBLE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium">Component Issued</label>
                  <input
                    value={mainForm.componentIssued}
                    onChange={(event) =>
                      setMainForm((previous) => ({
                        ...previous,
                        componentIssued: event.target.value,
                      }))
                    }
                    className="mt-1 block w-full rounded border border-gray-300 p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Units Issued</label>
                  <input
                    value={mainForm.unitsIssued}
                    onChange={(event) =>
                      setMainForm((previous) => ({
                        ...previous,
                        unitsIssued: event.target.value,
                      }))
                    }
                    className="mt-1 block w-full rounded border border-gray-300 p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Issued At</label>
                  <input
                    type="datetime-local"
                    value={mainForm.issuedAt}
                    onChange={(event) =>
                      setMainForm((previous) => ({
                        ...previous,
                        issuedAt: event.target.value,
                      }))
                    }
                    className="mt-1 block w-full rounded border border-gray-300 p-2"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium">Issue Notes</label>
                  <textarea
                    value={mainForm.issueNotes}
                    onChange={(event) =>
                      setMainForm((previous) => ({
                        ...previous,
                        issueNotes: event.target.value,
                      }))
                    }
                    className="mt-1 block w-full rounded border border-gray-300 p-2"
                    rows={3}
                  />
                </div>
              </div>
            )}

            {encounter.type === 'IPD' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium">Daily Note</label>
                  <textarea
                    value={mainForm.dailyNote}
                    onChange={(event) =>
                      setMainForm((previous) => ({
                        ...previous,
                        dailyNote: event.target.value,
                      }))
                    }
                    className="mt-1 block w-full rounded border border-gray-300 p-2"
                    rows={3}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium">Orders</label>
                  <textarea
                    value={mainForm.orders}
                    onChange={(event) =>
                      setMainForm((previous) => ({
                        ...previous,
                        orders: event.target.value,
                      }))
                    }
                    className="mt-1 block w-full rounded border border-gray-300 p-2"
                    rows={3}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              {encounter.type !== 'LAB' && (
                <button
                  type="button"
                  onClick={() => {
                    void saveMain();
                  }}
                  disabled={isSavingMain}
                  className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {isSavingMain ? 'Saving...' : 'Save Main'}
                </button>
              )}
              {encounter.type !== 'LAB' && (
                <button
                  type="button"
                  onClick={() => {
                    void finalizeEncounter();
                  }}
                  disabled={isFinalizing}
                  className="rounded bg-gray-900 px-4 py-2 text-white hover:bg-gray-700 disabled:opacity-60"
                >
                  {isFinalizing ? 'Finalizing...' : 'Finalize Encounter'}
                </button>
              )}
            </div>
            {encounter.type === 'LAB' && (
              <p className="text-sm text-slate-700">
                LAB encounters finalize automatically after all ordered tests are
                verified from this page or Operator Verify.
              </p>
            )}
          </div>
        )}
      </div>

      {encounter.type === 'LAB' && (
        <>
          <div className="rounded border bg-white p-6 shadow mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Order Tests</h2>
              <Link
                href={`/operator/orders/${encounterId}`}
                className="text-sm text-blue-600 hover:underline"
              >
                Open Orders Page →
              </Link>
            </div>
            {labCatalogLoading ? (
              <p className="text-sm text-gray-600">Loading LAB catalog...</p>
            ) : (
              <>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="min-w-64">
                    <label className="block text-sm font-medium">Catalog Test</label>
                    <select
                      value={selectedLabTestId}
                      onChange={(event) => setSelectedLabTestId(event.target.value)}
                      className="mt-1 block w-full rounded border border-gray-300 p-2"
                    >
                      {(labCatalog?.data ?? []).map((test) => (
                        <option key={test.id} value={test.id}>
                          {test.department} - {test.name} ({test.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      void addLabTestToEncounter();
                    }}
                    disabled={
                      isAddingLabTest ||
                      !selectedLabTestId ||
                      !canOrderLabTests
                    }
                    className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {isAddingLabTest ? 'Adding...' : 'Add to Encounter'}
                  </button>
                </div>
                {!canOrderLabTests && (
                    <p className="mt-3 text-sm text-amber-700">
                      Ordering is available only while encounter is CREATED, PREP, or IN_PROGRESS.
                    </p>
                )}
              </>
            )}
          </div>

          <div className="rounded border bg-white p-6 shadow mb-6">
            <h2 className="text-lg font-semibold mb-4">Enter Results</h2>
            {encounterLabTestsLoading ? (
              <p className="text-sm text-gray-600">Loading ordered tests...</p>
            ) : orderedLabTests.length === 0 ? (
              <p className="text-sm text-gray-600">
                No ordered LAB tests yet. Add a test first.
              </p>
            ) : (
              <div className="space-y-5">
                {orderedLabTests.map((orderedTest) => {
                  const resultByParameterId = new Map(
                    orderedTest.results.map((result) => [result.parameterId, result]),
                  );

                  return (
                    <div
                      key={orderedTest.orderItem.id}
                      className="rounded border border-gray-200 p-4"
                    >
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">
                          {orderedTest.test.department} - {orderedTest.test.name} (
                          {orderedTest.test.code})
                        </p>
                        <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium">
                          {orderedTest.orderItem.status}
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full border border-gray-200 text-sm">
                          <thead>
                            <tr className="bg-gray-50 text-left">
                              <th className="border border-gray-200 px-2 py-2">Reg #</th>
                              <th className="border border-gray-200 px-2 py-2">Parameter</th>
                              <th className="border border-gray-200 px-2 py-2">Result</th>
                              <th className="border border-gray-200 px-2 py-2">Unit</th>
                              <th className="border border-gray-200 px-2 py-2">Range</th>
                              <th className="border border-gray-200 px-2 py-2">Flag</th>
                            </tr>
                          </thead>
                          <tbody>
                            {orderedTest.parameters.map((parameter) => {
                              const result = resultByParameterId.get(parameter.id);
                              const reference =
                                parameter.refText ??
                                (parameter.refLow !== null && parameter.refHigh !== null
                                  ? `${parameter.refLow}-${parameter.refHigh}`
                                  : parameter.refLow !== null
                                    ? `>= ${parameter.refLow}`
                                    : parameter.refHigh !== null
                                      ? `<= ${parameter.refHigh}`
                                      : '-');

                              return (
                                <tr key={parameter.id}>
                                  <td className="border border-gray-200 px-2 py-2 font-medium text-gray-700">
                                    {patient?.regNo ?? '—'}
                                  </td>
                                  <td className="border border-gray-200 px-2 py-2">
                                    {parameter.name}
                                  </td>
                                  <td className="border border-gray-200 px-2 py-2">
                                    {encounterStatus === 'IN_PROGRESS' &&
                                    orderedTest.orderItem.status !== 'VERIFIED' ? (
                                      <input
                                        value={
                                          labResultDrafts[orderedTest.orderItem.id]?.[
                                            parameter.id
                                          ] ?? ''
                                        }
                                        onChange={(event) =>
                                          updateLabResultDraft(
                                            orderedTest.orderItem.id,
                                            parameter.id,
                                            event.target.value,
                                          )
                                        }
                                        className="w-full rounded border border-gray-300 p-1"
                                      />
                                    ) : (
                                      <span>{result?.value ?? '-'}</span>
                                    )}
                                  </td>
                                  <td className="border border-gray-200 px-2 py-2">
                                    {parameter.unit ?? '-'}
                                  </td>
                                  <td className="border border-gray-200 px-2 py-2">
                                    {reference}
                                  </td>
                                  <td className="border border-gray-200 px-2 py-2">
                                    {result?.flag ?? 'UNKNOWN'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      {encounterStatus === 'IN_PROGRESS' && (
                        <div className="mt-3 flex flex-wrap gap-3">
                          {orderedTest.orderItem.status !== 'VERIFIED' && (
                            <button
                              type="button"
                              onClick={() => {
                                void submitLabOrderResults(orderedTest);
                              }}
                              disabled={savingLabOrderItemId === orderedTest.orderItem.id}
                              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
                            >
                              {savingLabOrderItemId === orderedTest.orderItem.id
                                ? 'Saving...'
                                : 'Submit Results'}
                            </button>
                          )}
                          {orderedTest.orderItem.status === 'RESULTS_ENTERED' && (
                            <button
                              type="button"
                              onClick={() => {
                                void verifyLabOrderResults(orderedTest);
                              }}
                              disabled={verifyingLabOrderItemId === orderedTest.orderItem.id}
                              className="rounded bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:opacity-60"
                            >
                              {verifyingLabOrderItemId === orderedTest.orderItem.id
                                ? 'Verifying...'
                                : 'Verify'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {(encounterStatus === 'FINALIZED' || encounterStatus === 'DOCUMENTED') && (
        <div className="rounded border bg-white p-6 shadow">
          <h2 className="text-lg font-semibold mb-4">Document</h2>
          {documentMeta ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-5">
              <p>
                <span className="font-semibold">Document ID:</span> {documentMeta.id}
              </p>
              <p>
                <span className="font-semibold">Type:</span> {documentMeta.type}
              </p>
              <p>
                <span className="font-semibold">Status:</span> {documentMeta.status}
              </p>
              <p>
                <span className="font-semibold">Payload Hash:</span>{' '}
                {documentMeta.payloadHash}
              </p>
              <p>
                <span className="font-semibold">PDF Hash:</span> {documentMeta.pdfHash ?? '-'}
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-600 mb-5">
              {encounter.type === 'LAB'
                ? 'Publish the LAB report below to generate the PDF.'
                : 'No document metadata loaded yet.'}
            </p>
          )}

          {encounter.type !== 'LAB' && (
            <div className="mb-4 max-w-sm">
              <label className="block text-sm font-medium">Document Type</label>
              <select
                value={selectedDocumentType}
                onChange={(event) =>
                  setSelectedDocumentType(event.target.value as RequestedDocumentType)
                }
                className="mt-1 block w-full rounded border border-gray-300 p-2"
              >
                {availableDocumentTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {encounter.type === 'LAB' ? (
              <button
                type="button"
                onClick={() => {
                  void publishLabReport();
                }}
                disabled={isPublishingLabReport}
                className="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {isPublishingLabReport ? 'Publishing...' : 'Publish LAB Report'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  void generateDocument();
                }}
                disabled={isGeneratingDocument}
                className="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {isGeneratingDocument ? 'Generating...' : 'Generate Document'}
              </button>
            )}
            {documentMeta && (
              <button
                type="button"
                onClick={() => {
                  void refreshDocument();
                }}
                disabled={isRefreshingDocument}
                className="rounded bg-gray-700 px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-60"
              >
                {isRefreshingDocument ? 'Refreshing...' : 'Refresh Status'}
              </button>
            )}
            {documentMeta?.status === 'RENDERED' && (
              <button
                type="button"
                onClick={() => {
                  void downloadDocument();
                }}
                disabled={isDownloadingDocument}
                className="rounded bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {isDownloadingDocument ? 'Downloading...' : 'Download PDF'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
