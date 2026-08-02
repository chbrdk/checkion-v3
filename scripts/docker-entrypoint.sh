#!/bin/sh
set -e

# Require AUTH_SECRET only when Plexon auth is configured (fixture-only runs may omit it).
if [ -n "$PLEXON_AUTH_URL" ] && [ -n "$PLEXON_SERVICE_SECRET" ]; then
  if [ -z "$AUTH_SECRET" ] || [ "${#AUTH_SECRET}" -lt 32 ]; then
    echo "[CHECKION-v3] AUTH_SECRET is missing or shorter than 32 chars while Plexon auth is configured. Refusing to start."
    exit 1
  fi
fi

if [ -n "$DATABASE_URL" ]; then
  echo "[CHECKION-v3] Checking DATABASE_URL..."
  node ./scripts/check-database-url.mjs

  echo "[CHECKION-v3] Running drizzle-kit push (product schema)..."
  if npm run db:push -w web; then
    echo "[CHECKION-v3] Schema up to date."
  else
    echo "[CHECKION-v3] drizzle-kit push failed (DB unreachable or schema error). Refusing to start."
    exit 1
  fi
else
  echo "[CHECKION-v3] DATABASE_URL not set — stores use in-memory fixtures (dev / Staging Shell)."
fi

exec npm run start -w web
