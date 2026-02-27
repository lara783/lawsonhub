-- Seed: Master task list for the Lawson Family Hub
-- Run AFTER running the migration

insert into tasks (name, score, frequency, frequency_per_day, estimated_minutes, notes, is_active) values
-- Daily ×2
('Dishwasher unpack & repack',       5,  'daily',       2,  15,   'Twice per day — morning and evening',               true),

-- Daily ×1
('Lunchbox management',              1,  'daily',       1,  5,    'Ollie and Amelie only — Mon–Fri afternoons',        true),
('Washing — start a load',           3,  'daily',       1,  10,   'Sports program, 40°C',                              true),
('Put washing in dryer',             1,  'daily',       1,  5,    null,                                                true),
('Fold washing',                     5,  'daily',       1,  20,   'Fold the previous day''s washing',                  true),
('Put away own clothes',             1,  'daily',       1,  5,    null,                                                true),
('Make lunch for tomorrow',          3,  'daily',       1,  10,   null,                                                true),
('Take out garbage',                 1,  'daily',       1,  5,    'Includes recycling, replace bin bag',               true),
('Cook dinner',                      7,  'daily',       1,  60,   'Rotates across all family members weekly',          true),
('Clear table & put leftovers away', 3,  'daily',       1,  15,   'After dinner or any family meal',                   true),
('Wipe down bench & table',          3,  'daily',       1,  10,   'After every meal',                                  true),
('Feed Bowie',                       3,  'daily',       1,  5,    null,                                                true),
('Walk Bowie',                       5,  'daily',       1,  30,   null,                                                true),
('Cat litter — scoop poos',          2,  'daily',       1,  5,    'Sam or Amalee only',                                true),

-- Weekly
('Vacuum whole house',               10, 'weekly',      1,  45,   null,                                                true),
('Vacuum own room',                  5,  'weekly',      1,  15,   null,                                                true),
('Change sheets',                    2,  'weekly',      1,  15,   null,                                                true),
('Clean main bathroom',              10, 'weekly',      1,  45,   null,                                                true),
('Clean master bathroom',            10, 'weekly',      1,  45,   null,                                                true),
('Mow lawn',                         10, 'weekly',      1,  60,   null,                                                true),
('Cat litter — change pee mat',      3,  'weekly',      1,  10,   'Sam or Amalee only',                                true),

-- Fortnightly
('Mop floors',                       8,  'fortnightly', 1,  40,   null,                                                true),

-- Monthly
('Cat litter — full clean & refresh',6,  'monthly',     1,  30,   'Sam or Amalee only',                                true);

-- Transport (parent/admin only)
insert into tasks (name, score, frequency, frequency_per_day, estimated_minutes, notes, assigned_roles, is_active) values
('Take kids to school',          3,  'daily',       1,  30,   'Mon–Fri only — whoever is free in the morning', '{parent,admin}', true),
('Clean pool',                   10, 'weekly',      1,  60,   'Mark''s job every weekend',                     '{parent,admin}', true),
('Clean master bedroom',         3,  'weekly',      1,  20,   'Lisa on days off, otherwise Mark',              '{parent,admin}', true);
