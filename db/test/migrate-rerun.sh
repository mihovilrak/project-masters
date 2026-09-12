#!/bin/sh
# Checks that migrate.sh is re-runnable: unchanged files are skipped, only the
# "-- migrate:always" files re-run, and an edited file is re-applied with its
# new checksum recorded. Leaves schema_migrations holding the original
# checksums, which migrations.test.ts asserts.
#
# Needs the same POSTGRES_* / APP_DB_* environment as migrate.sh.

set -eu

DB_DIR="$(cd "$(dirname "$0")/.." && pwd)"
INIT_DIR="$DB_DIR/init"

. "$DB_DIR/pgpass.sh"
pg_env_init

# migrate.sh only looks at the first line, so this has to as well.
always=0
editable=''
for f in "$INIT_DIR"/*.sql; do
  if [ "$(head -n 1 "$f" | tr -d '\r')" = "-- migrate:always" ]; then
    always=$((always + 1))
  else
    editable="${editable:-$f}"
  fi
done
[ -n "$editable" ] || { echo "No editable migration found" >&2; exit 1; }

expect_count() {
  echo "$2" | grep -qx "Migrations applied: $1" || {
    echo "Expected 'Migrations applied: $1', got:" >&2
    echo "$2" >&2
    exit 1
  }
}

echo "== unchanged files are skipped (expect $always)"
out=$(sh "$DB_DIR/migrate.sh")
echo "$out"
expect_count "$always" "$out"

# Edited in a copy so the real tree stays clean.
file=$(basename "$editable")
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"; rm -f "$PGPASSFILE"' EXIT
cp -r "$INIT_DIR" "$tmp/init"
echo '-- migration re-run check' >> "$tmp/init/$file"

echo "== an edited file is re-applied (expect $((always + 1)))"
out=$(INIT_DIR="$tmp/init" sh "$DB_DIR/migrate.sh")
echo "$out"
expect_count "$((always + 1))" "$out"

expected=$(sha256sum "$tmp/init/$file" | cut -d ' ' -f 1)
stored=$(psql -X -At --no-password \
  -c "select checksum from schema_migrations where filename = '$file'")
[ "$stored" = "$expected" ] || {
  echo "Checksum for $file not updated: stored=$stored expected=$expected" >&2
  exit 1
}

echo "== restoring the original checksum (expect $((always + 1)))"
out=$(sh "$DB_DIR/migrate.sh")
echo "$out"
expect_count "$((always + 1))" "$out"

echo "Migration re-run check passed."
