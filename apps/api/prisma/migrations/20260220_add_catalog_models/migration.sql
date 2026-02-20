-- Catalog domain (contract-first; tenant-scoped; deterministic)
-- TestDefinition, ParameterDefinition, TestParameterMap, ParameterReferenceRange,
-- ReportLayoutRule, TestAnnotation, CatalogVersion, CatalogAuditRun, CatalogUnit

CREATE TABLE IF NOT EXISTS "CatalogUnit" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "symbol" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CatalogUnit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TestDefinition" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "testCode" TEXT NOT NULL,
  "testName" TEXT NOT NULL,
  "section" TEXT,
  "specimenTypeId" TEXT,
  "tatMinutes" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'active',
  "layoutKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TestDefinition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ParameterDefinition" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "parameterCode" TEXT NOT NULL,
  "parameterName" TEXT NOT NULL,
  "resultType" TEXT NOT NULL,
  "unitId" TEXT,
  "precision" INTEGER,
  "defaultValue" TEXT,
  "enumOptions" JSONB,
  "formulaSpec" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ParameterDefinition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TestParameterMap" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "testId" TEXT NOT NULL,
  "parameterId" TEXT NOT NULL,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "required" BOOLEAN NOT NULL DEFAULT true,
  "visibility" TEXT NOT NULL DEFAULT 'normal',
  "readOnly" BOOLEAN NOT NULL DEFAULT false,
  "printFlag" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TestParameterMap_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ParameterReferenceRange" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "parameterId" TEXT NOT NULL,
  "sex" TEXT NOT NULL,
  "ageMinDays" INTEGER,
  "ageMaxDays" INTEGER,
  "refLow" DECIMAL(65,30),
  "refHigh" DECIMAL(65,30),
  "refText" TEXT,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "effectiveFrom" TIMESTAMP(3),
  "effectiveTo" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ParameterReferenceRange_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ReportLayoutRule" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "layoutKey" TEXT NOT NULL,
  "groupingStrategy" TEXT NOT NULL DEFAULT 'by_layout_key',
  "pageBreakPolicy" TEXT NOT NULL DEFAULT 'never',
  "maxTestsPerPage" INTEGER,
  "allowedCombineWith" JSONB,
  "renderStyle" TEXT NOT NULL DEFAULT 'table',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReportLayoutRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TestAnnotation" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "testId" TEXT,
  "parameterId" TEXT,
  "annotationType" TEXT NOT NULL,
  "placement" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "visibilityRule" TEXT NOT NULL DEFAULT 'always',
  "conditionSpec" TEXT,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TestAnnotation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CatalogVersion" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "versionTag" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "sha256Manifest" TEXT,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notes" TEXT,
  CONSTRAINT "CatalogVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CatalogAuditRun" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "catalogVersionId" TEXT,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "summaryJson" JSONB,
  "findingsJson" JSONB,
  "sha256" TEXT,
  CONSTRAINT "CatalogAuditRun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CatalogUnit_tenantId_code_key" ON "CatalogUnit"("tenantId", "code");
CREATE INDEX IF NOT EXISTS "CatalogUnit_tenantId_idx" ON "CatalogUnit"("tenantId");

CREATE UNIQUE INDEX IF NOT EXISTS "TestDefinition_tenantId_testCode_key" ON "TestDefinition"("tenantId", "testCode");
CREATE INDEX IF NOT EXISTS "TestDefinition_tenantId_status_section_idx" ON "TestDefinition"("tenantId", "status", "section");

