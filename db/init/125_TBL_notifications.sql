create table if not exists notifications (
    id int primary key generated always as identity not null,
    user_id int references users(id) on delete cascade not null,
    type_id int2 references notification_types(id) not null,
    title varchar(100) not null,
    message text not null,
    link varchar(255) null,
    data jsonb null,
    is_read boolean default false not null,
    active boolean default true not null,
    read_on timestamptz null,
    emailed_on timestamptz null,
    email_attempts int2 default 0 not null,
    email_attempted_on timestamptz null,
    archived_on timestamptz null,
    created_on timestamptz default current_timestamp not null
);

-- Email delivery state is kept separately from read_on: read_on is the user's
-- own read marker, and using it for both meant an in-app read suppressed the
-- email. Existing databases predate these columns.
alter table notifications add column if not exists emailed_on timestamptz null;
alter table notifications add column if not exists email_attempts int2 default 0 not null;
alter table notifications add column if not exists email_attempted_on timestamptz null;

-- archived_on separates "aged out by the cleanup job" from the active = false
-- that api/ writes when a user deletes a notification; both used to be the
-- same flag, so the two were indistinguishable after the fact.
alter table notifications add column if not exists archived_on timestamptz null;

create index if not exists notifications_user_idx on notifications(user_id);
create index if not exists notifications_type_idx on notifications(type_id);
create index if not exists notifications_created_idx on notifications(created_on);
create index if not exists notifications_user_active_created_idx on notifications (user_id, active, created_on desc);
create index if not exists notifications_email_pending_idx on notifications (created_on) where emailed_on is null and active;
create index if not exists notifications_cleanup_idx on notifications (created_on)
    where active and (is_read or read_on is not null);
