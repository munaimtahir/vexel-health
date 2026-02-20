-- Phase 5: Admin/catalog gap closure (users, panels, linking, import/export, business config)

CREATE TABLE IF NOT EXISTS "LabPanel" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LabPanel_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LabPanelTest" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "panelId" TEXT NOT NULL,
  "testId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LabPanelTest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LabReferenceRange" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "testId" TEXT NOT NULL,
  "parameterId" TEXT NOT NULL,
  "sex" TEXT,
  "ageMinDays" INTEGER,
  "ageMaxDays" INTEGER,
  "low" DOUBLE PRECISION,
  "high" DOUBLE PRECISION,
  "textRange" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LabReferenceRange_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AdminUserInvite" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "roleNamesCsv" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "invitedByUserId" TEXT,
  "acceptedByUserId" TEXT,
  "acceptedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdminUserInvite_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CatalogImportJob" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mode" TEXT NOT NULL DEFAULT 'MERGE',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "processedRows" INTEGER NOT NULL DEFAULT 0,
  "successRows" INTEGER NOT NULL DEFAULT 0,
  "failedRows" INTEGER NOT NULL DEFAULT 0,
  "errorJson" JSONB,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CatalogImportJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CatalogExportJob" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "entity" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "fileName" TEXT,
  "fileBytes" BYTEA,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CatalogExportJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TenantBrandingConfig" (
  "tenantId" TEXT NOT NULL,
  "businessName" TEXT NOT NULL DEFAULT '',
  "address" TEXT NOT NULL DEFAULT '',
  "phone" TEXT NOT NULL DEFAULT '',
  "headerLine1" TEXT NOT NULL DEFAULT '',
  "headerLine2" TEXT NOT NULL DEFAULT '',
  "logoAssetName" TEXT,
  "headerAssetName" TEXT,
  "footerAssetName" TEXT,
  "updatedBy" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TenantBrandingConfig_pkey" PRIMARY KEY ("tenantId")
);

CREATE TABLE IF NOT EXISTS "TenantReportDesignConfig" (
  "tenantId" TEXT NOT NULL,
  "showLogo" BOOLEAN NOT NULL DEFAULT true,
  "logoPosition" TEXT NOT NULL DEFAULT 'left',
  "headerText1" TEXT NOT NULL DEFAULT '',
  "headerText2" TEXT NOT NULL DEFAULT '',
  "headerDividerStyle" TEXT NOT NULL DEFAULT 'thin',
  "patientLayoutStyle" TEXT NOT NULL DEFAULT 'compact',
  "showRefNumber" BOOLEAN NOT NULL DEFAULT true,
  "showConsultant" BOOLEAN NOT NULL DEFAULT true,
  "showSampleTime" BOOLEAN NOT NULL DEFAULT true,
  "resultsFontSize" TEXT NOT NULL DEFAULT 'normal',
  "showUnitsColumn" BOOLEAN NOT NULL DEFAULT true,
  "showReferenceRange" BOOLEAN NOT NULL DEFAULT true,
  "abnormalHighlightStyle" TEXT NOT NULL DEFAULT 'bold',
  "footerText" TEXT NOT NULL DEFAULT '',
  "showSignatories" BOOLEAN NOT NULL DEFAULT true,
  "signatoryBlockStyle" TEXT NOT NULL DEFAULT 'single',
  "updatedBy" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TenantReportDesignConfig_pkey" PRIMARY KEY ("tenantId")
);

