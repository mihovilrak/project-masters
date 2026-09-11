# Sourced by the db scripts. Writes a private .pgpass for $POSTGRES_USER so the
# password never reaches argv or the process environment (PGPASSWORD).

pgpass_escape() {
  printf '%s' "$1" | sed 's/[\\:]/\\&/g'
}

pgpass_init() {
  umask 077
  PGPASSFILE=$(mktemp /tmp/.pgpass.XXXXXX)
  export PGPASSFILE
  trap 'rm -f "$PGPASSFILE"' EXIT
  trap 'exit 1' INT TERM
  printf '*:*:*:%s:%s\n' \
    "$(pgpass_escape "${POSTGRES_USER}")" \
    "$(pgpass_escape "${POSTGRES_PASSWORD}")" > "$PGPASSFILE"
}
