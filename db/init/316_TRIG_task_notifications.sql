-- Task Due Soon is not raised here: it depends on the calendar, not on a row
-- change, so create_due_soon_notifications() sweeps for it on a schedule.
create or replace function task_notification_trigger()
returns trigger as $function$

declare
    v_type_id smallint;
    v_done_id smallint;

begin
    -- Status ids are looked up by name: hard-coding them here is what made
    -- "deleted" mean two different numbers elsewhere in this schema.
    select id into v_done_id from task_statuses where name = 'Done';

    -- Task Assigned
    if TG_OP = 'UPDATE' and NEW.assignee_id is not null
        and NEW.assignee_id is distinct from OLD.assignee_id
    then
        select id into v_type_id from notification_types where name = 'Task Assigned';
        if found then
            perform create_notification(
                NEW.assignee_id,
                v_type_id,
                'Task Assigned',
                'You have been assigned to task: ' || NEW.name,
                '/tasks/' || NEW.id
            );
        end if;
    end if;

    -- Task Status Updated
    if TG_OP = 'UPDATE' and NEW.status_id is distinct from OLD.status_id then
        select id into v_type_id from notification_types where name = 'Task Updated';
        if found and NEW.assignee_id is not null then
            perform create_notification(
                NEW.assignee_id,
                v_type_id,
                'Task Status Updated',
                'Task ' || NEW.name || ' status has been updated',
                '/tasks/' || NEW.id
            );
        end if;
    end if;

    -- Task Completed
    if TG_OP = 'UPDATE' and v_done_id is not null
        and NEW.status_id = v_done_id and OLD.status_id is distinct from v_done_id
    then
        select id into v_type_id from notification_types where name = 'Task Completed';
        if found and NEW.created_by is not null then
            perform create_notification(
                NEW.created_by,
                v_type_id,
                'Task Completed',
                'Task ' || NEW.name || ' has been completed',
                '/tasks/' || NEW.id
            );
        end if;
    end if;

    -- No exception handler: a failing notification should abort the write
    -- rather than disappear into a warning nobody reads.
    return NEW;
end;
$function$ language plpgsql;

create or replace trigger task_notifications
    after update on tasks
    for each row
    execute function task_notification_trigger();
