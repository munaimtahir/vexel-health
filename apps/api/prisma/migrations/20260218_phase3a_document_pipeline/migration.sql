-- Phase 3A: Document registry + deterministic PDF pipeline

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DocumentType') THEN
    CREATE TYPE "DocumentType" AS ENUM ('ENCOUNTER_SUMMARY');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DocumentStatus') THEN
    CREATE TYPE "DocumentStatus" AS ENUM ('QUEUED', 'RENDERED', 'FAILED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StorageBackend') THEN
    CREATE TYPE "StorageBackend" AS ENUM ('LOCAL', 'S3');
  END IF;
END $$;

ALTER TABLE "Document"
  DROP COLUMN IF EXISTS "publishedAt",
  ADD COLUMN IF NOT EXISTS "payloadJson" JSONB,
  ADD COLUMN IF NOT EXISTS "storageBackend" "StorageBackend" NOT NULL DEFAULT 'LOCAL',
  ADD COLUMN IF NOT EXISTS "errorCode" TEXT,
  ADD COLUMN IF NOT EXISTS "errorMessage" TEXT,
  ADD COLUMN IF NOT EXISTS "renderedAt" TIMESTAMP(3);

ALTER TABLE "Document"
  RENAME COLUMN "filePath" TO "storageKey";

ALTER TABLE "Document"
  ALTER COLUMN "encounterId" SET NOT NULL,
  ALTER COLUMN "documentType" TYPE "DocumentType" USING ("documentType"::"DocumentType"),
  ALTER COLUMN "status" TYPE "DocumentStatus" USING ("status"::"DocumentStatus"),
  ALTER COLUMN "status" SET DEFAULT 'QUEUED',
  ALTER COLUMN "templateVersion" TYPE INTEGER USING (COALESCE(NULLIF("templateVersion", '')::INTEGER, 1)),
  ALTER COLUMN "payloadVersion" TYPE INTEGER USING (COALESCE(NULLIF("payloadVersion", '')::INTEGER, 1));

UPDATE "Document"
SET "payloadJson" = '{}'::jsonb
WHERE "payloadJson" IS NULL;

ALTER TABLE "Document"
  ALTER COLUMN "payloadJson" SET NOT NULL;

DROP INDEX IF EXISTS "Document_tenantId_encounterId_idx";
CREATE INDEX IF NOT EXISTS "Document_tenantId_encounterId_idx"
  ON "Document"("tenantId", "encounterId");

CREATE UNIQUE INDEX IF NOT EXISTS "Document_tenantId_encounterId_documentType_templateVersion_payloadHash_key"
  ON "Document"("tenantId", "encounterId", "documentType", "templateVersion", "payloadHash");
