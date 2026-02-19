import { DocumentType as PrismaDocumentType } from '@prisma/client';

export const REQUESTED_DOCUMENT_TYPES = [
  'ENCOUNTER_SUMMARY_V1',
  'LAB_REPORT_V1',
  'OPD_SUMMARY_V1',
  'RAD_REPORT_V1',
  'BB_ISSUE_SLIP_V1',
  'IPD_SUMMARY_V1',
] as const;

export type RequestedDocumentType = (typeof REQUESTED_DOCUMENT_TYPES)[number];

export type DocumentCommandRequest = {
  documentType: RequestedDocumentType;
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
  // Storage enum remains generic in this phase. Request type is persisted in payload.meta.
  return PrismaDocumentType.ENCOUNTER_SUMMARY;
}

export function requestedTypeFromPayloadJson(
  payloadJson: unknown,
  fallbackStoredType: PrismaDocumentType,
): RequestedDocumentType {
  const fallbackRequestedType: RequestedDocumentType =
    fallbackStoredType === PrismaDocumentType.ENCOUNTER_SUMMARY
      ? 'ENCOUNTER_SUMMARY_V1'
      : 'ENCOUNTER_SUMMARY_V1';

  if (typeof payloadJson !== 'object' || payloadJson === null) {
    return fallbackRequestedType;
  }

  const payloadRecord = payloadJson as Record<string, unknown>;
  const metaValue = payloadRecord.meta;

  if (typeof metaValue !== 'object' || metaValue === null) {
    return fallbackRequestedType;
  }

  const meta = metaValue as Record<string, unknown>;
  const requested = meta.documentType;

  if (isRequestedDocumentType(requested)) {
    return requested;
  }

  return fallbackRequestedType;
}

export function templateKeyFromPayloadJson(
  payloadJson: unknown,
  fallback: RequestedDocumentType,
): string {
  if (typeof payloadJson !== 'object' || payloadJson === null) {
    return fallback;
  }

  const payloadRecord = payloadJson as Record<string, unknown>;
  const metaValue = payloadRecord.meta;

  if (typeof metaValue !== 'object' || metaValue === null) {
    return fallback;
  }

  const meta = metaValue as Record<string, unknown>;
  const templateKey = meta.templateKey;

  if (typeof templateKey === 'string' && templateKey.length > 0) {
    return templateKey;
  }

  return fallback;
}
