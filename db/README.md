# Database (db/)

## User deletion

User "deletion" is done by setting `status_id = 3` (soft delete). Tables that reference `users(id)` do not use `ON DELETE`, so hard deletes are restricted. To allow hard deletes you would need to define CASCADE/SET NULL behavior and align foreign keys.

## Status enums

Status values used across the app:

- **user_statuses**: 1 = active, 2 = inactive, 3 = deleted (soft). Only active users can log in.
- **project_statuses** / **task_statuses**: 1 = active, 2 = …, 3 = deleted/archived (e.g. `delete_project` sets `status_id = 3`; views filter with `status_id != 3`).

## Migrations

[migrate.sh](migrate.sh) runs as the one-shot `migrate` compose service before `api` and `notifications` start:

1. Applies `init/*.sql` in filename order, each file in a single transaction with `ON_ERROR_STOP=1`.
2. Records each file's sha256 in `schema_migrations`; unchanged files are skipped. The scripts are idempotent, so an edited file is simply re-applied. A file whose first line is `-- migrate:always` runs every time.
3. Creates or updates the application role from `APP_DB_USER` / `APP_DB_PASSWORD` ([app-role.sql](app-role.sql)).
4. Seeds the admin user ([seed-admin.sh](seed-admin.sh)) if `ADMIN_PASSWORD` is set. An existing admin is left alone unless `ADMIN_PASSWORD_FORCE_RESET=true`.

Because edited files are re-applied against existing databases, a changed function signature needs a `drop function if exists` for the old one, and a changed table needs `alter table` statements (not only the `create table if not exists`).

Credentials go through a temporary `.pgpass` ([pgpass.sh](pgpass.sh)), never `PGPASSWORD`.

## Roles and privileges

- `POSTGRES_USER` owns the schema. Only `migrate` and `backup` connect with it.
- `APP_DB_USER` (default `pm_app`) is what `api` and `notification-service` use: `LOGIN`, no `SUPERUSER` / `CREATEDB` / `CREATEROLE` / `BYPASSRLS`. It gets `CONNECT`, `USAGE` on `public`, DML on all tables, `USAGE`/`SELECT` on sequences and `EXECUTE` on functions. It cannot read `schema_migrations` or run DDL / `TRUNCATE`.
- Functions run as invoker (no `SECURITY DEFINER`), so they only do what the app role itself may do. If a function ever needs elevated rights, make it `SECURITY DEFINER` with `set search_path = public, pg_temp` and review it.
- The grants are re-applied on every migration, so new tables and functions are covered automatically.

## Integration test database

CI and local integration tests use a Postgres database with the same schema as production, initialized by `migrate.sh`.

- **CI**: runs `db/migrate.sh` against the service Postgres, then the tests connect as `pm_app` (fixtures seed and truncate as `pm_user` via `TEST_DB_ADMIN_*`).
- **Local**: run `yarn setup-test-db` from `api/`. It starts `pm_test_db` on port 5433 and runs `migrate.sh` inside it; re-run it after schema changes.

## Backups

The `backup` compose service ([backup-scheduler.sh](backup-scheduler.sh)) runs [backup.sh](backup.sh) daily at `BACKUP_TIME` (`HH:MM`, in `TZ`, default `00:00`).

- Dumps go to `./db/backup/db_dump_<timestamp>.sql.gz` on the host. A dump is written to a `.partial` file and only renamed after `gzip -t` passes; dumps older than 30 days are deleted.
- The service runs as the `postgres` user (uid 70). On Linux, the host directory must be writable by it: `mkdir -p db/backup && sudo chown 70:70 db/backup`.
- Run a backup now: `docker compose exec backup sh /scripts/backup.sh`.
- Restore: `gunzip -c db/backup/<file>.sql.gz | docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"`.

## Row Level Security (RLS)

RLS is not enabled. The app role does not bypass RLS, so policies would apply to it. Enabling RLS would also require the API to set per-request session context (e.g. `set_config('app.user_id', ..., true)` inside the request's transaction) and a policy on each table referencing that context; without both, enabling RLS would hide all rows.
