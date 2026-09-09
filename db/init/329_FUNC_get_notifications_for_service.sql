drop function if exists get_notifications_for_service(int);
drop function if exists get_notifications_for_service(int, int2);

create or replace function get_notifications_for_service(p_limit int, p_max_attempts int2)
returns table (
    id int,
    user_id int,
    type_id smallint,
    type_name varchar,
    title varchar,
    message text,
    link varchar,
    data jsonb,
    email_attempts smallint,
    created_on timestamptz,
    email varchar,
    login varchar
) as $function$

begin

    -- Claim the batch by incrementing the attempt counter and committing before
    -- any mail is sent. There is deliberately no time window: a notification is
    -- picked up until it is emailed, so a restart or an SMTP outage delays
    -- delivery instead of losing it, and a row that keeps failing drops out of
    -- the queue after p_max_attempts rather than retrying forever.
    return query
    with pending as (
        select n.id
        from notifications n
        left join user_settings s on s.user_id = n.user_id
        where n.active
        and n.emailed_on is null
        and n.email_attempts < p_max_attempts
        -- Both switches are user-facing promises, so a claimed row is one the
        -- user has actually consented to be emailed about.
        and coalesce(s.notifications_enabled, true)
        and coalesce(s.email_notifications_enabled, true)
        -- Exponential backoff, persisted: a failed attempt is not retried on
        -- the next tick but after 2^attempts minutes.
        and (
            n.email_attempted_on is null
            or n.email_attempted_on < now() - (interval '1 minute' * power(2, n.email_attempts))
        )
        order by n.created_on
        for update of n skip locked
        limit p_limit
    )
    update notifications n
    set email_attempts = n.email_attempts + 1,
        email_attempted_on = now()
    from pending p, users u, notification_types t
    where n.id = p.id
    and u.id = n.user_id
    and t.id = n.type_id
    returning
        n.id,
        n.user_id,
        n.type_id,
        t.name,
        n.title,
        n.message,
        n.link,
        n.data,
        n.email_attempts,
        n.created_on,
        u.email,
        u.login;

end;

$function$ language plpgsql;
