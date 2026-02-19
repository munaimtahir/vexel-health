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
  labOrderItems?: Array<{
    id: string;
    status: string;
    createdAt: Date;
    test: {
      code: string;
      name: string;
      department: string;
      parameters: Array<{
        id: string;
        name: string;
        unit: string | null;
        refLow: number | null;
        refHigh: number | null;
        refText: string | null;
        displayOrder: number;
        active: boolean;
      }>;
    };
    results: Array<{
      id: string;
      parameterId: string;
      value: string;
      valueNumeric: number | null;
      flag: string;
      enteredBy: string | null;
      enteredAt: Date | null;
      verifiedBy: string | null;
      verifiedAt: Date | null;
    }>;
  }>;
};

type LabOrderItemForPayload = NonNullable<
  EncounterWithRelations['labOrderItems']
>[number];

export type BuiltDocumentPayload = {
  documentType: RequestedDocumentType;
  templateKey: string;
  storedDocumentType: DocumentType;
  payloadVersion: number;
  templateVersion: number;
  payload: JsonRecord;
};

const PAYLOAD_VERSION = 1;
const TEMPLATE_VERSION = 1;

function iso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function assertCompatibleType(
  encounterType: string,
  requestedDocumentType: RequestedDocumentType,
): void {
  if (requestedDocumentType === 'ENCOUNTER_SUMMARY_V1') {
    return;
  }

  const map: Record<RequestedDocumentType, string> = {
    ENCOUNTER_SUMMARY_V1: '',
    LAB_REPORT_V1: 'LAB',
    OPD_SUMMARY_V1: 'OPD',
    RAD_REPORT_V1: 'RAD',
    BB_ISSUE_SLIP_V1: 'BB',
    IPD_SUMMARY_V1: 'IPD',
  };

  const expectedEncounterType = map[requestedDocumentType];
  if (encounterType !== expectedEncounterType) {
    throw new DomainException(
      'INVALID_DOCUMENT_TYPE',
      `${requestedDocumentType} is only valid for ${expectedEncounterType} encounters`,
    );
  }
}

function buildBasePayload(input: {
  tenantId: string;
  encounter: EncounterWithRelations;
  documentType: RequestedDocumentType;
}): JsonRecord {
  const { tenantId, encounter, documentType } = input;

  return {
    meta: {
      documentType,
      templateKey: documentType,
      templateVersion: TEMPLATE_VERSION,
      payloadVersion: PAYLOAD_VERSION,
      schemaVersion: 1,
      sampleFixture: DOCUMENT_PAYLOAD_SAMPLES[documentType],
    },
    tenant: {
      id: tenantId,
    },
    patient: {
      id: encounter.patient.id,
      regNo: encounter.patient.regNo,
      name: encounter.patient.name,
      dob: iso(encounter.patient.dob),
      gender: encounter.patient.gender,
      phone: encounter.patient.phone,
    },
    encounter: {
      id: encounter.id,
      encounterCode: encounter.encounterCode,
      type: encounter.type,
      status: 'FINALIZED',
      startedAt: iso(encounter.startedAt),
      endedAt: iso(encounter.endedAt),
      createdAt: iso(encounter.createdAt),
    },
  };
}

function buildPrepPayload(encounter: EncounterWithRelations): JsonRecord {
  return {
    lab: encounter.labPrep
      ? {
          specimenType: encounter.labPrep.specimenType,
          collectedAt: iso(encounter.labPrep.collectedAt),
          collectorName: encounter.labPrep.collectorName,
          receivedAt: iso(encounter.labPrep.receivedAt),
        }
      : null,
    rad: encounter.radPrep
      ? {
          fastingRequired: encounter.radPrep.fastingRequired,
          fastingConfirmed: encounter.radPrep.fastingConfirmed,
          contrastPlanned: encounter.radPrep.contrastPlanned,
          creatinineChecked: encounter.radPrep.creatinineChecked,
          pregnancyScreenDone: encounter.radPrep.pregnancyScreenDone,
          notes: encounter.radPrep.notes,
        }
      : null,
    opd: encounter.opdPrep
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
    bb: encounter.bbPrep
      ? {
          sampleReceivedAt: iso(encounter.bbPrep.sampleReceivedAt),
          aboGroup: encounter.bbPrep.aboGroup,
          rhType: encounter.bbPrep.rhType,
          componentRequested: encounter.bbPrep.componentRequested,
          unitsRequested: encounter.bbPrep.unitsRequested,
          urgency: encounter.bbPrep.urgency,
        }
      : null,
    ipd: encounter.ipdPrep
      ? {
          admissionReason: encounter.ipdPrep.admissionReason,
          ward: encounter.ipdPrep.ward,
          bed: encounter.ipdPrep.bed,
          admittingNotes: encounter.ipdPrep.admittingNotes,
        }
      : null,
  };
}

