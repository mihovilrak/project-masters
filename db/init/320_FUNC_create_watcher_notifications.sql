create or replace function create_watcher_notifications(
    p_task_id integer,
    p_action_user_id integer,
    p_type_id smallint
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

declare
    v_subject text;
    v_watcher_ids integer[];

begin
    select 'task "' || t.name || '" in project "' || p.name || '"'
    into v_subject
    from tasks t
    join projects p on p.id = t.project_id
    where t.id = p_task_id;

    if not found then
        return;
    end if;

    select array_agg(w.user_id) into v_watcher_ids
    from watchers w
    where w.task_id = p_task_id;

    return query
    select * from fan_out_notifications(
        v_watcher_ids, p_action_user_id, p_type_id, v_subject, '/tasks/' || p_task_id
    );
end;

$function$ language plpgsql;
