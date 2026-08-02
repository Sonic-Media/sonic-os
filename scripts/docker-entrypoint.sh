#!/usr/bin/env sh
set -eu

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "[sonic-os] Applying database migrations..."
  npx prisma migrate deploy
fi

if [ "${RUN_SEED:-false}" = "true" ]; then
  echo "[sonic-os] Seeding database..."
  npx prisma db seed
fi

echo "[sonic-os] Starting application..."
exec "$@"
