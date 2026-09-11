create table if not exists roles_permissions (
    id int2 primary key generated always as identity not null,
    role_id int2 references roles(id) not null,
    permission_id int2 references permissions(id) not null,
    created_on timestamptz default current_timestamp not null,
    constraint roles_permissions_unique unique (role_id, permission_id)
);
create index if not exists roles_permissions_permission_idx on roles_permissions(permission_id);
