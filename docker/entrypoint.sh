#!/bin/sh
set -eu

mkdir -p /data /storage

export BACKEND_PORT="${BACKEND_PORT:-${PORT:-3001}}"
export FRONTEND_PORT="${FRONTEND_PORT:-3000}"
export PORT="$BACKEND_PORT"
export HOSTNAME="${HOSTNAME:-0.0.0.0}"
export STORAGE_PATH="${STORAGE_PATH:-/storage}"
export REDIS_URL="${REDIS_URL:-redis://redis:6379}"
export QUEUE_REDIS_URL="${QUEUE_REDIS_URL:-$REDIS_URL}"
export QUEUE_ENABLED="${QUEUE_ENABLED:-true}"

case "${DATABASE_TYPE:-}" in
  sqlite)
    export SQLITE_DATABASE_PATH="${SQLITE_DATABASE_PATH:-/data/signa.sqlite}"
    ;;
  postgres)
    ;;
  *)
    if [ -n "${DATABASE_URL:-}" ] || [ -n "${DATABASE_HOST:-}" ]; then
      export DATABASE_TYPE=postgres
    else
      export DATABASE_TYPE=sqlite
      export SQLITE_DATABASE_PATH="${SQLITE_DATABASE_PATH:-/data/signa.sqlite}"
    fi
    ;;
esac

if [ "${DATABASE_MIGRATIONS_RUN:-false}" = "true" ]; then
  cd /app/apps/backend
  ./node_modules/.bin/typeorm -d dist/database/data-source.js migration:run
fi

cd /app
exec node /app/docker/runner.mjs
