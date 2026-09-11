-- User deletion is soft. Tables referencing users(id) have no ON DELETE, so hard deletes are restricted.
create table if not exists users (
    id int primary key generated always as identity not null,
    login varchar(255) unique not null,
    name varchar(255) not null,
    surname varchar(255) not null,
    email varchar(255) unique not null,
    password varchar(255) not null,
    status_id int2 references user_statuses(id) default 1 not null,
    role_id int2 references roles(id) not null,
    created_on timestamptz default current_timestamp not null,
    updated_on timestamptz null
);
-- Role ids are not stable across databases, so every insert names the role.
alter table users alter column role_id drop default;
create index if not exists user_status_idx on users(status_id);
create index if not exists user_roles_idx on users(role_id);
