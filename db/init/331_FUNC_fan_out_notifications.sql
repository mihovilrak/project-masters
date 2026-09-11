-- Notifies every recipient except the acting user with
-- '<action user> <verb> <subject>'; title and verb come from notification_types.
create or replace function fan_out_notifications(
    p_user_ids integer[],
    p_action_user_id integer,
    p_type_id smallint,
    p_subject text,
    p_link varchar(255)
)
returns table (
    id integer,
    user_id integer,
    type_id smallint,
    title varchar(100),
    message text,
    link varchar(255),
    data jsonb,
    is_read boolean,
    active boolean,
    read_on timestamptz,
    created_on timestamptz
) as $function$

begin
    if not exists (
        select 1
        from notification_types nt
        where nt.id = p_type_id
        and nt.title is not null
        and nt.verb is not null
    ) then
        raise exception 'Notification type % has no fan-out title/verb', p_type_id;
    end if;

    return query
    insert into notifications (user_id, type_id, title, message, link)
    select
        r.recipient_id,
        nt.id,
        nt.title,
        u.name || ' ' || nt.verb || ' ' || p_subject,
        p_link
    from unnest(p_user_ids) as r(recipient_id)
    join notification_types nt on nt.id = p_type_id
    join users u on u.id = p_action_user_id
    where r.recipient_id <> p_action_user_id
    returning
        notifications.id,
        notifications.user_id,
        notifications.type_id,
        notifications.title,
        notifications.message,
        notifications.link,
        notifications.data,
        notifications.is_read,
        notifications.active,
        notifications.read_on,
        notifications.created_on;
end;

$function$ language plpgsql;
