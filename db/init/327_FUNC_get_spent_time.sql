drop function if exists get_task_spent_time(int);
drop function if exists get_project_spent_time(int);

-- Pass exactly one of the ids. Returns 0 when nothing has been logged.
create or replace function get_spent_time(
    p_task_id int default null,
    p_project_id int default null
)
returns numeric as $function$
    select coalesce(sum(tl.spent_time), 0)::numeric
    from time_logs tl
    join tasks t on t.id = tl.task_id
    where (p_task_id is null or tl.task_id = p_task_id)
    and (p_project_id is null or t.project_id = p_project_id)
    and (p_task_id is not null or p_project_id is not null);
$function$ language sql stable;
