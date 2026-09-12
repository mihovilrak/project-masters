#!/bin/sh
# Dump the database to $DUMP_DIR and prune dumps older than
# $BACKUP_RETENTION_DAYS. Dumps stay on the DB host and are not encrypted;
# see db/README.md for the offsite copy.

set -eu

. "$(dirname "$0")/pgpass.sh"

DUMP_DIR="${DUMP_DIR:-/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
case "$RETENTION_DAYS" in
  ''|*[!0-9]*) echo "Invalid BACKUP_RETENTION_DAYS '$RETENTION_DAYS'" >&2; exit 1 ;;
esac

pg_env_init

DUMP_FILE="${DUMP_DIR}/db_dump_$(date +"%Y_%m_%d_%H-%M").dump"
TMP_FILE="${DUMP_FILE}.partial"

# Custom format: already compressed, and restorable selectively or in parallel.
# Written under a temp name so a failed dump never looks like a valid one.
if ! pg_dump --no-password -Fc -Z 6 -f "${TMP_FILE}" \
  || [ ! -s "${TMP_FILE}" ] || ! pg_restore --list "${TMP_FILE}" > /dev/null; then
  rm -f "${TMP_FILE}"
  echo "Backup failed: ${DUMP_FILE}" >&2
  exit 1
fi
mv "${TMP_FILE}" "${DUMP_FILE}"
echo "Backup written: ${DUMP_FILE}"

find "${DUMP_DIR}" -name "*.dump" -type f -mtime "+${RETENTION_DAYS}" -delete
