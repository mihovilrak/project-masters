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

### Database tests

[api/src/\_\_tests\_\_/integration/db/](../api/src/__tests__/integration/db) tests the schema directly and runs as part of `yarn test:integration`:

- `migrations.test.ts`: every `init/*.sql` file has a `schema_migrations` row with its sha256. CI also re-runs `migrate.sh` to check it applies only `-- migrate:always` files and picks up a changed checksum.
- `privileges.test.ts`: `pm_app` gets DML on every table and an explicit `EXECUTE` grant on every function, but no DDL and no access to `schema_migrations`.
- `triggers.test.ts`: task notifications, `updated_on` and `user_settings` triggers.
- `notifications.test.ts`: fan-out, watcher and member notifications, due-soon sweeps, `user_notifications` and `get_notifications_for_service`.
- `queries.test.ts`: `get_tasks` filters, spent time, permissions, `delete_role`, the status-id helpers, and the comment, user and profile functions.

[contracts/model-database-contract.test.ts](../api/src/__tests__/integration/contracts/model-database-contract.test.ts) checks that function columns cover the fields the models return, and that every `create or replace function` in `init/` has exactly one overload.

The tests use the helpers in [setup/db.helpers.ts](../api/src/__tests__/integration/setup/db.helpers.ts). `inRollback(pool, fn)` checks out a client, runs `begin`, then `fn(client)`, then always `rollback`, so tests leave no rows behind and need no cleanup. Use `appPool` to run as `pm_app`, or the admin `testPool` for things the app role may not do. Run the fixture inserts (`insertUser`, `insertProject`, `insertTask`, `insertTimeLog`) on that `client`. A failed statement aborts the transaction, so use `expectPgErrorIn(client, sql, code)`, which wraps the statement in a savepoint, when the test continues after the error.

## Backups

The `backup` compose service ([backup-scheduler.sh](backup-scheduler.sh)) runs [backup.sh](backup.sh) daily at `BACKUP_TIME` (`HH:MM`, in `TZ`, default `00:00`).

- Dumps go to `./db/backup/db_dump_<timestamp>.dump` on the host, in `pg_dump` custom format (already compressed, restorable selectively and in parallel). A dump is written to a `.partial` file and only renamed after `pg_restore --list` reads it back; dumps older than `BACKUP_RETENTION_DAYS` (default 30) are deleted.
- The service runs as the `nginx` user (uid 101) from the app image. On Linux, the host directory must be writable by it: `mkdir -p db/backup && sudo chown 101:101 db/backup`.
- Run a backup now: `docker compose exec backup sh /app/db/backup.sh`.
- Restore: `docker compose exec -T db pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists < db/backup/<file>.dump`. Add `-j 4` to restore in parallel, or `-t <table>` for a single table.
- List a dump's contents without restoring: `pg_restore --list db/backup/<file>.dump`.

### Offsite copies

Dumps sit on the same host as the database and are **not encrypted**, so a host loss or a host compromise takes the backups with it. Nothing ships an offsite copy; set one up before treating this as a real backup. A host-side cron job next to the bind mount is enough, for example:

```sh
# Encrypt, then sync to object storage. Keep the recipient key off this host.
gpg --encrypt --recipient backups@example.com db/backup/db_dump_*.dump
aws s3 sync db/backup s3://<bucket>/pm-backups --exclude '*' --include '*.gpg'
```

Whatever the target, verify a restore into a scratch database periodically; an unread dump is not a backup.

## Row Level Security (RLS)

RLS is not enabled. The app role does not bypass RLS, so policies would apply to it. Enabling RLS would also require the API to set per-request session context (e.g. `set_config('app.user_id', ..., true)` inside the request's transaction) and a policy on each table referencing that context; without both, enabling RLS would hide all rows.
