-- Return type changed; replace cannot alter it, so drop first.
drop function if exists user_notifications(integer);

-- Plain SQL so it is inlined: callers order and page, and their LIMIT reaches
-- the notifications scan instead of being applied to the full result.
create or replace function user_notifications(u_id integer)
returns table (
    id integer,
    user_id integer,
    type_id smallint,
    title character varying,
    message text,
    link character varying,
    data jsonb,
    is_read boolean,
    active boolean,
    read_on timestamp with time zone,
    created_on timestamp with time zone,
    type character varying,
    icon character varying,
    color character varying
) as $function$
    -- Columns listed explicitly so the row type cannot drift from the table.
    select
        n.id,
        n.user_id,
        n.type_id,
        n.title,
        n.message,
        n.link,
        n.data,
        n.is_read,
        n.active,
        n.read_on,
        n.created_on,
        nt.name as type,
        nt.icon,
        nt.color
    from notifications n
    join notification_types nt on n.type_id = nt.id
    where n.user_id = u_id and n.active = true;
$function$ language sql stable;
