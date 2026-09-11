create table if not exists task_tags (
    id int primary key generated always as identity not null,
    task_id int references tasks(id) on delete cascade not null,
    tag_id int2 references tags(id) on delete cascade not null,
    created_on timestamptz default current_timestamp not null,
    constraint task_tags_unique unique (task_id, tag_id)
);
create index if not exists task_tags_tag_idx on task_tags(tag_id);
