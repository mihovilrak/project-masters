-- Run daily by notification-service. One notification per task, assignee and
-- due date: re-running the sweep is a no-op, while moving the due date or
-- reassigning the task notifies again.
create or replace function create_due_soon_notifications()
returns integer as $function$
    with inserted as (
        insert into notifications (user_id, type_id, title, message, link, data)
        select
            t.assignee_id,
            nt.id,
            nt.title,
            'Task "' || t.name || '" in project "' || p.name || '" is due '
                || case when t.due_date = current_date then 'today' else 'tomorrow' end,
            '/tasks/' || t.id,
            jsonb_build_object('task_id', t.id, 'due_date', t.due_date)
        from tasks t
        join projects p on p.id = t.project_id
        join notification_types nt on nt.name = 'Task Due Soon'
        where t.assignee_id is not null
        and t.due_date between current_date and current_date + 1
        and t.status_id <> all (array[
            task_status_id('done'),
            task_status_id('cancelled'),
            task_status_id('deleted')
        ])
        and not exists (
            select 1
            from notifications n
            where n.type_id = nt.id
            and n.user_id = t.assignee_id
            and n.data @> jsonb_build_object('task_id', t.id, 'due_date', t.due_date)
        )
        returning 1
    )
    select count(*)::integer from inserted;
$function$ language sql;
