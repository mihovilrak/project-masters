#!/bin/sh
# Dump the database to $DUMP_DIR and prune dumps older than 30 days.

set -eu
set -o pipefail

. "$(dirname "$0")/pgpass.sh"

DUMP_DIR="${DUMP_DIR:-/backups}"
export PGHOST="${POSTGRES_HOST:-db}"
export PGPORT="${POSTGRES_PORT:-5432}"
export PGUSER="${POSTGRES_USER}"
export PGDATABASE="${POSTGRES_DB}"

pgpass_init

DUMP_FILE="${DUMP_DIR}/db_dump_$(date +"%Y_%m_%d_%H-%M").sql.gz"
TMP_FILE="${DUMP_FILE}.partial"

# Written under a temp name so a failed dump never looks like a valid one.
if ! pg_dump --no-password | gzip > "${TMP_FILE}" \
  || [ ! -s "${TMP_FILE}" ] || ! gzip -t "${TMP_FILE}"; then
  rm -f "${TMP_FILE}"
  echo "Backup failed: ${DUMP_FILE}" >&2
  exit 1
fi
mv "${TMP_FILE}" "${DUMP_FILE}"
echo "Backup written: ${DUMP_FILE}"

find "${DUMP_DIR}" -name "*.sql.gz" -type f -mtime +30 -delete
