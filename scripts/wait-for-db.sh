#!/bin/sh
# scripts/wait-for-db.sh
# Usage: run with DATABASE_URL env set (or it falls back to DB_HOST/DB_PORT)
set -eu

# If DATABASE_URL present, extract host and port; otherwise use DB_HOST/DB_PORT
if [ -n "${DATABASE_URL:-}" ]; then
  # Expect form: postgres://user:pass@host:port/db
  host=$(echo "$DATABASE_URL" | sed -E 's#.*@([^:/]+).*#\1#' )
  port=$(echo "$DATABASE_URL" | sed -E 's#.*:([0-9]+)/.*#\1#' )
else
  host="${DB_HOST:-db}"
  port="${DB_PORT:-5432}"
fi

# fallback defaults
host=${host:-db}
port=${port:-5432}

echo "Waiting for DB at ${host}:${port} ..."

# Use netcat if available, otherwise try /dev/tcp
if command -v nc >/dev/null 2>&1; then
  until nc -z "$host" "$port"; do
    echo "  -> DB not ready, retrying in 1s..."
    sleep 1
  done
else
  # try bash /dev/tcp (may not work in all images)
  while ! timeout 1 bash -c "cat < /dev/tcp/$host/$port" >/dev/null 2>&1; do
    echo "  -> DB not ready (no nc), retrying in 1s..."
    sleep 1
  done
fi

echo "DB reachable at ${host}:${port}"
