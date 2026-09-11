-- The API and notification service connect as this role. It is not a superuser
-- and does not bypass RLS; the superuser is kept for migrations and backups.
-- Functions run with invoker rights, so the table grants below are what they
-- are allowed to touch. Re-run on every migration so new objects are covered.
\getenv app_user APP_DB_USER
\getenv app_password APP_DB_PASSWORD

select not exists (select 1 from pg_roles where rolname = :'app_user') as create_role,
    current_database() as db_name
\gset

\if :create_role
create role :"app_user";
\endif

alter role :"app_user" with login nosuperuser nocreatedb nocreaterole
    noreplication nobypassrls password :'app_password';

grant connect on database :"db_name" to :"app_user";
grant usage on schema public to :"app_user";
grant select, insert, update, delete on all tables in schema public to :"app_user";
grant usage, select on all sequences in schema public to :"app_user";
grant execute on all functions in schema public to :"app_user";
revoke all on schema_migrations from :"app_user";
