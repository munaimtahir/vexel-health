-- Add optional patient fields: fatherOrHusbandName, cnic, address
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "fatherOrHusbandName" TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "cnic" TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "address" TEXT;
