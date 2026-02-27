-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null,
  role text not null check (role in ('parent', 'adult_child', 'school_kid', 'admin')),
  colour text not null default '#2E86AB',
  avatar_initials text not null default '?',
  created_at timestamptz default now()
);

alter table profiles enable row level security;
create policy "Anyone can view profiles" on profiles for select using (true);
create policy "Users update own profile" on profiles for update using (auth.uid() = id);
create policy "Service role insert" on profiles for insert with check (true);

-- ============================================================
-- COMMITMENTS
-- ============================================================
create table commitments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  commitment_type text not null check (commitment_type in ('work', 'school', 'sport', 'other')),
  is_recurring boolean default false,
  recur_days integer[] default '{}',
  start_time time not null,
  end_time time not null,
  specific_date date,
  created_at timestamptz default now()
);

alter table commitments enable row level security;
create policy "Anyone can view commitments" on commitments for select using (true);
create policy "Users manage own commitments" on commitments for all using (auth.uid() = user_id);
create policy "Admin manages all commitments" on commitments for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ============================================================
-- TASKS (master list)
-- ============================================================
create table tasks (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  score integer not null check (score between 1 and 10),
  frequency text not null check (frequency in ('daily', 'weekly', 'fortnightly', 'monthly')),
  frequency_per_day integer default 1,
  estimated_minutes integer,
  assigned_roles text[] default '{}',
  notes text,
  is_active boolean default true
);

alter table tasks enable row level security;
create policy "Anyone can view tasks" on tasks for select using (true);
create policy "Admin manages tasks" on tasks for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ============================================================
-- TASK ASSIGNMENTS
-- ============================================================
create table task_assignments (
  id uuid default uuid_generate_v4() primary key,
  task_id uuid references tasks(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  assigned_date date not null,
  week_start date not null,
  completed boolean default false,
  completed_at timestamptz,
  created_at timestamptz default now()
);

alter table task_assignments enable row level security;
create policy "Anyone can view assignments" on task_assignments for select using (true);
create policy "Users complete own tasks" on task_assignments for update using (auth.uid() = user_id);
create policy "Admin manages all assignments" on task_assignments for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Service role insert assignments" on task_assignments for insert with check (true);

-- ============================================================
-- WEEKLY NOTES
-- ============================================================
create table weekly_notes (
  id uuid default uuid_generate_v4() primary key,
  week_start date not null,
  created_by uuid references profiles(id) on delete set null,
  content text,
  created_at timestamptz default now()
);

alter table weekly_notes enable row level security;
create policy "Anyone can view weekly notes" on weekly_notes for select using (true);
create policy "Admin manages weekly notes" on weekly_notes for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ============================================================
-- GROCERY LISTS
-- ============================================================
create table grocery_lists (
  id uuid default uuid_generate_v4() primary key,
  week_start date not null unique,
  shopping_done boolean default false,
  shopping_done_by uuid references profiles(id) on delete set null,
  shopping_done_at timestamptz,
  created_at timestamptz default now()
);

alter table grocery_lists enable row level security;
create policy "Anyone can view grocery lists" on grocery_lists for select using (true);
create policy "Authenticated users create lists" on grocery_lists for insert with check (auth.uid() is not null);
create policy "Admin/parents mark shopping done" on grocery_lists for update using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'parent'))
);

-- ============================================================
-- GROCERY ITEMS
-- ============================================================
create table grocery_items (
  id uuid default uuid_generate_v4() primary key,
  list_id uuid references grocery_lists(id) on delete cascade not null,
  name text not null,
  quantity text,
  category text,
  added_by uuid references profiles(id) on delete set null,
  from_recipe_id uuid,
  checked boolean default false,
  created_at timestamptz default now()
);

alter table grocery_items enable row level security;
create policy "Anyone can view grocery items" on grocery_items for select using (true);
create policy "Authenticated users add items" on grocery_items for insert with check (auth.uid() is not null);
create policy "Authenticated users check items" on grocery_items for update using (auth.uid() is not null);
create policy "Users delete own items" on grocery_items for delete using (auth.uid() = added_by);
create policy "Admin deletes any item" on grocery_items for delete using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ============================================================
-- RECIPES
-- ============================================================
create table recipes (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  photo_url text,
  instructions text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table recipes enable row level security;
create policy "Anyone can view recipes" on recipes for select using (true);
create policy "Authenticated users create recipes" on recipes for insert with check (auth.uid() is not null);
create policy "Owners update own recipes" on recipes for update using (auth.uid() = created_by);
create policy "Admin manages all recipes" on recipes for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ============================================================
-- RECIPE INGREDIENTS
-- ============================================================
create table recipe_ingredients (
  id uuid default uuid_generate_v4() primary key,
  recipe_id uuid references recipes(id) on delete cascade not null,
  name text not null,
  quantity text,
  sort_order integer default 0
);

alter table recipe_ingredients enable row level security;
create policy "Anyone can view ingredients" on recipe_ingredients for select using (true);
create policy "Recipe owners manage ingredients" on recipe_ingredients for all using (
  exists (select 1 from recipes where id = recipe_id and created_by = auth.uid())
  or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ============================================================
-- MEAL PLAN
-- ============================================================
create table meal_plan (
  id uuid default uuid_generate_v4() primary key,
  week_start date not null,
  cook_user_id uuid references profiles(id) on delete set null,
  meal_date date not null,
  recipe_id uuid references recipes(id) on delete set null,
  custom_meal_name text,
  created_at timestamptz default now(),
  unique(week_start, meal_date)
);

alter table meal_plan enable row level security;
create policy "Anyone can view meal plan" on meal_plan for select using (true);
create policy "Authenticated users manage meal plan" on meal_plan for all using (auth.uid() is not null);

-- ============================================================
-- SUPABASE STORAGE BUCKET for recipe photos
-- ============================================================
-- Run this in the Supabase dashboard → Storage or via the CLI:
-- insert into storage.buckets (id, name, public) values ('recipe-photos', 'recipe-photos', true);

-- ============================================================
-- AUTO-CREATE PROFILE ON USER SIGNUP
-- ============================================================
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, name, role, colour, avatar_initials)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'adult_child'),
    coalesce(new.raw_user_meta_data->>'colour', '#2E86AB'),
    upper(left(coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), 2))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
