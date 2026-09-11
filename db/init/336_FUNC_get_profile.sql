create or replace function get_profile(p_user_id int)
returns table (
    id int,
    login varchar,
    name varchar,
    surname varchar,
    email varchar,
    role_name varchar,
    created_on timestamptz,
    last_login timestamptz,
    total_tasks bigint,
    completed_tasks bigint,
    active_projects bigint,
    total_hours numeric
) as $function$

begin

    return query
    select
        u.id,
        u.login,
        u.name,
        u.surname,
        u.email,
        r.name as role_name,
        u.created_on,
        l.logged_on as last_login,
        coalesce(tu.total_tasks, 0)::bigint as total_tasks,
        coalesce(ct.completed_tasks, 0)::bigint as completed_tasks,
        coalesce(ap.active_projects, 0)::bigint as active_projects,
        coalesce(th.total_hours, 0)::numeric as total_hours
    from users u
    left join roles r on r.id = u.role_id
    left join lateral (
        select al.logged_on
        from app_logins al
        where al.user_id = u.id
        order by al.logged_on desc
        limit 1
    ) l on true
    left join (
        select assignee_id, count(*)::bigint as total_tasks
        from tasks
        where status_id <> all (array[
            task_status_id('done'),
            task_status_id('cancelled'),
            task_status_id('deleted')
        ])
        group by assignee_id
    ) tu on tu.assignee_id = u.id
    left join (
        select assignee_id, count(*)::bigint as completed_tasks
        from tasks
        where status_id = task_status_id('done')
        group by assignee_id
    ) ct on ct.assignee_id = u.id
    left join (
        select pu.user_id, count(*)::bigint as active_projects
        from project_users pu
        join projects p on pu.project_id = p.id
        where p.status_id = project_status_id('active')
        group by pu.user_id
    ) ap on ap.user_id = u.id
    left join (
        select user_id, coalesce(sum(spent_time), 0)::numeric as total_hours
        from time_logs
        group by user_id
    ) th on th.user_id = u.id
    where u.status_id != user_status_id('deleted')
    and u.id = p_user_id;

end;

$function$ language plpgsql;
