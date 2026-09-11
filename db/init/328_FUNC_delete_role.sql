create or replace function delete_role(p_id smallint)
returns boolean as $function$
begin
    perform 1 from roles where id = p_id for update;
    if not found then
        return false;
    end if;

    delete from roles_permissions where role_id = p_id;
    delete from roles where id = p_id;
    return true;
end;
$function$ language plpgsql;
