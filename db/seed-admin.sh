#!/bin/sh
# Create the default admin user using ADMIN_PASSWORD from the environment.
# psql reads the password with \getenv, so it is never on disk or in argv.

set -eu

if [ -z "${ADMIN_PASSWORD:-}" ]; then
  echo "ADMIN_PASSWORD not set; skipping admin seed"
  exit 0
fi

. "$(dirname "$0")/pgpass.sh"

export PGHOST="${POSTGRES_HOST:-db}"
export PGPORT="${POSTGRES_PORT:-5432}"
export PGUSER="${POSTGRES_USER}"
export PGDATABASE="${POSTGRES_DB}"

pgpass_init

# An existing admin keeps whatever password it has, so a rotated credential
# survives a restart. Set ADMIN_PASSWORD_FORCE_RESET=true to overwrite it.
if [ "${ADMIN_PASSWORD_FORCE_RESET:-}" = "true" ]; then
  conflict_action="do update set password = excluded.password, updated_on = current_timestamp"
else
  conflict_action="do nothing"
fi

psql -X -q --no-password -v ON_ERROR_STOP=1 << EOF
\getenv admin_password ADMIN_PASSWORD
insert into users (login, name, surname, email, password, role_id)
select 'admin', 'Admin', 'PM', 'admin@admin.com',
    crypt(:'admin_password', gen_salt('bf', 12)), r.id
from roles r
where r.name = 'Admin'
on conflict (login) ${conflict_action};
EOF

echo "Admin user seeded."
