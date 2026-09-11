insert into priorities (name, color) values
    ('Low/Wont', '#4CAF50'),
    ('Normal/Could', '#2196F3'),
    ('High/Should', '#FFA726'),
    ('Very high/Must', '#F44336'),
    ('Urgent/ASAP', '#B71C1C')
on conflict (name) do update set color = EXCLUDED.color;