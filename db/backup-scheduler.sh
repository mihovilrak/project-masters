#!/bin/sh
# Runs backup.sh once a day at $BACKUP_TIME (HH:MM, container time zone).
# Failures are logged to stdout (docker logs) and retried the next day.

set -eu

BACKUP_TIME="${BACKUP_TIME:-00:00}"
case "$BACKUP_TIME" in
  [0-1][0-9]:[0-5][0-9] | 2[0-3]:[0-5][0-9]) ;;
  *) echo "Invalid BACKUP_TIME '$BACKUP_TIME' (expected HH:MM)" >&2; exit 1 ;;
esac

strip_zero() { v="${1#0}"; echo "${v:-0}"; }

target=$(( $(strip_zero "${BACKUP_TIME%:*}") * 3600 + $(strip_zero "${BACKUP_TIME#*:}") * 60 ))

trap 'exit 0' INT TERM

while :; do
  set -- $(date '+%H %M %S')
  now=$(( $(strip_zero "$1") * 3600 + $(strip_zero "$2") * 60 + $(strip_zero "$3") ))
  delay=$(( (target - now + 86400) % 86400 ))
  if [ "$delay" -eq 0 ]; then delay=86400; fi
  echo "Next backup in ${delay}s (at ${BACKUP_TIME})"
  sleep "$delay" & wait $!
  sh "$(dirname "$0")/backup.sh" || echo "Backup run failed" >&2
done
