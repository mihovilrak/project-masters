create or replace function create_project_member_notifications(
    p_project_id integer,
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
    v_member_ids integer[];

begin
    select 'project "' || p.name || '"'
    into v_subject
    from projects p
    where p.id = p_project_id;

    if not found then
        return;
    end if;

    select array_agg(pu.user_id) into v_member_ids
    from project_users pu
    where pu.project_id = p_project_id;

    return query
    select * from fan_out_notifications(
        v_member_ids, p_action_user_id, p_type_id, v_subject, '/projects/' || p_project_id
    );
end;

$function$ language plpgsql;
