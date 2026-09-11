-- migrate:always
-- Re-run on every migrate so a table added later with an updated_on column
-- gets its trigger without editing this file.
-- updated_on used to be written only by whichever UPDATE statement remembered
-- to set it, and defaulted to the creation time, so "has this row ever been
-- modified?" had no answer. It is now null until the first real change.
create or replace function set_updated_on()
returns trigger as $function$
begin
    NEW.updated_on := current_timestamp;
    return NEW;
end;
$function$ language plpgsql;

do $$
declare
    v_table text;
begin
    for v_table in
        select c.table_name
        from information_schema.columns c
        join information_schema.tables t using (table_schema, table_name)
        where c.table_schema = current_schema()
        and c.column_name = 'updated_on'
        and t.table_type = 'BASE TABLE'
    loop
        execute format(
            'create or replace trigger %I_updated_on
                before update on %I
                for each row
                when (OLD.* is distinct from NEW.*)
                execute function set_updated_on()',
            v_table, v_table
        );
    end loop;
end;
$$;
