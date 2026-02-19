import type { RequestedDocumentType } from './document-types';

type JsonRecord = Record<string, unknown>;

export const DOCUMENT_PAYLOAD_SAMPLES: Record<RequestedDocumentType, JsonRecord> = {
  ENCOUNTER_SUMMARY: {
    encounterCode: 'LAB-2026-000001',
    encounterType: 'LAB',
    patientRegNo: 'REG-00000001',
    patientName: 'Demo Patient',
  },
  LAB_REPORT: {
    specimenType: 'Blood',
    resultSummary: 'Hemoglobin in expected range.',
    verifiedBy: 'Lab Specialist',
  },
  RAD_REPORT: {
    reportText: 'No acute cardiopulmonary abnormality.',
    impression: 'Stable chest radiograph.',
    radiologistName: 'Dr. Ray',
  },
  OPD_CLINICAL_NOTE: {
    chiefComplaint: 'Fever and cough for 3 days',
    assessment: 'Likely viral URI',
    plan: 'Hydration, rest, follow-up in 48 hours',
  },
  BB_TRANSFUSION_NOTE: {
    crossmatchResult: 'COMPATIBLE',
    componentIssued: 'PRBC',
    unitsIssued: 1,
  },
  IPD_DISCHARGE_SUMMARY: {
    admissionReason: 'Community acquired pneumonia',
    dailyNote: 'Improving with antibiotics',
    orders: 'Discharge with oral medication and review in 1 week',
  },
};

