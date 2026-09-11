create or replace function get_task_files(t_id integer)
returns table(
    id integer,
    task_id integer,
    user_id integer,
    original_name text,
    stored_name text,
    size bigint,
    mime_type character varying,
    file_path text,
    uploaded_on timestamp with time zone,
    uploaded_by text
) as $function$
    select
        f.id,
        f.task_id,
        f.user_id,
        f.original_name,
        f.stored_name,
        f.size,
        f.mime_type,
        f.file_path,
        f.uploaded_on,
        u.name || ' ' || u.surname as uploaded_by
    from files f
    left join users u on f.user_id = u.id
    where f.task_id = t_id
    order by f.uploaded_on desc;
$function$ language sql stable;
