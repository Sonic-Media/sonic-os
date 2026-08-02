#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")/.."

# Load environment when present (cron often runs without a login shell).
if [ -f ".env" ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

npm run db:backup
