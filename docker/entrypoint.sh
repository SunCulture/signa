#!/bin/sh
set -eu

mkdir -p /data/storage /data/redis

APP_URL="${APP_URL:-http://localhost:3000}"
APP_URL="${APP_URL%/}"

export BACKEND_PORT="${BACKEND_PORT:-${PORT:-3001}}"
export FRONTEND_PORT="${FRONTEND_PORT:-3000}"
export PORT="$BACKEND_PORT"
export HOSTNAME="${HOSTNAME:-0.0.0.0}"
export APP_URL
export FRONTEND_ORIGIN="${FRONTEND_ORIGIN:-$APP_URL}"
export API_PUBLIC_URL="${API_PUBLIC_URL:-$APP_URL/api}"
export INTERNAL_API_URL="${INTERNAL_API_URL:-http://127.0.0.1:$BACKEND_PORT}"
export STORAGE_PATH="${STORAGE_PATH:-/data/storage}"

if [ -z "${JWT_SECRET:-}" ]; then
  secret_file=/data/signa.env

  if [ ! -f "$secret_file" ]; then
    umask 077
    printf 'JWT_SECRET=%s\n' "$(openssl rand -hex 64)" > "$secret_file"
  fi

  export JWT_SECRET="$(sed -n 's/^JWT_SECRET=//p' "$secret_file" | head -n 1)"
fi

if [ -z "${REDIS_URL:-}" ]; then
  export LOCAL_REDIS_ENABLED=true
  export REDIS_URL=redis://127.0.0.1:6379
else
  export LOCAL_REDIS_ENABLED="${LOCAL_REDIS_ENABLED:-false}"
fi

export QUEUE_REDIS_URL="${QUEUE_REDIS_URL:-$REDIS_URL}"
export QUEUE_ENABLED="${QUEUE_ENABLED:-true}"

case "${DATABASE_TYPE:-}" in
  sqlite)
    export SQLITE_DATABASE_PATH="${SQLITE_DATABASE_PATH:-/data/signa.sqlite}"
    ;;
  postgres)
    ;;
  *)
    if [ -n "${DATABASE_URL:-}" ]; then
      export DATABASE_TYPE=postgres
    elif [ -n "${DATABASE_HOST:-}" ]; then
      # Backward compatibility for deployments using split connection fields.
      export DATABASE_TYPE=postgres
    else
      export DATABASE_TYPE=sqlite
      export SQLITE_DATABASE_PATH="${SQLITE_DATABASE_PATH:-/data/signa.sqlite}"
    fi
    ;;
esac

if [ -z "${DATABASE_MIGRATIONS_RUN:-}" ]; then
  if [ "$DATABASE_TYPE" = "postgres" ]; then
    export DATABASE_MIGRATIONS_RUN=true
  else
    export DATABASE_MIGRATIONS_RUN=false
  fi
fi

if [ "${DATABASE_MIGRATIONS_RUN:-false}" = "true" ]; then
  (
    cd /app/apps/backend
    ./node_modules/.bin/typeorm-ts-node-commonjs -d src/database/data-source.ts migration:run
  )
fi

exec node /app/docker/runner.mjs
