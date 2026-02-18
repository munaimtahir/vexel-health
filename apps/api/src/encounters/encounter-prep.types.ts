export type EncounterType = 'LAB' | 'RAD' | 'OPD' | 'BB' | 'IPD';

export type LabPrepSaveRequest = {
  specimenType?: string | null;
  collectedAt?: string | null;
  collectorName?: string | null;
  receivedAt?: string | null;
};

export type RadPrepSaveRequest = {
  fastingRequired?: boolean | null;
  fastingConfirmed?: boolean | null;
  contrastPlanned?: boolean | null;
  creatinineChecked?: boolean | null;
  pregnancyScreenDone?: boolean | null;
  notes?: string | null;
};

export type OpdPrepSaveRequest = {
  systolicBp?: number | null;
  diastolicBp?: number | null;
  pulse?: number | null;
  temperatureC?: number | null;
  respiratoryRate?: number | null;
  weightKg?: number | null;
  spo2?: number | null;
  triageNotes?: string | null;
};

export type BbPrepSaveRequest = {
  sampleReceivedAt?: string | null;
  aboGroup?: string | null;
  rhType?: string | null;
  componentRequested?: string | null;
  unitsRequested?: number | null;
  urgency?: 'ROUTINE' | 'URGENT' | null;
};

export type IpdPrepSaveRequest = {
  admissionReason?: string | null;
  ward?: string | null;
  bed?: string | null;
  admittingNotes?: string | null;
};

export type EncounterPrepSaveRequest =
  | LabPrepSaveRequest
  | RadPrepSaveRequest
  | OpdPrepSaveRequest
  | BbPrepSaveRequest
  | IpdPrepSaveRequest;

export type EncounterPrepResponse = {
  encounterId: string;
  type: EncounterType;
  updatedAt: string | null;
  labPrep: LabPrepSaveRequest | null;
  radPrep: RadPrepSaveRequest | null;
  opdPrep: OpdPrepSaveRequest | null;
  bbPrep: BbPrepSaveRequest | null;
  ipdPrep: IpdPrepSaveRequest | null;
};
