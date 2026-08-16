#!/bin/sh
set -eu

: "${DATABASE_URL:?DATABASE_URL must point to a PostgreSQL database}"

PORT="${PORT:-8000}"
USLIKE_UPLOADS_PATH="${USLIKE_UPLOADS_PATH:-/var/lib/uslike/uploads}"
export PORT USLIKE_UPLOADS_PATH

case "$DATABASE_URL" in
  postgres://* | postgresql://* | postgresql+asyncpg://*) ;;
  *)
    echo "DATABASE_URL must use PostgreSQL" >&2
    exit 64
    ;;
esac

case "$PORT" in
  *[!0-9]* | "")
    echo "PORT must be an integer between 1 and 65535" >&2
    exit 64
    ;;
esac

if [ "$PORT" -lt 1 ] || [ "$PORT" -gt 65535 ]; then
  echo "PORT must be an integer between 1 and 65535" >&2
  exit 64
fi

umask 027
mkdir -p "$USLIKE_UPLOADS_PATH"

alembic upgrade head

if [ "$#" -gt 0 ]; then
  exec "$@"
fi

exec uvicorn backend.app.main:app \
  --host 0.0.0.0 \
  --port "$PORT" \
  --proxy-headers \
  --forwarded-allow-ips "${FORWARDED_ALLOW_IPS:-*}"
