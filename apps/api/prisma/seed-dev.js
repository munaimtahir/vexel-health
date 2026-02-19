const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const defaults = {
  tenantId: '11111111-1111-4111-8111-111111111111',
  tenantName: 'Vexel Development Tenant',
  tenantStatus: 'active',
  domains: ['vexel.alshifalab.pk', 'tenant-a.test'],
  adminEmail: 'admin@vexel.dev',
  adminPassword: 'Admin@123!',
  adminName: 'Development Admin',
  adminStatus: 'active',
  adminRoleName: 'ADMIN',
};

function parseDomains(value) {
  const source = (value ?? '').trim();
  const raw = source.length > 0 ? source.split(',') : defaults.domains;
  const normalized = raw
    .map((domain) => domain.trim().toLowerCase())
    .filter((domain) => domain.length > 0);
  return Array.from(new Set(normalized));
}

async function main() {
  const tenantId = process.env.DEV_ADMIN_TENANT_ID ?? defaults.tenantId;
  const tenantName = process.env.DEV_ADMIN_TENANT_NAME ?? defaults.tenantName;
  const tenantStatus =
    process.env.DEV_ADMIN_TENANT_STATUS ?? defaults.tenantStatus;
  const adminEmail =
    (process.env.DEV_ADMIN_EMAIL ?? defaults.adminEmail).trim().toLowerCase();
  const adminPassword =
    process.env.DEV_ADMIN_PASSWORD ?? defaults.adminPassword;
  const adminName = process.env.DEV_ADMIN_NAME ?? defaults.adminName;
  const adminStatus =
    process.env.DEV_ADMIN_USER_STATUS ?? defaults.adminStatus;
  const adminRoleName =
    process.env.DEV_ADMIN_ROLE_NAME ?? defaults.adminRoleName;
  const domains = parseDomains(process.env.DEV_ADMIN_DOMAINS);

  if (!tenantId || !adminEmail || !adminPassword || domains.length === 0) {
    throw new Error(
      'Missing required seed inputs: tenantId, adminEmail, adminPassword, domains',
    );
  }

  await prisma.tenant.upsert({
    where: { id: tenantId },
    update: {
      name: tenantName,
      status: tenantStatus,
    },
    create: {
      id: tenantId,
      name: tenantName,
      status: tenantStatus,
    },
  });

  for (const domain of domains) {
    await prisma.tenantDomain.upsert({
      where: { domain },
      update: { tenantId },
      create: {
        tenantId,
        domain,
      },
    });
  }

  const user = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId,
        email: adminEmail,
      },
    },
    update: {
      passwordHash: adminPassword,
      name: adminName,
      status: adminStatus,
    },
    create: {
      tenantId,
      email: adminEmail,
      passwordHash: adminPassword,
      name: adminName,
      status: adminStatus,
    },
  });

  const role = await prisma.role.upsert({
    where: {
      tenantId_name: {
        tenantId,
        name: adminRoleName,
      },
    },
    update: {},
    create: {
      tenantId,
      name: adminRoleName,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: user.id,
        roleId: role.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      roleId: role.id,
    },
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        tenantId,
        domains,
        adminEmail,
        adminPassword,
        adminUserId: user.id,
        adminRoleName: role.name,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error('[seed-dev] failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
