#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[deploy:dev] building and starting services"
docker compose up -d --build

echo "[deploy:dev] syncing database schema"
docker compose exec -T api npx prisma db push --schema prisma/schema.prisma --accept-data-loss

echo "[deploy:dev] applying idempotent development admin seed"
docker compose exec -T api node prisma/seed-dev.js

echo "[deploy:dev] done"
echo "Admin login:"
echo "  Host: vexel.alshifalab.pk"
echo "  Email: ${DEV_ADMIN_EMAIL:-admin@vexel.dev}"
echo "  Password: ${DEV_ADMIN_PASSWORD:-Admin@123!}"
