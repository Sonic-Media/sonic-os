#!/usr/bin/env sh
set -eu

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "[sonic-os] Applying database migrations..."
  npx prisma migrate deploy
fi

if [ "${RUN_SEED:-false}" = "true" ]; then
  if [ "${APP_MODE:-}" = "production" ] || [ "${APP_ENV:-}" = "production" ]; then
    if [ "${ALLOW_PRODUCTION_SEED:-false}" != "true" ]; then
      echo "[sonic-os] Seeding skipped — disabled in production mode."
    else
      echo "[sonic-os] Seeding database (ALLOW_PRODUCTION_SEED=true)..."
      npx prisma db seed
    fi
  else
    echo "[sonic-os] Seeding database..."
    npx prisma db seed
  fi
fi

echo "[sonic-os] Starting application..."
exec "$@"
