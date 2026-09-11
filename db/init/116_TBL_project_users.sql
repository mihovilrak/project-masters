create table if not exists project_users (
    id int primary key generated always as identity not null,
    project_id int references projects(id) not null,
    user_id int references users(id) not null,
    created_on timestamptz default current_timestamp not null,
    constraint project_users_unique unique (project_id, user_id)
);
create index if not exists project_users_user_idx on project_users(user_id);
