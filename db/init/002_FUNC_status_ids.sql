create or replace function task_status_id(p_name text)
returns smallint
language plpgsql
immutable
strict
as $$
begin
    case lower(p_name)
        when 'new' then return 1;
        when 'in_progress' then return 2;
        when 'on_hold' then return 3;
        when 'review' then return 4;
        when 'done' then return 5;
        when 'cancelled' then return 6;
        when 'deleted' then return 7;
        else raise exception 'Unknown task status: %', p_name;
    end case;
end;
$$;

create or replace function project_status_id(p_name text)
returns smallint
language plpgsql
immutable
strict
as $$
begin
    case lower(p_name)
        when 'active' then return 1;
        when 'inactive' then return 2;
        when 'deleted' then return 3;
        else raise exception 'Unknown project status: %', p_name;
    end case;
end;
$$;

create or replace function user_status_id(p_name text)
returns smallint
language plpgsql
immutable
strict
as $$
begin
    case lower(p_name)
        when 'active' then return 1;
        when 'inactive' then return 2;
        when 'deleted' then return 3;
        else raise exception 'Unknown user status: %', p_name;
    end case;
end;
$$;
