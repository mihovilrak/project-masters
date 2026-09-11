insert into activity_types (name, color, description) values
    ('Development', '#2196f3', 'General development work'),
    ('Testing', '#9c27b0', 'Testing and quality assurance'),
    ('Documentation', '#795548', 'Writing and updating documentation'),
    ('Meeting', '#ff9800', 'Team meetings and discussions'),
    ('Code Review', '#4caf50', 'Reviewing and providing feedback on code'),
    ('Bug Fixing', '#f44336', 'Fixing bugs and issues'),
    ('Planning', '#673ab7', 'Project planning and organization'),
    ('Research', '#607d8b', 'Research and investigation'),
    ('Analysis', '#00bcd4', 'System and requirement analysis'),
    ('Design', '#e91e63', 'UI/UX and system design'),
    ('DevOps', '#3f51b5', 'Infrastructure and deployment work'),
    ('Support', '#ff5722', 'User and system support'),
    ('Other', '#9e9e9e', 'Other activities')
on conflict (name) do nothing;
-- DevOps used to share Documentation's color; recolor it unless an admin already changed it.
update activity_types set color = '#3f51b5' where name = 'DevOps' and color = '#795548';
