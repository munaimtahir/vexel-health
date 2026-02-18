-- Phase 3B: Typed encounter PREP data per service

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BbUrgency') THEN
    CREATE TYPE "BbUrgency" AS ENUM ('ROUTINE', 'URGENT');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "LabEncounterPrep" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "encounterId" TEXT NOT NULL,
  "specimenType" TEXT,
  "collectedAt" TIMESTAMP(3),
  "collectorName" TEXT,
  "receivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LabEncounterPrep_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RadEncounterPrep" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "encounterId" TEXT NOT NULL,
  "fastingRequired" BOOLEAN,
  "fastingConfirmed" BOOLEAN,
  "contrastPlanned" BOOLEAN,
  "creatinineChecked" BOOLEAN,
  "pregnancyScreenDone" BOOLEAN,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RadEncounterPrep_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "OpdEncounterPrep" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "encounterId" TEXT NOT NULL,
  "systolicBp" INTEGER,
  "diastolicBp" INTEGER,
  "pulse" INTEGER,
  "temperatureC" DOUBLE PRECISION,
  "respiratoryRate" INTEGER,
  "weightKg" DOUBLE PRECISION,
  "spo2" INTEGER,
  "triageNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OpdEncounterPrep_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "BbEncounterPrep" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "encounterId" TEXT NOT NULL,
  "sampleReceivedAt" TIMESTAMP(3),
  "aboGroup" TEXT,
  "rhType" TEXT,
  "componentRequested" TEXT,
  "unitsRequested" INTEGER,
  "urgency" "BbUrgency",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BbEncounterPrep_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "IpdEncounterPrep" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "encounterId" TEXT NOT NULL,
  "admissionReason" TEXT,
  "ward" TEXT,
  "bed" TEXT,
  "admittingNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IpdEncounterPrep_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LabEncounterPrep_tenantId_encounterId_key"
  ON "LabEncounterPrep"("tenantId", "encounterId");
CREATE UNIQUE INDEX IF NOT EXISTS "LabEncounterPrep_encounterId_key"
  ON "LabEncounterPrep"("encounterId");
CREATE UNIQUE INDEX IF NOT EXISTS "RadEncounterPrep_tenantId_encounterId_key"
  ON "RadEncounterPrep"("tenantId", "encounterId");
CREATE UNIQUE INDEX IF NOT EXISTS "RadEncounterPrep_encounterId_key"
  ON "RadEncounterPrep"("encounterId");
CREATE UNIQUE INDEX IF NOT EXISTS "OpdEncounterPrep_tenantId_encounterId_key"
  ON "OpdEncounterPrep"("tenantId", "encounterId");
CREATE UNIQUE INDEX IF NOT EXISTS "OpdEncounterPrep_encounterId_key"
  ON "OpdEncounterPrep"("encounterId");
CREATE UNIQUE INDEX IF NOT EXISTS "BbEncounterPrep_tenantId_encounterId_key"
  ON "BbEncounterPrep"("tenantId", "encounterId");
CREATE UNIQUE INDEX IF NOT EXISTS "BbEncounterPrep_encounterId_key"
  ON "BbEncounterPrep"("encounterId");
CREATE UNIQUE INDEX IF NOT EXISTS "IpdEncounterPrep_tenantId_encounterId_key"
  ON "IpdEncounterPrep"("tenantId", "encounterId");
CREATE UNIQUE INDEX IF NOT EXISTS "IpdEncounterPrep_encounterId_key"
  ON "IpdEncounterPrep"("encounterId");

CREATE INDEX IF NOT EXISTS "LabEncounterPrep_tenantId_idx" ON "LabEncounterPrep"("tenantId");
CREATE INDEX IF NOT EXISTS "RadEncounterPrep_tenantId_idx" ON "RadEncounterPrep"("tenantId");
CREATE INDEX IF NOT EXISTS "OpdEncounterPrep_tenantId_idx" ON "OpdEncounterPrep"("tenantId");
CREATE INDEX IF NOT EXISTS "BbEncounterPrep_tenantId_idx" ON "BbEncounterPrep"("tenantId");
CREATE INDEX IF NOT EXISTS "IpdEncounterPrep_tenantId_idx" ON "IpdEncounterPrep"("tenantId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'LabEncounterPrep_tenantId_fkey'
  ) THEN
    ALTER TABLE "LabEncounterPrep"
      ADD CONSTRAINT "LabEncounterPrep_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'LabEncounterPrep_encounterId_fkey'
  ) THEN
    ALTER TABLE "LabEncounterPrep"
      ADD CONSTRAINT "LabEncounterPrep_encounterId_fkey"
      FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'RadEncounterPrep_tenantId_fkey'
  ) THEN
    ALTER TABLE "RadEncounterPrep"
      ADD CONSTRAINT "RadEncounterPrep_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'RadEncounterPrep_encounterId_fkey'
  ) THEN
    ALTER TABLE "RadEncounterPrep"
      ADD CONSTRAINT "RadEncounterPrep_encounterId_fkey"
      FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'OpdEncounterPrep_tenantId_fkey'
  ) THEN
    ALTER TABLE "OpdEncounterPrep"
      ADD CONSTRAINT "OpdEncounterPrep_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'OpdEncounterPrep_encounterId_fkey'
  ) THEN
    ALTER TABLE "OpdEncounterPrep"
      ADD CONSTRAINT "OpdEncounterPrep_encounterId_fkey"
      FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'BbEncounterPrep_tenantId_fkey'
  ) THEN
    ALTER TABLE "BbEncounterPrep"
      ADD CONSTRAINT "BbEncounterPrep_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'BbEncounterPrep_encounterId_fkey'
  ) THEN
    ALTER TABLE "BbEncounterPrep"
      ADD CONSTRAINT "BbEncounterPrep_encounterId_fkey"
      FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'IpdEncounterPrep_tenantId_fkey'
  ) THEN
    ALTER TABLE "IpdEncounterPrep"
      ADD CONSTRAINT "IpdEncounterPrep_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'IpdEncounterPrep_encounterId_fkey'
  ) THEN
    ALTER TABLE "IpdEncounterPrep"
      ADD CONSTRAINT "IpdEncounterPrep_encounterId_fkey"
      FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
