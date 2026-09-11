import { appPool, expectPgErrorIn, inRollback } from '../setup/db.helpers';

describe('app role privileges', () => {
  it('is not a superuser and cannot create roles or databases or bypass RLS', async () => {
    const { rows } = await appPool.query(
      `select rolsuper, rolcreaterole, rolcreatedb, rolbypassrls
       from pg_roles where rolname = current_user`,
    );

    expect(rows).toEqual([
      {
        rolsuper: false,
        rolcreaterole: false,
        rolcreatedb: false,
        rolbypassrls: false,
      },
    ]);
  });

  it('can select, insert, update and delete on every public table except schema_migrations', async () => {
    const { rows: tables } = await appPool.query(
      `select count(*)::int as count from pg_tables
       where schemaname = 'public' and tablename <> 'schema_migrations'`,
    );
    const { rows: missing } = await appPool.query(
      `select t.tablename, p.privilege
       from pg_tables t
       cross join unnest(array['select', 'insert', 'update', 'delete']) as p(privilege)
       where t.schemaname = 'public'
         and t.tablename <> 'schema_migrations'
         and not has_table_privilege(
           format('public.%I', t.tablename), p.privilege
         )`,
    );

    expect(tables[0].count).toBeGreaterThan(0);
    expect(missing).toEqual([]);
  });

  it('cannot read schema_migrations', async () => {
    await inRollback(appPool, (client) =>
      expectPgErrorIn(client, 'select * from schema_migrations', '42501'),
    );
  });

  it.each([
    ['create table', 'create table privileges_probe (id int)'],
    ['alter table', 'alter table tasks add column privileges_probe int'],
    ['drop function', 'drop function get_tasks'],
  ])('cannot %s', async (_label, sql) => {
    await inRollback(appPool, (client) =>
      expectPgErrorIn(client, sql, '42501'),
    );
  });

  it('has execute on every public function', async () => {
    const { rows: functions } = await appPool.query(
      `select count(*)::int as count from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public'`,
    );
    const { rows: missing } = await appPool.query(
      `select p.oid::regprocedure::text as function
       from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public'
         and not has_function_privilege(p.oid, 'execute')`,
    );
    // PUBLIC has execute by default, so also require app-role.sql's explicit grant.
    const { rows: ungranted } = await appPool.query(
      `select p.oid::regprocedure::text as function
       from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public'
         and not exists (
           select 1 from aclexplode(p.proacl) a
           where a.grantee = (select oid from pg_roles where rolname = current_user)
             and a.privilege_type = 'EXECUTE'
         )`,
    );

    expect(functions[0].count).toBeGreaterThan(0);
    expect(missing).toEqual([]);
    expect(ungranted).toEqual([]);
  });
});
