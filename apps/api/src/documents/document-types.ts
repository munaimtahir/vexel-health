import { DocumentType as PrismaDocumentType } from '@prisma/client';

export const REQUESTED_DOCUMENT_TYPES = [
  'ENCOUNTER_SUMMARY',
  'LAB_REPORT',
  'RAD_REPORT',
  'OPD_CLINICAL_NOTE',
  'BB_TRANSFUSION_NOTE',
  'IPD_DISCHARGE_SUMMARY',
] as const;

export type RequestedDocumentType = (typeof REQUESTED_DOCUMENT_TYPES)[number];

export const DEFAULT_REQUESTED_DOCUMENT_TYPE: RequestedDocumentType =
  'ENCOUNTER_SUMMARY';

export type DocumentCommandRequest = {
  documentType?: RequestedDocumentType;
};

export function isRequestedDocumentType(
  value: unknown,
): value is RequestedDocumentType {
  return (
    typeof value === 'string' &&
    REQUESTED_DOCUMENT_TYPES.includes(value as RequestedDocumentType)
  );
}

export function toStoredDocumentType(
  _requested: RequestedDocumentType,
): PrismaDocumentType {
  // Phase 4A persists all templates through the existing deterministic renderer key.
  return PrismaDocumentType.ENCOUNTER_SUMMARY;
}

export function requestedTypeFromPayloadJson(
  payloadJson: unknown,
  fallbackStoredType: PrismaDocumentType,
): RequestedDocumentType {
  if (typeof payloadJson !== 'object' || payloadJson === null) {
    return fallbackStoredType;
  }

  const payloadRecord = payloadJson as Record<string, unknown>;
  const metaValue = payloadRecord.meta;

  if (typeof metaValue !== 'object' || metaValue === null) {
    return fallbackStoredType;
  }

  const meta = metaValue as Record<string, unknown>;
  const requested = meta.requestedDocumentType;

  if (isRequestedDocumentType(requested)) {
    return requested;
  }

  return fallbackStoredType;
}

