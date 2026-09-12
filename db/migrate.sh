#!/bin/sh
# Applies db/init/*.sql in order, each in its own transaction, recording the
# file's checksum in schema_migrations so unchanged files are skipped. The
# scripts are idempotent, so an edited file is simply re-applied. Files whose
# first line is "-- migrate:always" run on every invocation.
# Then (re)creates the application role and seeds the admin user.

set -eu

DB_DIR="$(cd "$(dirname "$0")" && pwd)"
INIT_DIR="${INIT_DIR:-$DB_DIR/init}"

. "$DB_DIR/pgpass.sh"

# Hides the "already exists, skipping" notices of the idempotent scripts.
export PGOPTIONS="-c client_min_messages=warning"

pg_env_init

run_psql() {
  psql -X -q --no-password -v ON_ERROR_STOP=1 "$@"
}

tries=0
until pg_isready -q; do
  tries=$((tries + 1))
  if [ "$tries" -ge 30 ]; then
    echo "Database not reachable at ${PGHOST}:${PGPORT}" >&2
    exit 1
  fi
  sleep 2
done

run_psql -c "create table if not exists schema_migrations (
  filename text primary key,
  checksum text not null,
  applied_on timestamptz default current_timestamp not null
)"

applied=$(run_psql -At -F ' ' -c "select filename, checksum from schema_migrations")
count=0

for file in "$INIT_DIR"/*.sql; do
  [ -f "$file" ] || continue
  name=$(basename "$file")
  case "$name" in
    *[!A-Za-z0-9_.-]*) echo "Refusing unsafe migration filename: $name" >&2; exit 1 ;;
  esac
  sum=$(sha256sum "$file" | cut -d ' ' -f 1)

  if [ "$(head -n 1 "$file" | tr -d '\r')" != "-- migrate:always" ] \
    && printf '%s\n' "$applied" | grep -qxF "$name $sum"; then
    continue
  fi

  echo "Applying $name"
  run_psql -1 -f "$file" -c "insert into schema_migrations (filename, checksum)
    values ('$name', '$sum')
    on conflict (filename) do update
    set checksum = excluded.checksum, applied_on = current_timestamp"
  count=$((count + 1))
done
echo "Migrations applied: $count"

if [ -n "${APP_DB_USER:-}" ]; then
  if [ "$APP_DB_USER" = "$POSTGRES_USER" ]; then
    echo "APP_DB_USER must differ from POSTGRES_USER" >&2
    exit 1
  fi
  if [ -z "${APP_DB_PASSWORD:-}" ]; then
    echo "APP_DB_PASSWORD is required when APP_DB_USER is set" >&2
    exit 1
  fi
  run_psql -1 -f "$DB_DIR/app-role.sql"
  echo "Application role ready: $APP_DB_USER"
fi

sh "$DB_DIR/seed-admin.sh"
