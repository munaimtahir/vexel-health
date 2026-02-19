/**
 * Operator area route paths. Use for links and redirects.
 * No tenant IDs in paths; tenant comes from auth/session.
 */

export const operatorRoutes = {
  /** Operator registration route, which forwards into the shared patient registration form. */
  register: '/operator/register',
  /** Shared registration form used by operator registration flow. */
  sharedRegisterForm: '/patients/register',
  worklist: '/operator/worklist',
  worklistDetail: (encounterId: string) => `/operator/worklist/${encounterId}`,
  samples: '/operator/samples',
  samplesDetail: (encounterId: string) => `/operator/samples/${encounterId}`,
  verify: '/operator/verify',
  verifyDetail: (encounterId: string) => `/operator/verify/${encounterId}`,
  publishedReports: '/operator/reports/published',
  publishedReportDetail: (encounterId: string) =>
    `/operator/reports/published/${encounterId}`,
} as const;