CREATE TABLE IF NOT EXISTS "TenantReceiptDesignConfig" (
  "tenantId" TEXT NOT NULL,
  "showLogo" BOOLEAN NOT NULL DEFAULT true,
  "businessNameOverride" TEXT NOT NULL DEFAULT '',
  "showAddress" BOOLEAN NOT NULL DEFAULT true,
  "showContact" BOOLEAN NOT NULL DEFAULT true,
  "showQuantityColumn" BOOLEAN NOT NULL DEFAULT true,
  "showUnitPrice" BOOLEAN NOT NULL DEFAULT true,
  "showDiscountColumn" BOOLEAN NOT NULL DEFAULT false,
  "showTaxColumn" BOOLEAN NOT NULL DEFAULT true,
  "showSubtotal" BOOLEAN NOT NULL DEFAULT true,
  "showDiscount" BOOLEAN NOT NULL DEFAULT true,
  "showTax" BOOLEAN NOT NULL DEFAULT true,
  "grandTotalStyle" TEXT NOT NULL DEFAULT 'bold',
  "thankYouMessage" TEXT NOT NULL DEFAULT '',
  "termsAndConditions" TEXT NOT NULL DEFAULT '',
  "showQrCodePlaceholder" BOOLEAN NOT NULL DEFAULT false,
  "receiptWidthMode" TEXT NOT NULL DEFAULT 'a4',
  "updatedBy" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TenantReceiptDesignConfig_pkey" PRIMARY KEY ("tenantId")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LabPanel_tenantId_code_key"
  ON "LabPanel"("tenantId", "code");
CREATE INDEX IF NOT EXISTS "LabPanel_tenantId_active_name_idx"
  ON "LabPanel"("tenantId", "active", "name");

CREATE UNIQUE INDEX IF NOT EXISTS "LabPanelTest_tenantId_panelId_testId_key"
  ON "LabPanelTest"("tenantId", "panelId", "testId");
CREATE UNIQUE INDEX IF NOT EXISTS "LabPanelTest_tenantId_panelId_sortOrder_key"
  ON "LabPanelTest"("tenantId", "panelId", "sortOrder");
CREATE INDEX IF NOT EXISTS "LabPanelTest_tenantId_panelId_sortOrder_idx"
  ON "LabPanelTest"("tenantId", "panelId", "sortOrder");

CREATE UNIQUE INDEX IF NOT EXISTS "LabReferenceRange_tenantId_testId_parameterId_sex_ageMinDays_ageMaxDays_key"
  ON "LabReferenceRange"("tenantId", "testId", "parameterId", "sex", "ageMinDays", "ageMaxDays");
CREATE INDEX IF NOT EXISTS "LabReferenceRange_tenantId_testId_parameterId_idx"
  ON "LabReferenceRange"("tenantId", "testId", "parameterId");

CREATE INDEX IF NOT EXISTS "AdminUserInvite_tenantId_email_status_idx"
  ON "AdminUserInvite"("tenantId", "email", "status");
CREATE INDEX IF NOT EXISTS "AdminUserInvite_tenantId_createdAt_idx"
  ON "AdminUserInvite"("tenantId", "createdAt");

CREATE INDEX IF NOT EXISTS "CatalogImportJob_tenantId_createdAt_idx"
  ON "CatalogImportJob"("tenantId", "createdAt");

CREATE INDEX IF NOT EXISTS "CatalogExportJob_tenantId_createdAt_idx"
  ON "CatalogExportJob"("tenantId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LabPanel_tenantId_fkey') THEN
    ALTER TABLE "LabPanel"
      ADD CONSTRAINT "LabPanel_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LabPanelTest_tenantId_fkey') THEN
    ALTER TABLE "LabPanelTest"
      ADD CONSTRAINT "LabPanelTest_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LabPanelTest_panelId_fkey') THEN
    ALTER TABLE "LabPanelTest"
      ADD CONSTRAINT "LabPanelTest_panelId_fkey"
      FOREIGN KEY ("panelId") REFERENCES "LabPanel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LabPanelTest_testId_fkey') THEN
    ALTER TABLE "LabPanelTest"
      ADD CONSTRAINT "LabPanelTest_testId_fkey"
      FOREIGN KEY ("testId") REFERENCES "LabTestDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LabReferenceRange_tenantId_fkey') THEN
    ALTER TABLE "LabReferenceRange"
      ADD CONSTRAINT "LabReferenceRange_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LabReferenceRange_testId_fkey') THEN
    ALTER TABLE "LabReferenceRange"
      ADD CONSTRAINT "LabReferenceRange_testId_fkey"
      FOREIGN KEY ("testId") REFERENCES "LabTestDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LabReferenceRange_parameterId_fkey') THEN
    ALTER TABLE "LabReferenceRange"
      ADD CONSTRAINT "LabReferenceRange_parameterId_fkey"
      FOREIGN KEY ("parameterId") REFERENCES "LabTestParameter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AdminUserInvite_tenantId_fkey') THEN
    ALTER TABLE "AdminUserInvite"
      ADD CONSTRAINT "AdminUserInvite_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CatalogImportJob_tenantId_fkey') THEN
    ALTER TABLE "CatalogImportJob"
      ADD CONSTRAINT "CatalogImportJob_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CatalogExportJob_tenantId_fkey') THEN
    ALTER TABLE "CatalogExportJob"
      ADD CONSTRAINT "CatalogExportJob_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TenantBrandingConfig_tenantId_fkey') THEN
    ALTER TABLE "TenantBrandingConfig"
      ADD CONSTRAINT "TenantBrandingConfig_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TenantReportDesignConfig_tenantId_fkey') THEN
    ALTER TABLE "TenantReportDesignConfig"
      ADD CONSTRAINT "TenantReportDesignConfig_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TenantReceiptDesignConfig_tenantId_fkey') THEN
    ALTER TABLE "TenantReceiptDesignConfig"
      ADD CONSTRAINT "TenantReceiptDesignConfig_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
