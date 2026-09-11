drop function if exists get_tasks(
    int, int, int, int, smallint, smallint, smallint, int, boolean, int,
    date, date, date, date, date, date, numeric, numeric, boolean,
    smallint[], smallint[], int[], int[], int[], smallint[], int[]
);

-- Call with named arguments. Plain SQL so it is inlined into the caller: the
-- caller's access filter, ORDER BY and LIMIT/OFFSET are planned together with
-- these filters, and every call shape gets its own plan.
create or replace function get_tasks(
    p_id int default null,
    p_parent_id int default null,
    p_project_ids int[] default null,
    p_assignee_ids int[] default null,
    p_holder_ids int[] default null,
    p_status_ids smallint[] default null,
    p_priority_ids smallint[] default null,
    p_type_ids smallint[] default null,
    p_created_by_ids int[] default null,
    p_active_statuses_only boolean default false,
    p_inactive_statuses_only boolean default false,
    p_due_date_from date default null,
    p_due_date_to date default null,
    p_start_date_from date default null,
    p_start_date_to date default null,
    p_created_from date default null,
    p_created_to date default null,
    p_estimated_time_min numeric default null,
    p_estimated_time_max numeric default null
)
returns table (
    id int,
    name varchar,
    project_id int,
    project_name varchar,
    holder_id int,
    holder_name varchar,
    assignee_id int,
    assignee_name varchar,
    parent_id int,
    parent_name varchar,
    description text,
    type_id smallint,
    type_name varchar,
    type_color varchar,
    type_icon varchar,
    status_id smallint,
    status_name varchar,
    status_color varchar,
    priority_id smallint,
    priority_name varchar,
    priority_color varchar,
    start_date date,
    due_date date,
    end_date date,
    spent_time numeric,
    progress int,
    created_by int,
    created_by_name varchar,
    created_on timestamp with time zone,
    estimated_time numeric
) as $function$
    select
        t.id,
        t.name,
        t.project_id,
        po.name as project_name,
        t.holder_id,
        h.name as holder_name,
        t.assignee_id,
        a.name as assignee_name,
        t.parent_id,
        pt.name as parent_name,
        t.description,
        t.type_id,
        tt.name as type_name,
        tt.color as type_color,
        tt.icon as type_icon,
        t.status_id,
        ts.name as status_name,
        ts.color as status_color,
        t.priority_id,
        pi.name as priority_name,
        pi.color as priority_color,
        t.start_date,
        t.due_date,
        t.end_date,
        (select sum(tl.spent_time) from time_logs tl where tl.task_id = t.id)::numeric as spent_time,
        t.progress,
        t.created_by,
        c.name as created_by_name,
        date_trunc('second', t.created_on) as created_on,
        t.estimated_time
    from tasks t
    left join projects po on po.id = t.project_id
    left join users h on h.id = t.holder_id
    left join users a on a.id = t.assignee_id
    left join users c on c.id = t.created_by
    left join task_types tt on tt.id = t.type_id
    left join task_statuses ts on ts.id = t.status_id
    left join priorities pi on pi.id = t.priority_id
    left join tasks pt on pt.id = t.parent_id
    where (p_id is null or t.id = p_id)
    and (p_parent_id is null or t.parent_id = p_parent_id)
    and (p_project_ids is null or t.project_id = any(p_project_ids))
    and (p_assignee_ids is null or t.assignee_id = any(p_assignee_ids))
    and (p_holder_ids is null or t.holder_id = any(p_holder_ids))
    and (p_status_ids is null or t.status_id = any(p_status_ids))
    and (p_priority_ids is null or t.priority_id = any(p_priority_ids))
    and (p_type_ids is null or t.type_id = any(p_type_ids))
    and (p_created_by_ids is null or t.created_by = any(p_created_by_ids))
    and case
        when p_inactive_statuses_only then t.status_id in (
            task_status_id('done'), task_status_id('cancelled'), task_status_id('deleted')
        )
        when p_active_statuses_only then t.status_id in (
            task_status_id('new'), task_status_id('in_progress'),
            task_status_id('on_hold'), task_status_id('review')
        )
        else true
    end
    and (p_due_date_from is null or t.due_date >= p_due_date_from)
    and (p_due_date_to is null or t.due_date <= p_due_date_to)
    and (p_start_date_from is null or t.start_date >= p_start_date_from)
    and (p_start_date_to is null or t.start_date <= p_start_date_to)
    and (p_created_from is null or t.created_on::date >= p_created_from)
    and (p_created_to is null or t.created_on::date <= p_created_to)
    and (p_estimated_time_min is null or t.estimated_time >= p_estimated_time_min)
    and (p_estimated_time_max is null or t.estimated_time <= p_estimated_time_max);
$function$ language sql stable;
