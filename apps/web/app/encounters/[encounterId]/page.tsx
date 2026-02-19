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
  const options: RequestedDocumentType[] = ['ENCOUNTER_SUMMARY'];

  if (encounterType === 'LAB') {
    options.push('LAB_REPORT');
  } else if (encounterType === 'RAD') {
    options.push('RAD_REPORT');
  } else if (encounterType === 'OPD') {
    options.push('OPD_CLINICAL_NOTE');
  } else if (encounterType === 'BB') {
    options.push('BB_TRANSFUSION_NOTE');
  } else if (encounterType === 'IPD') {
    options.push('IPD_DISCHARGE_SUMMARY');
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
  const [isSavingPrep, setIsSavingPrep] = useState(false);
  const [isStartingMain, setIsStartingMain] = useState(false);
  const [isSavingMain, setIsSavingMain] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isGeneratingDocument, setIsGeneratingDocument] = useState(false);
  const [isRefreshingDocument, setIsRefreshingDocument] = useState(false);
  const [isDownloadingDocument, setIsDownloadingDocument] = useState(false);
  const [prepForm, setPrepForm] = useState<PrepFormState>(defaultPrepFormState);
  const [mainForm, setMainForm] = useState<MainFormState>(defaultMainFormState);
  const [documentMeta, setDocumentMeta] = useState<DocumentResponse | null>(null);
  const [selectedDocumentType, setSelectedDocumentType] =
    useState<RequestedDocumentType>('ENCOUNTER_SUMMARY');

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
      return ['ENCOUNTER_SUMMARY'] as RequestedDocumentType[];
    }

    return documentTypeOptions(encounter.type);
  }, [encounter]);

  useEffect(() => {
    if (!encounter) {
      return;
    }

    setSelectedDocumentType(defaultDocumentType(encounter.type));
  }, [encounter?.id]);

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
      {mainError && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-red-700">
          {mainError instanceof Error ? mainError.message : 'Failed to load main data'}
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

        {encounter.status === 'IN_PROGRESS' && (
          <div className="space-y-4">
            {encounter.type === 'LAB' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium">Result Summary</label>
                  <textarea
                    value={mainForm.resultSummary}
                    onChange={(event) =>
                      setMainForm((previous) => ({
                        ...previous,
                        resultSummary: event.target.value,
                      }))
                    }
                    className="mt-1 block w-full rounded border border-gray-300 p-2"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Verified By</label>
                  <input
                    value={mainForm.verifiedBy}
                    onChange={(event) =>
                      setMainForm((previous) => ({
                        ...previous,
                        verifiedBy: event.target.value,
                      }))
                    }
                    className="mt-1 block w-full rounded border border-gray-300 p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Verified At</label>
                  <input
                    type="datetime-local"
                    value={mainForm.verifiedAt}
                    onChange={(event) =>
                      setMainForm((previous) => ({
                        ...previous,
                        verifiedAt: event.target.value,
                      }))
                    }
                    className="mt-1 block w-full rounded border border-gray-300 p-2"
                  />
                </div>
              </div>
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
            </div>
          </div>
        )}
      </div>

      {(encounter.status === 'FINALIZED' || encounter.status === 'DOCUMENTED') && (
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
              No document metadata loaded yet.
            </p>
          )}

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

          <div className="flex flex-wrap gap-3">
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
