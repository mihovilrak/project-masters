create table if not exists app_settings (
    id int primary key generated always as identity not null,
    app_name varchar(255) not null default 'Project Management App',
    company_name varchar(255) not null default 'Project Management Inc.',
    sender_email varchar(255) not null default 'no-reply@projectmanagementapp.com',
    time_zone varchar(255) not null default 'Europe/Zagreb',
    theme varchar(255) not null default 'light',
    welcome_message text not null default '<h1>Welcome to Project Management App!</h1>',
    created_on timestamptz not null default current_timestamp,
    updated_on timestamptz not null default current_timestamp,
    constraint single_row check (id = 1)
);
alter table app_settings
    alter column created_on type timestamptz,
    alter column updated_on type timestamptz;
