create or replace function user_settings_insert()
returns trigger as $function$

begin

    -- A replayed users row (restore, re-run of a seed script) must not fail on
    -- the user_id unique constraint and abort the user insert with it.
    insert into user_settings (user_id) values (NEW.id)
    on conflict (user_id) do nothing;
    return new;

end;

$function$ language plpgsql;

create or replace trigger trg_user_settings_insert
    after insert on users
    for each row
    execute function user_settings_insert();