function buildMainPayload(encounter: EncounterWithRelations): JsonRecord {
  return {
    lab: encounter.labMain
      ? {
          resultSummary: encounter.labMain.resultSummary,
          verifiedBy: encounter.labMain.verifiedBy,
          verifiedAt: iso(encounter.labMain.verifiedAt),
        }
      : null,
    rad: encounter.radMain
      ? {
          reportText: encounter.radMain.reportText,
          impression: encounter.radMain.impression,
          radiologistName: encounter.radMain.radiologistName,
          reportedAt: iso(encounter.radMain.reportedAt),
        }
      : null,
    opd: encounter.opdMain
      ? {
          chiefComplaint: encounter.opdMain.chiefComplaint,
          assessment: encounter.opdMain.assessment,
          plan: encounter.opdMain.plan,
          prescriptionText: encounter.opdMain.prescriptionText,
        }
      : null,
    bb: encounter.bbMain
      ? {
          crossmatchResult: encounter.bbMain.crossmatchResult,
          componentIssued: encounter.bbMain.componentIssued,
          unitsIssued: encounter.bbMain.unitsIssued,
          issuedAt: iso(encounter.bbMain.issuedAt),
          issueNotes: encounter.bbMain.issueNotes,
        }
      : null,
    ipd: encounter.ipdMain
      ? {
          dailyNote: encounter.ipdMain.dailyNote,
          orders: encounter.ipdMain.orders,
        }
      : null,
  };
}

function buildReferenceText(parameter: {
  refLow: number | null;
  refHigh: number | null;
  refText: string | null;
}): string {
  if (parameter.refText && parameter.refText.trim().length > 0) {
    return parameter.refText.trim();
  }

  if (parameter.refLow !== null && parameter.refHigh !== null) {
    return `${parameter.refLow}-${parameter.refHigh}`;
  }

  if (parameter.refLow !== null) {
    return `>= ${parameter.refLow}`;
  }

  if (parameter.refHigh !== null) {
    return `<= ${parameter.refHigh}`;
  }

  return '-';
}

