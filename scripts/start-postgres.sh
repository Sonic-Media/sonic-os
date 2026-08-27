#!/usr/bin/env sh
set -eu

PG16_BIN="/opt/homebrew/opt/postgresql@16/bin"
PG16_DATA="/opt/homebrew/var/postgresql@16"

if [ ! -x "$PG16_BIN/pg_ctl" ]; then
  echo "[postgres] PostgreSQL 16 is not installed. Run: brew install postgresql@16"
  exit 1
fi

if "$PG16_BIN/pg_isready" -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
  echo "[postgres] PostgreSQL 16 is already accepting connections on 127.0.0.1:5432."
  exit 0
fi

if [ -f "$PG16_DATA/postmaster.pid" ]; then
  stale_pid="$(awk 'NR==1 { print $1 }' "$PG16_DATA/postmaster.pid" 2>/dev/null || true)"
  if [ -n "$stale_pid" ] && ! kill -0 "$stale_pid" 2>/dev/null; then
    echo "[postgres] Removing stale postmaster.pid (PID $stale_pid is not postgres)."
    rm -f "$PG16_DATA/postmaster.pid"
  fi
fi

echo "[postgres] Starting PostgreSQL 16..."
"$PG16_BIN/pg_ctl" -D "$PG16_DATA" -l "$PG16_DATA/server.log" start

sleep 2

if "$PG16_BIN/pg_isready" -h 127.0.0.1 -p 5432; then
  echo "[postgres] Ready."
else
  echo "[postgres] Failed to start. Check $PG16_DATA/server.log"
  tail -20 "$PG16_DATA/server.log" || true
  exit 1
fi
