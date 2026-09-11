create table if not exists watchers (
    id int primary key generated always as identity not null,
    user_id int not null references users(id),
    task_id int not null references tasks(id),
    created_on timestamptz default current_timestamp,
    constraint watchers_unique unique (user_id, task_id)
);
create index if not exists watchers_task_idx on watchers(task_id);