function hasNonEmptyResultValue(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isLabOrderItemPublishable(
  orderItem: LabOrderItemForPayload,
): boolean {
  if (orderItem.status !== 'VERIFIED') {
    return false;
  }

  const activeParameters = orderItem.test.parameters.filter(
    (parameter) => parameter.active,
  );

  if (activeParameters.length === 0) {
    return orderItem.results.some(
      (result) =>
        result.verifiedAt !== null && hasNonEmptyResultValue(result.value),
    );
  }

  const resultByParameterId = new Map(
    orderItem.results.map((result) => [result.parameterId, result]),
  );

  return activeParameters.every((parameter) => {
    const result = resultByParameterId.get(parameter.id);
    return Boolean(
      result &&
      result.verifiedAt !== null &&
      hasNonEmptyResultValue(result.value),
    );
  });
}

export function selectPublishableLabOrderItems(
  encounter: EncounterWithRelations,
): LabOrderItemForPayload[] {
  return (encounter.labOrderItems ?? []).filter(isLabOrderItemPublishable);
}

function buildLabStructuredPayload(
  orderItems: LabOrderItemForPayload[],
): JsonRecord {
  const sortedOrderItems = [...orderItems].sort((left, right) => {
    const departmentOrder = left.test.department.localeCompare(
      right.test.department,
    );
    if (departmentOrder !== 0) {
      return departmentOrder;
    }

    const nameOrder = left.test.name.localeCompare(right.test.name);
    if (nameOrder !== 0) {
      return nameOrder;
    }

    const codeOrder = left.test.code.localeCompare(right.test.code);
    if (codeOrder !== 0) {
      return codeOrder;
    }

    return left.id.localeCompare(right.id);
  });

  const tests = sortedOrderItems.map((orderItem) => {
    const orderedParameters = [...orderItem.test.parameters]
      .filter((parameter) => parameter.active)
      .sort((left, right) => {
        if (left.displayOrder !== right.displayOrder) {
          return left.displayOrder - right.displayOrder;
        }
        return left.name.localeCompare(right.name);
      });

    const resultByParameterId = new Map(
      orderItem.results.map((result) => [result.parameterId, result]),
    );

    const parameters = orderedParameters.map((parameter) => {
      const result = resultByParameterId.get(parameter.id);
      return {
        name: parameter.name,
        value: result?.value ?? '',
        unit: parameter.unit,
        flag: result?.flag ?? 'UNKNOWN',
        reference: buildReferenceText(parameter),
      };
    });

    return {
      testCode: orderItem.test.code,
      testName: orderItem.test.name,
      department: orderItem.test.department,
      parameters,
    };
  });

  const verifiedRows = sortedOrderItems
    .flatMap((orderItem) => orderItem.results)
    .filter((result) => result.verifiedAt !== null)
    .sort((left, right) => {
      const leftTime = left.verifiedAt?.getTime() ?? 0;
      const rightTime = right.verifiedAt?.getTime() ?? 0;
      if (leftTime !== rightTime) {
        return rightTime - leftTime;
      }
      return (left.verifiedBy ?? '').localeCompare(right.verifiedBy ?? '');
    });

  const latestVerified = verifiedRows[0];

  return {
    tests,
    verifiedSummary: latestVerified
      ? {
          verifiedBy: latestVerified.verifiedBy,
          verifiedAt: iso(latestVerified.verifiedAt),
        }
      : null,
  };
}

function pickModulePrep(
  documentType: RequestedDocumentType,
  prep: JsonRecord,
): JsonRecord | null {
  if (documentType === 'LAB_REPORT_V1') {
    return prep.lab as JsonRecord | null;
  }
  if (documentType === 'RAD_REPORT_V1') {
    return prep.rad as JsonRecord | null;
  }
  if (documentType === 'OPD_SUMMARY_V1') {
    return prep.opd as JsonRecord | null;
  }
  if (documentType === 'BB_ISSUE_SLIP_V1') {
    return prep.bb as JsonRecord | null;
  }
  if (documentType === 'IPD_SUMMARY_V1') {
    return prep.ipd as JsonRecord | null;
  }
  return null;
}

function pickModuleMain(
  documentType: RequestedDocumentType,
  main: JsonRecord,
): JsonRecord | null {
  if (documentType === 'LAB_REPORT_V1') {
    return main.lab as JsonRecord | null;
  }
  if (documentType === 'RAD_REPORT_V1') {
    return main.rad as JsonRecord | null;
  }
  if (documentType === 'OPD_SUMMARY_V1') {
    return main.opd as JsonRecord | null;
  }
  if (documentType === 'BB_ISSUE_SLIP_V1') {
    return main.bb as JsonRecord | null;
  }
  if (documentType === 'IPD_SUMMARY_V1') {
    return main.ipd as JsonRecord | null;
  }
  return null;
}

export function buildPayloadForDocumentType(input: {
  tenantId: string;
  encounter: EncounterWithRelations;
  documentType: RequestedDocumentType;
}): BuiltDocumentPayload {
  const { tenantId, encounter, documentType } = input;

  assertCompatibleType(encounter.type, documentType);

  const basePayload = buildBasePayload({
    tenantId,
    encounter,
    documentType,
  });
  const prepPayload = buildPrepPayload(encounter);
  const mainPayload = buildMainPayload(encounter);

  const payload: JsonRecord = {
    ...basePayload,
    prep:
      documentType === 'ENCOUNTER_SUMMARY_V1'
        ? prepPayload
        : pickModulePrep(documentType, prepPayload),
    main:
      documentType === 'ENCOUNTER_SUMMARY_V1'
        ? mainPayload
        : pickModuleMain(documentType, mainPayload),
  };

  if (documentType === 'LAB_REPORT_V1') {
    const publishableLabOrderItems = selectPublishableLabOrderItems(encounter);
    if (publishableLabOrderItems.length === 0) {
      throw new DomainException(
        'LAB_PUBLISH_BLOCKED_NO_VERIFIED_TESTS',
        'At least one fully verified LAB test is required before report publishing',
      );
    }

    payload.lab = buildLabStructuredPayload(publishableLabOrderItems);
  }

  return {
    documentType,
    templateKey: documentType,
    storedDocumentType: toStoredDocumentType(documentType),
    payloadVersion: PAYLOAD_VERSION,
    templateVersion: TEMPLATE_VERSION,
    payload,
  };
}
