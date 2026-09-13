#!/usr/bin/env bash
# Per-boot startup for the Sonic OS Cloud Agent environment.
# Starts the local PostgreSQL cluster and waits until it accepts connections.
set -euo pipefail

PG_VERSION="$(pg_lsclusters -h 2>/dev/null | awk 'NR==1{print $1}')"
PG_VERSION="${PG_VERSION:-16}"

echo "[start] Starting PostgreSQL cluster ${PG_VERSION}/main..."
sudo pg_ctlcluster "${PG_VERSION}" main start || true

for _ in $(seq 1 30); do
  if sudo -u postgres pg_isready >/dev/null 2>&1; then
    echo "[start] PostgreSQL is ready."
    exit 0
  fi
  sleep 1
done

echo "[start] PostgreSQL did not become ready in time." >&2
exit 1
