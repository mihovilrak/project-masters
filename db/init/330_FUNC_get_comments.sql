drop function if exists get_task_comments(int);
drop function if exists get_comment_by_id(int);

-- Active comments of a task, or a single active comment by id.
create or replace function get_comments(
    p_task_id int default null,
    p_id int default null
)
returns table (
    id int,
    task_id int,
    user_id int,
    user_name text,
    comment text,
    active boolean,
    created_on timestamptz,
    updated_on timestamptz
) as $function$
    select
        c.id,
        c.task_id,
        c.user_id,
        u.name || ' ' || u.surname as user_name,
        c.comment,
        c.active,
        c.created_on,
        c.updated_on
    from comments c
    left join users u on u.id = c.user_id
    where c.active = true
    and (p_task_id is null or c.task_id = p_task_id)
    and (p_id is null or c.id = p_id)
    and (p_task_id is not null or p_id is not null)
    order by c.created_on desc;
$function$ language sql stable;
