# DEV_ADMIN_BOOTSTRAP

## Purpose
Guarantee a working admin account exists after every deploy during development.

## What is bootstrapped
- Tenant (idempotent upsert)
- Tenant domains (idempotent upsert)
- Admin user (idempotent upsert; password reset to configured value each run)
- `ADMIN` role + user-role mapping

Script:
- `apps/api/prisma/seed-dev.js`

## Run commands
- Full deploy with bootstrap:
  - `npm run deploy:dev`
- Bootstrap only:
  - `npm run seed:dev`

## Default credentials
- Host: `vexel.alshifalab.pk`
- Email: `admin@vexel.dev`
- Password: `Admin@123!`

## Configurable env vars
- `DEV_ADMIN_TENANT_ID`
- `DEV_ADMIN_TENANT_NAME`
- `DEV_ADMIN_TENANT_STATUS`
- `DEV_ADMIN_DOMAINS`
- `DEV_ADMIN_EMAIL`
- `DEV_ADMIN_PASSWORD`
- `DEV_ADMIN_NAME`
- `DEV_ADMIN_USER_STATUS`
- `DEV_ADMIN_ROLE_NAME`
