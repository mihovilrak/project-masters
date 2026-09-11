drop function if exists get_users(int, int, boolean);
drop function if exists get_user_by_id(int);

create or replace function get_users(
    p_status_id int default null,
    p_role_id int default null,
    p_include_deleted boolean default false,
    p_id int default null
)
returns table (
    id int,
    login varchar,
    name varchar,
    surname varchar,
    email varchar,
    role_id smallint,
    status_id smallint,
    status_name varchar,
    status_color varchar,
    role_name varchar,
    created_on timestamp with time zone,
    updated_on timestamp with time zone,
    last_login timestamp with time zone
) as $function$

begin
    return query
    select
        u.id,
        u.login,
        u.name,
        u.surname,
        u.email,
        u.role_id,
        u.status_id,
        s.name as status_name,
        s.color as status_color,
        r.name as role_name,
        date_trunc('second', u.created_on) as created_on,
        date_trunc('second', u.updated_on) as updated_on,
        date_trunc('second', l.logged_on) as last_login
    from users u
    left join user_statuses s on s.id = u.status_id
    left join roles r on r.id = u.role_id
    left join lateral (
        select al.user_id, al.logged_on
        from app_logins al
        where al.user_id = u.id
        order by al.logged_on desc
        limit 1
    ) l on true
    where (p_include_deleted or ((p_status_id is null and u.status_id != user_status_id('deleted')) or u.status_id = p_status_id))
    and (p_role_id is null or u.role_id = p_role_id)
    and (p_id is null or u.id = p_id)
    order by u.id;

end;

$function$ language plpgsql;
