-- verb is only set for types sent through fan_out_notifications(); the others
-- are written by task_notification_trigger() and the due-soon sweep.
insert into notification_types (name, icon, color, title, verb) values
    ('Task Due Soon', 'AccessTime', '#ff9800', 'Task Due Soon', null),
    ('Task Assigned', 'Assignment', '#2196f3', 'Task Assigned', null),
    ('Task Updated', 'Update', '#4caf50', 'Task Updated', 'updated'),
    ('Task Comment', 'Comment', '#9c27b0', 'New Comment', 'commented on'),
    ('Task Completed', 'CheckCircle', '#4caf50', 'Task Completed', null),
    ('Project Update', 'Folder', '#2196f3', 'Project Updated', 'updated'),
    ('Task Created', 'AddTask', '#2196f3', 'Task Created', 'created'),
    ('Added to Project', 'CreateNewFolder', '#4caf50', 'Added to Project', 'added to')
on conflict (name) do update
set title = excluded.title, verb = excluded.verb;
