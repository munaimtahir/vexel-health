/**
 * Script to add test catalog items for workflow testing
 * 
 * Usage:
 *   1. Ensure DATABASE_URL is set in your environment or .env file
 *   2. Run: npm run seed:catalog --workspace=api
 * 
 * Or with custom tenant:
 *   TENANT_ID=your-tenant-id npm run seed:catalog --workspace=api
 * 
 * Tests added:
 *   - Blood Glucose (BG) - 1 parameter
 *   - Creatinine (CREAT) - 1 parameter  
 *   - Complete Blood Count (CBC) - 10 parameters
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get tenant ID from environment or use default
// Note: You should use a real tenant ID from your database
const TENANT_ID = process.env.TENANT_ID || '11111111-1111-4111-8111-111111111111';

async function addTestCatalogItems() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL environment variable is not set.');
    console.error('   Please set it in your .env file or environment.');
    console.error('   Example: DATABASE_URL=postgresql://user:password@localhost:5432/dbname');
    process.exit(1);
  }

  console.log(`Adding test catalog items for tenant: ${TENANT_ID}`);
  console.log('Note: Make sure this tenant exists in your database.\n');

  try {
    // Test 1: Blood Glucose (simple test)
    console.log('Creating Blood Glucose test...');
    const glucoseTest = await prisma.labTestDefinition.upsert({
      where: {
        tenantId_code: {
          tenantId: TENANT_ID,
          code: 'BG',
        },
      },
      create: {
        tenantId: TENANT_ID,
        code: 'BG',
        name: 'Blood Glucose',
        department: 'Biochemistry',
        active: true,
      },
      update: {
        name: 'Blood Glucose',
        department: 'Biochemistry',
        active: true,
      },
    });

    // Add parameter for Blood Glucose
    const glucoseParam = await prisma.labTestParameter.findFirst({
      where: {
        tenantId: TENANT_ID,
        testId: glucoseTest.id,
        name: 'Glucose (Fasting)',
      },
    });

    if (!glucoseParam) {
      await prisma.labTestParameter.create({
        data: {
          tenantId: TENANT_ID,
          testId: glucoseTest.id,
          name: 'Glucose (Fasting)',
          unit: 'mg/dL',
          refLow: 70,
          refHigh: 100,
          displayOrder: 1,
          active: true,
        },
      });
    } else {
      await prisma.labTestParameter.update({
        where: { id: glucoseParam.id },
        data: {
          unit: 'mg/dL',
          refLow: 70,
          refHigh: 100,
          displayOrder: 1,
          active: true,
        },
      });
    }

    console.log('✓ Blood Glucose test created');

    // Test 2: Creatinine (simple test)
    console.log('Creating Creatinine test...');
    const creatinineTest = await prisma.labTestDefinition.upsert({
      where: {
        tenantId_code: {
          tenantId: TENANT_ID,
          code: 'CREAT',
        },
      },
      create: {
        tenantId: TENANT_ID,
        code: 'CREAT',
        name: 'Creatinine',
        department: 'Biochemistry',
        active: true,
      },
      update: {
        name: 'Creatinine',
        department: 'Biochemistry',
        active: true,
      },
    });

    // Add parameter for Creatinine
    const creatParam = await prisma.labTestParameter.findFirst({
      where: {
        tenantId: TENANT_ID,
        testId: creatinineTest.id,
        name: 'Creatinine',
      },
    });

    if (!creatParam) {
      await prisma.labTestParameter.create({
        data: {
          tenantId: TENANT_ID,
          testId: creatinineTest.id,
          name: 'Creatinine',
          unit: 'mg/dL',
          refLow: 0.6,
          refHigh: 1.2,
          displayOrder: 1,
          active: true,
        },
      });
    } else {
      await prisma.labTestParameter.update({
        where: { id: creatParam.id },
        data: {
          unit: 'mg/dL',
          refLow: 0.6,
          refHigh: 1.2,
          displayOrder: 1,
          active: true,
        },
      });
    }

    console.log('✓ Creatinine test created');

    // Test 3: Complete Blood Count (CBC) - Multi-parameter test
    console.log('Creating Complete Blood Count (CBC) test...');
    const cbcTest = await prisma.labTestDefinition.upsert({
      where: {
        tenantId_code: {
          tenantId: TENANT_ID,
          code: 'CBC',
        },
      },
      create: {
        tenantId: TENANT_ID,
        code: 'CBC',
        name: 'Complete Blood Count',
        department: 'Hematology',
        active: true,
      },
      update: {
        name: 'Complete Blood Count',
        department: 'Hematology',
        active: true,
      },
    });

    // Add multiple parameters for CBC
    const cbcParameters = [
      {
        name: 'White Blood Cell Count',
        unit: '×10³/µL',
        refLow: 4.0,
        refHigh: 11.0,
        displayOrder: 1,
      },
      {
        name: 'Red Blood Cell Count',
        unit: '×10⁶/µL',
        refLow: 4.5,
        refHigh: 5.5,
        displayOrder: 2,
      },
      {
        name: 'Hemoglobin',
        unit: 'g/dL',
        refLow: 12.0,
        refHigh: 16.0,
        displayOrder: 3,
      },
      {
        name: 'Hematocrit',
        unit: '%',
        refLow: 36.0,
        refHigh: 46.0,
        displayOrder: 4,
      },
      {
        name: 'Mean Corpuscular Volume',
        unit: 'fL',
        refLow: 80,
        refHigh: 100,
        displayOrder: 5,
      },
      {
        name: 'Mean Corpuscular Hemoglobin',
        unit: 'pg',
        refLow: 27,
        refHigh: 33,
        displayOrder: 6,
      },
      {
        name: 'Mean Corpuscular Hemoglobin Concentration',
        unit: 'g/dL',
        refLow: 33,
        refHigh: 36,
        displayOrder: 7,
      },
      {
        name: 'Platelet Count',
        unit: '×10³/µL',
        refLow: 150,
        refHigh: 450,
        displayOrder: 8,
      },
      {
        name: 'Neutrophils',
        unit: '%',
        refLow: 40,
        refHigh: 70,
        displayOrder: 9,
      },
      {
        name: 'Lymphocytes',
        unit: '%',
        refLow: 20,
        refHigh: 40,
        displayOrder: 10,
      },
    ];

    for (const param of cbcParameters) {
      const existingParam = await prisma.labTestParameter.findFirst({
        where: {
          tenantId: TENANT_ID,
          testId: cbcTest.id,
          name: param.name,
        },
      });

      if (!existingParam) {
        await prisma.labTestParameter.create({
          data: {
            tenantId: TENANT_ID,
            testId: cbcTest.id,
            name: param.name,
            unit: param.unit,
            refLow: param.refLow,
            refHigh: param.refHigh,
            displayOrder: param.displayOrder,
            active: true,
          },
        });
      } else {
        await prisma.labTestParameter.update({
          where: { id: existingParam.id },
          data: {
            unit: param.unit,
            refLow: param.refLow,
            refHigh: param.refHigh,
            displayOrder: param.displayOrder,
            active: true,
          },
        });
      }
    }

    console.log(`✓ Complete Blood Count test created with ${cbcParameters.length} parameters`);

    console.log('\n✅ All test catalog items added successfully!');
    console.log('\nSummary:');
    console.log('  - Blood Glucose (BG) - 1 parameter');
    console.log('  - Creatinine (CREAT) - 1 parameter');
    console.log(`  - Complete Blood Count (CBC) - ${cbcParameters.length} parameters`);
  } catch (error) {
    console.error('❌ Error adding test catalog items:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addTestCatalogItems()
  .then(() => {
    console.log('\nScript completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nScript failed:', error);
    process.exit(1);
  });
