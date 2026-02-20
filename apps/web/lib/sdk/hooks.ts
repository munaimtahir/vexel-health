/**
 * Query key factories for operator / LIMS data. Use with TanStack Query.
 */

export const operatorKeys = {
  all: ['operator'] as const,
  patients: () => [...operatorKeys.all, 'patients'] as const,
  patientList: (query?: string) => [...operatorKeys.patients(), 'list', query] as const,
  patient: (id: string) => [...operatorKeys.patients(), id] as const,
  encounters: () => [...operatorKeys.all, 'encounters'] as const,
  encounterList: (params?: { page?: number; type?: string; status?: string }) =>
    [...operatorKeys.encounters(), 'list', params] as const,
  encounter: (id: string) => [...operatorKeys.encounters(), id] as const,
  orderQueue: () => [...operatorKeys.all, 'lab', 'order-queue'] as const,
  resultEntryQueue: () => [...operatorKeys.all, 'lab', 'result-entry-queue'] as const,
  verificationQueue: () => [...operatorKeys.all, 'lab', 'verification-queue'] as const,
};

export const adminKeys = {
  all: ['admin'] as const,
  me: () => [...adminKeys.all, 'me'] as const,
  overview: () => [...adminKeys.all, 'overview'] as const,
  features: () => [...adminKeys.all, 'features'] as const,
  users: () => [...adminKeys.all, 'users'] as const,
  usersList: (params?: { page?: number; limit?: number; query?: string }) =>
    [...adminKeys.users(), 'list', params] as const,
  user: (userId: string) => [...adminKeys.users(), userId] as const,
  catalog: () => [...adminKeys.all, 'catalog'] as const,
  tests: () => [...adminKeys.catalog(), 'tests'] as const,
  test: (testId: string) => [...adminKeys.tests(), testId] as const,
  testParameters: (testId: string) => [...adminKeys.catalog(), 'test-parameters', testId] as const,
  panels: () => [...adminKeys.catalog(), 'panels'] as const,
  panel: (panelId: string) => [...adminKeys.panels(), panelId] as const,
  parameter: (parameterId: string) => [...adminKeys.catalog(), 'parameter', parameterId] as const,
  linkingState: () => [...adminKeys.catalog(), 'linking-state'] as const,
  referenceRanges: (testId: string) => [...adminKeys.catalog(), 'reference-ranges', testId] as const,
  importJobs: () => [...adminKeys.catalog(), 'import-jobs'] as const,
  importJob: (jobId: string) => [...adminKeys.importJobs(), jobId] as const,
  exportJobs: () => [...adminKeys.catalog(), 'export-jobs'] as const,
  branding: () => [...adminKeys.all, 'branding'] as const,
  reportDesign: () => [...adminKeys.all, 'report-design'] as const,
  receiptDesign: () => [...adminKeys.all, 'receipt-design'] as const,
  catalogTests: () => [...adminKeys.catalog(), 'catalog-tests'] as const,
  catalogTest: (testId: string) => [...adminKeys.catalogTests(), testId] as const,
  catalogTestMapping: (testId: string) => [...adminKeys.catalogTest(testId), 'mapping'] as const,
  catalogParameters: () => [...adminKeys.catalog(), 'parameters'] as const,
  catalogParameter: (parameterId: string) => [...adminKeys.catalogParameters(), parameterId] as const,
  catalogVersions: (status?: string) => [...adminKeys.catalog(), 'versions', status] as const,
  catalogAudits: (versionId?: string) => [...adminKeys.catalog(), 'audits', versionId] as const,
  catalogLayouts: () => [...adminKeys.catalog(), 'layouts'] as const,
  catalogAnnotations: (testId?: string, parameterId?: string) =>
    [...adminKeys.catalog(), 'annotations', testId, parameterId] as const,
};
