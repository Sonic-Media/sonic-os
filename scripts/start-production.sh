#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")/.."

npm run validate:env
npm run db:migrate:deploy

if [ "${RUN_SEED:-false}" = "true" ]; then
  npm run db:seed
fi

npm run start:production
