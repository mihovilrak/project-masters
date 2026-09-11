-- Admin is whoever holds the 'Admin' permission, the same check the API makes.
create or replace function is_admin(user_id integer)
returns boolean as $function$
    select exists (
        select 1
        from users u
        join roles_permissions rp on rp.role_id = u.role_id
        join permissions p on p.id = rp.permission_id
        where u.id = user_id
        and p.name = 'Admin'
    );
$function$ language sql stable;
