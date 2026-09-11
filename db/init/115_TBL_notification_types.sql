create table if not exists notification_types (
    id int2 primary key generated always as identity not null,
    name varchar(50) unique not null,
    icon varchar(50) not null,
    color varchar(7) not null,
    created_on timestamptz default current_timestamp not null
);
-- Title and verb of the messages built by fan_out_notifications(), kept here
-- so a new type cannot fall through to a generic message.
alter table notification_types
    add column if not exists title varchar(100),
    add column if not exists verb varchar(50);
