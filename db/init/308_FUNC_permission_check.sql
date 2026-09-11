-- The 'Admin' permission implies every other permission.
create or replace function permission_check(
    user_id integer,
    required_permission character varying
)
returns boolean as $function$
    select exists (
        select 1
        from users u
        join roles_permissions rp on rp.role_id = u.role_id
        join permissions p on p.id = rp.permission_id
        where u.id = user_id
        and p.name in ('Admin', required_permission)
    );
$function$ language sql stable;
