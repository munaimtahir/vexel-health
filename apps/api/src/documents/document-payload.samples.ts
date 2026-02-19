import type { RequestedDocumentType } from './document-types';

type JsonRecord = Record<string, unknown>;

export const DOCUMENT_PAYLOAD_SAMPLES: Record<RequestedDocumentType, JsonRecord> = {
  ENCOUNTER_SUMMARY_V1: {
    patient: {
      regNo: 'REG-00000001',
      name: 'Demo Patient',
    },
    encounter: {
      encounterCode: 'LAB-2026-000001',
      type: 'LAB',
      status: 'FINALIZED',
    },
  },
  LAB_REPORT_V1: {
    prep: {
      specimenType: 'Blood',
    },
    main: {
      resultSummary: 'Hemoglobin in expected range.',
      verifiedBy: 'Lab Specialist',
    },
  },
  OPD_SUMMARY_V1: {
    main: {
      chiefComplaint: 'Fever and cough for 3 days',
      assessment: 'Likely viral URI',
      plan: 'Hydration and rest',
    },
  },
  RAD_REPORT_V1: {
    main: {
      reportText: 'No acute cardiopulmonary abnormality.',
      impression: 'Stable chest radiograph.',
      radiologistName: 'Dr. Ray',
    },
  },
  BB_ISSUE_SLIP_V1: {
    main: {
      crossmatchResult: 'COMPATIBLE',
      componentIssued: 'PRBC',
      unitsIssued: 1,
    },
  },
  IPD_SUMMARY_V1: {
    prep: {
      admissionReason: 'Community acquired pneumonia',
    },
    main: {
      dailyNote: 'Improving with antibiotics',
      orders: 'Discharge in 24 hours if stable',
    },
  },
};
