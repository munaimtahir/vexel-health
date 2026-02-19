# Test Catalog Seed Scripts

## add-test-catalog-items.ts

This script adds test catalog items to the database for workflow testing.

### Tests Added

1. **Blood Glucose (BG)** - Biochemistry
   - 1 parameter: Glucose (Fasting) with reference range 70-100 mg/dL

2. **Creatinine (CREAT)** - Biochemistry  
   - 1 parameter: Creatinine with reference range 0.6-1.2 mg/dL

3. **Complete Blood Count (CBC)** - Hematology
   - 10 parameters:
     - White Blood Cell Count (WBC)
     - Red Blood Cell Count (RBC)
     - Hemoglobin
     - Hematocrit
     - Mean Corpuscular Volume (MCV)
     - Mean Corpuscular Hemoglobin (MCH)
     - Mean Corpuscular Hemoglobin Concentration (MCHC)
     - Platelet Count
     - Neutrophils
     - Lymphocytes

### Usage

1. **Prerequisites:**
   - Database must be running and accessible
   - `DATABASE_URL` environment variable must be set
   - Tenant must exist in the database (default: `11111111-1111-4111-8111-111111111111`)

2. **Run the script:**
   ```bash
   npm run seed:catalog --workspace=api
   ```

3. **With custom tenant ID:**
   ```bash
   TENANT_ID=your-tenant-id npm run seed:catalog --workspace=api
   ```

### Notes

- The script uses `upsert` operations, so it's safe to run multiple times
- If tests already exist, they will be updated with the latest values
- Parameters are added/updated based on their unique constraint (tenantId, testId, name)
