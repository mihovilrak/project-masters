insert into roles_permissions (role_id, permission_id)
select r.id, p.id
from (values
    ('Admin', 'Admin'),
    ('Project manager', 'Create projects'),
    ('Project manager', 'Edit projects'),
    ('Project manager', 'Delete projects'),
    ('Project manager', 'Create tasks'),
    ('Project manager', 'Edit tasks'),
    ('Project manager', 'Delete tasks'),
    ('Project manager', 'Log time'),
    ('Project manager', 'Edit log'),
    ('Project manager', 'Delete log'),
    ('Project manager', 'Delete files'),
    ('Developer', 'Create tasks'),
    ('Developer', 'Edit tasks'),
    ('Developer', 'Delete tasks'),
    ('Developer', 'Log time'),
    ('Developer', 'Edit log'),
    ('Developer', 'Delete log'),
    ('Reporter', 'Log time')
) as seed(role_name, permission_name)
join roles r on r.name = seed.role_name
join permissions p on p.name = seed.permission_name
on conflict (role_id, permission_id) do nothing;
