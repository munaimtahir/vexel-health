import { type DocumentType } from '@prisma/client';
import { DomainException } from '../common/errors/domain.exception';
import { DOCUMENT_PAYLOAD_SAMPLES } from './document-payload.samples';
import {
  type RequestedDocumentType,
  toStoredDocumentType,
} from './document-types';

type JsonRecord = Record<string, unknown>;

type EncounterWithRelations = {
  id: string;
  encounterCode: string;
  type: string;
  status: string;
  startedAt: Date;
  endedAt: Date | null;
  createdAt: Date;
  patient: {
    id: string;
    regNo: string;
    name: string;
    dob: Date | null;
    gender: string | null;
    phone: string | null;
  };
  labPrep: {
    specimenType: string | null;
    collectedAt: Date | null;
    collectorName: string | null;
    receivedAt: Date | null;
  } | null;
  radPrep: {
    fastingRequired: boolean | null;
    fastingConfirmed: boolean | null;
    contrastPlanned: boolean | null;
    creatinineChecked: boolean | null;
    pregnancyScreenDone: boolean | null;
    notes: string | null;
  } | null;
  opdPrep: {
    systolicBp: number | null;
    diastolicBp: number | null;
    pulse: number | null;
    temperatureC: number | null;
    respiratoryRate: number | null;
    weightKg: number | null;
    spo2: number | null;
    triageNotes: string | null;
  } | null;
  bbPrep: {
    sampleReceivedAt: Date | null;
    aboGroup: string | null;
    rhType: string | null;
    componentRequested: string | null;
    unitsRequested: number | null;
    urgency: string | null;
  } | null;
  ipdPrep: {
    admissionReason: string | null;
    ward: string | null;
    bed: string | null;
    admittingNotes: string | null;
  } | null;
  labMain: {
    resultSummary: string | null;
    verifiedBy: string | null;
    verifiedAt: Date | null;
  } | null;
  radMain: {
    reportText: string | null;
    impression: string | null;
    radiologistName: string | null;
    reportedAt: Date | null;
  } | null;
  opdMain: {
    chiefComplaint: string | null;
    assessment: string | null;
    plan: string | null;
    prescriptionText: string | null;
  } | null;
  bbMain: {
    crossmatchResult: string | null;
    componentIssued: string | null;
    unitsIssued: number | null;
    issuedAt: Date | null;
    issueNotes: string | null;
  } | null;
  ipdMain: {
    dailyNote: string | null;
    orders: string | null;
  } | null;
};

export type BuiltDocumentPayload = {
  requestedDocumentType: RequestedDocumentType;
  storedDocumentType: DocumentType;
  payloadVersion: number;
  templateVersion: number;
  payload: JsonRecord;
};

const PAYLOAD_VERSION_BY_TYPE: Record<RequestedDocumentType, number> = {
  ENCOUNTER_SUMMARY: 1,
  LAB_REPORT: 1,
  RAD_REPORT: 1,
  OPD_CLINICAL_NOTE: 1,
  BB_TRANSFUSION_NOTE: 1,
  IPD_DISCHARGE_SUMMARY: 1,
};

const TEMPLATE_VERSION_BY_TYPE: Record<RequestedDocumentType, number> = {
  ENCOUNTER_SUMMARY: 1,
  LAB_REPORT: 1,
  RAD_REPORT: 1,
  OPD_CLINICAL_NOTE: 1,
  BB_TRANSFUSION_NOTE: 1,
  IPD_DISCHARGE_SUMMARY: 1,
};

function iso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function buildPayloadBase(
  encounter: EncounterWithRelations,
  requestedDocumentType: RequestedDocumentType,
): JsonRecord {
  return {
    meta: {
      requestedDocumentType,
      payloadVersion: PAYLOAD_VERSION_BY_TYPE[requestedDocumentType],
      templateVersion: TEMPLATE_VERSION_BY_TYPE[requestedDocumentType],
      schemaVersion: 1,
    },
    encounterId: encounter.id,
    encounterCode: encounter.encounterCode,
    encounterType: encounter.type,
    encounterStatus: 'FINALIZED',
    startedAt: iso(encounter.startedAt),
    endedAt: iso(encounter.endedAt),
    createdAt: iso(encounter.createdAt),
    patientId: encounter.patient.id,
    patientRegNo: encounter.patient.regNo,
    patientName: encounter.patient.name,
    patientDob: iso(encounter.patient.dob),
    patientGender: encounter.patient.gender,
    sampleFixture: DOCUMENT_PAYLOAD_SAMPLES[requestedDocumentType],
  };
}

function assertEncounterType(
  encounterType: string,
  expected: string,
  requestedDocumentType: RequestedDocumentType,
): void {
  if (encounterType !== expected) {
    throw new DomainException(
      'INVALID_DOCUMENT_TYPE',
      `${requestedDocumentType} is only valid for ${expected} encounters`,
    );
  }
}

