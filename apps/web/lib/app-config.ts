/**
 * Client-visible app config (env and constants).
 * Lab/tenant display name for header branding.
 */
const labName =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_LAB_NAME?.trim()) ||
  'Lab';

export const appConfig = {
  /** Display name for the lab/tenant in operator header and branding */
  labName,
} as const;