CREATE UNIQUE INDEX IF NOT EXISTS "ParameterDefinition_tenantId_parameterCode_key" ON "ParameterDefinition"("tenantId", "parameterCode");
CREATE INDEX IF NOT EXISTS "ParameterDefinition_tenantId_status_idx" ON "ParameterDefinition"("tenantId", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "TestParameterMap_tenantId_testId_parameterId_key" ON "TestParameterMap"("tenantId", "testId", "parameterId");
CREATE INDEX IF NOT EXISTS "TestParameterMap_tenantId_testId_displayOrder_idx" ON "TestParameterMap"("tenantId", "testId", "displayOrder");

CREATE INDEX IF NOT EXISTS "ParameterReferenceRange_tenantId_parameterId_sex_priority_idx" ON "ParameterReferenceRange"("tenantId", "parameterId", "sex", "priority");

CREATE UNIQUE INDEX IF NOT EXISTS "ReportLayoutRule_tenantId_layoutKey_key" ON "ReportLayoutRule"("tenantId", "layoutKey");
CREATE INDEX IF NOT EXISTS "ReportLayoutRule_tenantId_idx" ON "ReportLayoutRule"("tenantId");

CREATE INDEX IF NOT EXISTS "TestAnnotation_tenantId_testId_idx" ON "TestAnnotation"("tenantId", "testId");
CREATE INDEX IF NOT EXISTS "TestAnnotation_tenantId_parameterId_idx" ON "TestAnnotation"("tenantId", "parameterId");

CREATE INDEX IF NOT EXISTS "CatalogVersion_tenantId_status_idx" ON "CatalogVersion"("tenantId", "status");

CREATE INDEX IF NOT EXISTS "CatalogAuditRun_tenantId_catalogVersionId_idx" ON "CatalogAuditRun"("tenantId", "catalogVersionId");
CREATE INDEX IF NOT EXISTS "CatalogAuditRun_tenantId_createdAt_idx" ON "CatalogAuditRun"("tenantId", "createdAt");

ALTER TABLE "ParameterDefinition" DROP CONSTRAINT IF EXISTS "ParameterDefinition_unitId_fkey";
ALTER TABLE "ParameterDefinition" ADD CONSTRAINT "ParameterDefinition_unitId_fkey"
  FOREIGN KEY ("unitId") REFERENCES "CatalogUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TestParameterMap" DROP CONSTRAINT IF EXISTS "TestParameterMap_tenantId_fkey";
ALTER TABLE "TestParameterMap" ADD CONSTRAINT "TestParameterMap_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TestParameterMap" DROP CONSTRAINT IF EXISTS "TestParameterMap_testId_fkey";
ALTER TABLE "TestParameterMap" ADD CONSTRAINT "TestParameterMap_testId_fkey"
  FOREIGN KEY ("testId") REFERENCES "TestDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TestParameterMap" DROP CONSTRAINT IF EXISTS "TestParameterMap_parameterId_fkey";
ALTER TABLE "TestParameterMap" ADD CONSTRAINT "TestParameterMap_parameterId_fkey"
  FOREIGN KEY ("parameterId") REFERENCES "ParameterDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ParameterReferenceRange" DROP CONSTRAINT IF EXISTS "ParameterReferenceRange_tenantId_fkey";
ALTER TABLE "ParameterReferenceRange" ADD CONSTRAINT "ParameterReferenceRange_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ParameterReferenceRange" DROP CONSTRAINT IF EXISTS "ParameterReferenceRange_parameterId_fkey";
ALTER TABLE "ParameterReferenceRange" ADD CONSTRAINT "ParameterReferenceRange_parameterId_fkey"
  FOREIGN KEY ("parameterId") REFERENCES "ParameterDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ReportLayoutRule" DROP CONSTRAINT IF EXISTS "ReportLayoutRule_tenantId_fkey";
ALTER TABLE "ReportLayoutRule" ADD CONSTRAINT "ReportLayoutRule_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TestAnnotation" DROP CONSTRAINT IF EXISTS "TestAnnotation_tenantId_fkey";
ALTER TABLE "TestAnnotation" ADD CONSTRAINT "TestAnnotation_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TestAnnotation" DROP CONSTRAINT IF EXISTS "TestAnnotation_testId_fkey";
ALTER TABLE "TestAnnotation" ADD CONSTRAINT "TestAnnotation_testId_fkey"
  FOREIGN KEY ("testId") REFERENCES "TestDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TestAnnotation" DROP CONSTRAINT IF EXISTS "TestAnnotation_parameterId_fkey";
ALTER TABLE "TestAnnotation" ADD CONSTRAINT "TestAnnotation_parameterId_fkey"
  FOREIGN KEY ("parameterId") REFERENCES "ParameterDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CatalogVersion" DROP CONSTRAINT IF EXISTS "CatalogVersion_tenantId_fkey";
ALTER TABLE "CatalogVersion" ADD CONSTRAINT "CatalogVersion_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CatalogAuditRun" DROP CONSTRAINT IF EXISTS "CatalogAuditRun_tenantId_fkey";
ALTER TABLE "CatalogAuditRun" ADD CONSTRAINT "CatalogAuditRun_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CatalogAuditRun" DROP CONSTRAINT IF EXISTS "CatalogAuditRun_catalogVersionId_fkey";
ALTER TABLE "CatalogAuditRun" ADD CONSTRAINT "CatalogAuditRun_catalogVersionId_fkey"
  FOREIGN KEY ("catalogVersionId") REFERENCES "CatalogVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CatalogUnit" DROP CONSTRAINT IF EXISTS "CatalogUnit_tenantId_fkey";
ALTER TABLE "CatalogUnit" ADD CONSTRAINT "CatalogUnit_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TestDefinition" DROP CONSTRAINT IF EXISTS "TestDefinition_tenantId_fkey";
ALTER TABLE "TestDefinition" ADD CONSTRAINT "TestDefinition_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ParameterDefinition" DROP CONSTRAINT IF EXISTS "ParameterDefinition_tenantId_fkey";
ALTER TABLE "ParameterDefinition" ADD CONSTRAINT "ParameterDefinition_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