export function buildPayloadForDocumentType(input: {
  encounter: EncounterWithRelations;
  requestedDocumentType: RequestedDocumentType;
}): BuiltDocumentPayload {
  const { encounter, requestedDocumentType } = input;
  const payload = buildPayloadBase(encounter, requestedDocumentType);

  if (requestedDocumentType === 'ENCOUNTER_SUMMARY') {
    return {
      requestedDocumentType,
      storedDocumentType: toStoredDocumentType(requestedDocumentType),
      payloadVersion: PAYLOAD_VERSION_BY_TYPE[requestedDocumentType],
      templateVersion: TEMPLATE_VERSION_BY_TYPE[requestedDocumentType],
      payload,
    };
  }

  if (requestedDocumentType === 'LAB_REPORT') {
    assertEncounterType(encounter.type, 'LAB', requestedDocumentType);
    return {
      requestedDocumentType,
      storedDocumentType: toStoredDocumentType(requestedDocumentType),
      payloadVersion: PAYLOAD_VERSION_BY_TYPE[requestedDocumentType],
      templateVersion: TEMPLATE_VERSION_BY_TYPE[requestedDocumentType],
      payload: {
        ...payload,
        labPrep: encounter.labPrep
          ? {
              specimenType: encounter.labPrep.specimenType,
              collectedAt: iso(encounter.labPrep.collectedAt),
              collectorName: encounter.labPrep.collectorName,
              receivedAt: iso(encounter.labPrep.receivedAt),
            }
          : null,
        labMain: encounter.labMain
          ? {
              resultSummary: encounter.labMain.resultSummary,
              verifiedBy: encounter.labMain.verifiedBy,
              verifiedAt: iso(encounter.labMain.verifiedAt),
            }
          : null,
      },
    };
  }

  if (requestedDocumentType === 'RAD_REPORT') {
    assertEncounterType(encounter.type, 'RAD', requestedDocumentType);
    return {
      requestedDocumentType,
      storedDocumentType: toStoredDocumentType(requestedDocumentType),
      payloadVersion: PAYLOAD_VERSION_BY_TYPE[requestedDocumentType],
      templateVersion: TEMPLATE_VERSION_BY_TYPE[requestedDocumentType],
      payload: {
        ...payload,
        radPrep: encounter.radPrep
          ? {
              fastingRequired: encounter.radPrep.fastingRequired,
              fastingConfirmed: encounter.radPrep.fastingConfirmed,
              contrastPlanned: encounter.radPrep.contrastPlanned,
              creatinineChecked: encounter.radPrep.creatinineChecked,
              pregnancyScreenDone: encounter.radPrep.pregnancyScreenDone,
              notes: encounter.radPrep.notes,
            }
          : null,
        radMain: encounter.radMain
          ? {
              reportText: encounter.radMain.reportText,
              impression: encounter.radMain.impression,
              radiologistName: encounter.radMain.radiologistName,
              reportedAt: iso(encounter.radMain.reportedAt),
            }
          : null,
      },
    };
  }

  if (requestedDocumentType === 'OPD_CLINICAL_NOTE') {
    assertEncounterType(encounter.type, 'OPD', requestedDocumentType);
    return {
      requestedDocumentType,
      storedDocumentType: toStoredDocumentType(requestedDocumentType),
      payloadVersion: PAYLOAD_VERSION_BY_TYPE[requestedDocumentType],
      templateVersion: TEMPLATE_VERSION_BY_TYPE[requestedDocumentType],
      payload: {
        ...payload,
        opdPrep: encounter.opdPrep
          ? {
              systolicBp: encounter.opdPrep.systolicBp,
              diastolicBp: encounter.opdPrep.diastolicBp,
              pulse: encounter.opdPrep.pulse,
              temperatureC: encounter.opdPrep.temperatureC,
              respiratoryRate: encounter.opdPrep.respiratoryRate,
              weightKg: encounter.opdPrep.weightKg,
              spo2: encounter.opdPrep.spo2,
              triageNotes: encounter.opdPrep.triageNotes,
            }
          : null,
        opdMain: encounter.opdMain
          ? {
              chiefComplaint: encounter.opdMain.chiefComplaint,
              assessment: encounter.opdMain.assessment,
              plan: encounter.opdMain.plan,
              prescriptionText: encounter.opdMain.prescriptionText,
            }
          : null,
      },
    };
  }

  if (requestedDocumentType === 'BB_TRANSFUSION_NOTE') {
    assertEncounterType(encounter.type, 'BB', requestedDocumentType);
    return {
      requestedDocumentType,
      storedDocumentType: toStoredDocumentType(requestedDocumentType),
      payloadVersion: PAYLOAD_VERSION_BY_TYPE[requestedDocumentType],
      templateVersion: TEMPLATE_VERSION_BY_TYPE[requestedDocumentType],
      payload: {
        ...payload,
        bbPrep: encounter.bbPrep
          ? {
              sampleReceivedAt: iso(encounter.bbPrep.sampleReceivedAt),
              aboGroup: encounter.bbPrep.aboGroup,
              rhType: encounter.bbPrep.rhType,
              componentRequested: encounter.bbPrep.componentRequested,
              unitsRequested: encounter.bbPrep.unitsRequested,
              urgency: encounter.bbPrep.urgency,
            }
          : null,
        bbMain: encounter.bbMain
          ? {
              crossmatchResult: encounter.bbMain.crossmatchResult,
              componentIssued: encounter.bbMain.componentIssued,
              unitsIssued: encounter.bbMain.unitsIssued,
              issuedAt: iso(encounter.bbMain.issuedAt),
              issueNotes: encounter.bbMain.issueNotes,
            }
          : null,
      },
    };
  }

  assertEncounterType(encounter.type, 'IPD', requestedDocumentType);
  return {
    requestedDocumentType,
    storedDocumentType: toStoredDocumentType(requestedDocumentType),
    payloadVersion: PAYLOAD_VERSION_BY_TYPE[requestedDocumentType],
    templateVersion: TEMPLATE_VERSION_BY_TYPE[requestedDocumentType],
    payload: {
      ...payload,
      ipdPrep: encounter.ipdPrep
        ? {
            admissionReason: encounter.ipdPrep.admissionReason,
            ward: encounter.ipdPrep.ward,
            bed: encounter.ipdPrep.bed,
            admittingNotes: encounter.ipdPrep.admittingNotes,
          }
        : null,
      ipdMain: encounter.ipdMain
        ? {
            dailyNote: encounter.ipdMain.dailyNote,
            orders: encounter.ipdMain.orders,
          }
        : null,
    },
  };
}

