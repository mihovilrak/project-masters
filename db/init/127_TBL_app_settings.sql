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

-- Runtime-editable settings the admin UI used to write to a shared .env file.
alter table app_settings
    add column if not exists app_base_url varchar(255) not null default 'http://localhost:3000',
    add column if not exists log_level varchar(16) not null default 'info',
    add column if not exists email_enabled boolean not null default false,
    add column if not exists email_host varchar(255) not null default 'smtp.gmail.com',
    add column if not exists email_port int not null default 587,
    add column if not exists email_secure boolean not null default false;

alter table app_settings
    drop constraint if exists app_settings_log_level_check;

alter table app_settings
    add constraint app_settings_log_level_check
    check (log_level in ('error', 'warn', 'info', 'debug'));

alter table app_settings
    drop constraint if exists app_settings_email_port_check;

alter table app_settings
    add constraint app_settings_email_port_check
    check (email_port between 1 and 65535);
