-- =================================================================
-- Koki Cloud Sync & Parent Account Schema (Supabase PostgreSQL)
-- Migration: 20260916000000_parent_account_and_child_sync.sql
-- =================================================================

-- 1. Parent Profiles (corresponds to authenticated auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger to automatically create profile row on auth.users signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, created_at, updated_at)
  values (new.id, now(), now())
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger execution
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. Children Table (Belongs to an authenticated parent)
-- Preserves the child's local UUID as id to keep identity stable
create table if not exists public.children (
  id text primary key,
  parent_id uuid not null references public.profiles(id) on delete cascade,
  local_origin_id text not null,
  nickname text not null,
  age integer not null check (age >= 3 and age <= 9),
  learning_band text not null check (learning_band in ('explorer', 'adventurer', 'champion')),
  avatar_id text not null,
  ui_language text not null default 'km' check (ui_language in ('km', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (parent_id, local_origin_id)
);

create index if not exists idx_children_parent_id on public.children(parent_id);

-- 3. Lesson Progress Table
create table if not exists public.lesson_progress (
  id text primary key,
  child_id text not null references public.children(id) on delete cascade,
  lesson_id text not null,
  world_id text not null default 'world-1',
  status text not null check (status in ('locked', 'unlocked', 'in_progress', 'completed')),
  best_stars integer not null default 0 check (best_stars between 0 and 3),
  completion_count integer not null default 0,
  total_attempts integer not null default 0,
  total_mistakes integer not null default 0,
  first_completed_at timestamptz,
  last_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (child_id, lesson_id)
);

create index if not exists idx_lesson_progress_child on public.lesson_progress(child_id);
create index if not exists idx_lesson_progress_child_world on public.lesson_progress(child_id, world_id);

-- 4. Wallets Table
create table if not exists public.wallets (
  child_id text primary key references public.children(id) on delete cascade,
  coin_balance integer not null default 0 check (coin_balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Coin Transactions Table
create table if not exists public.coin_transactions (
  id text primary key,
  child_id text not null references public.children(id) on delete cascade,
  amount integer not null,
  type text not null,
  source_type text not null,
  source_id text not null,
  description text,
  created_at timestamptz not null default now(),
  unique (child_id, source_type, source_id)
);

create index if not exists idx_coin_transactions_child on public.coin_transactions(child_id, created_at desc);

-- 6. Cosmetic Inventory Table
create table if not exists public.cosmetic_inventory (
  id text primary key,
  child_id text not null references public.children(id) on delete cascade,
  item_id text not null,
  acquired_at timestamptz not null default now(),
  source text not null default 'purchase',
  unique (child_id, item_id)
);

create index if not exists idx_cosmetic_inventory_child on public.cosmetic_inventory(child_id);

-- 7. Equipped Cosmetics Table
create table if not exists public.equipped_cosmetics (
  child_id text primary key references public.children(id) on delete cascade,
  head_item_id text,
  face_item_id text,
  neck_item_id text,
  body_item_id text,
  back_item_id text,
  special_item_id text,
  updated_at timestamptz not null default now()
);

-- 8. Learning Streaks Table
create table if not exists public.learning_streaks (
  child_id text primary key references public.children(id) on delete cascade,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_qualified_date text,
  total_qualified_days integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 9. Streak Pet Progress Table
create table if not exists public.streak_pet_progress (
  child_id text primary key references public.children(id) on delete cascade,
  highest_stage text not null default 'egg',
  current_companion_id text not null default 'starter_pet',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 10. Heart State Table
create table if not exists public.heart_state (
  child_id text primary key references public.children(id) on delete cascade,
  current_hearts integer not null default 5,
  max_hearts integer not null default 5,
  last_regeneration_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Strict Isolation: Authenticated parents can only access their own
-- records and records belonging to their own children.
-- =================================================================

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.children enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.wallets enable row level security;
alter table public.coin_transactions enable row level security;
alter table public.cosmetic_inventory enable row level security;
alter table public.equipped_cosmetics enable row level security;
alter table public.learning_streaks enable row level security;
alter table public.streak_pet_progress enable row level security;
alter table public.heart_state enable row level security;

-- 1. Profiles Policies
create policy "Parents can view their own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Parents can insert their own profile" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Parents can update their own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- 2. Children Policies
create policy "Parents can view their own children" on public.children
  for select using (auth.uid() = parent_id);

create policy "Parents can insert their own children" on public.children
  for insert with check (auth.uid() = parent_id);

create policy "Parents can update their own children" on public.children
  for update using (auth.uid() = parent_id) with check (auth.uid() = parent_id);

create policy "Parents can delete their own children" on public.children
  for delete using (auth.uid() = parent_id);

-- 3. Lesson Progress Policies
create policy "Parents can view lesson progress of their children" on public.lesson_progress
  for select using (child_id in (select id from public.children where parent_id = auth.uid()));

create policy "Parents can insert lesson progress for their children" on public.lesson_progress
  for insert with check (child_id in (select id from public.children where parent_id = auth.uid()));

create policy "Parents can update lesson progress of their children" on public.lesson_progress
  for update using (child_id in (select id from public.children where parent_id = auth.uid()))
  with check (child_id in (select id from public.children where parent_id = auth.uid()));

create policy "Parents can delete lesson progress of their children" on public.lesson_progress
  for delete using (child_id in (select id from public.children where parent_id = auth.uid()));

-- 4. Wallets Policies
create policy "Parents can view wallets of their children" on public.wallets
  for select using (child_id in (select id from public.children where parent_id = auth.uid()));

create policy "Parents can insert/update wallets of their children" on public.wallets
  for all using (child_id in (select id from public.children where parent_id = auth.uid()))
  with check (child_id in (select id from public.children where parent_id = auth.uid()));

-- 5. Coin Transactions Policies
create policy "Parents can view coin transactions of their children" on public.coin_transactions
  for select using (child_id in (select id from public.children where parent_id = auth.uid()));

create policy "Parents can insert coin transactions for their children" on public.coin_transactions
  for insert with check (child_id in (select id from public.children where parent_id = auth.uid()));

-- 6. Cosmetic Inventory Policies
create policy "Parents can view cosmetic inventory of their children" on public.cosmetic_inventory
  for select using (child_id in (select id from public.children where parent_id = auth.uid()));

create policy "Parents can insert cosmetic inventory for their children" on public.cosmetic_inventory
  for insert with check (child_id in (select id from public.children where parent_id = auth.uid()));

-- 7. Equipped Cosmetics Policies
create policy "Parents can view equipped cosmetics of their children" on public.equipped_cosmetics
  for select using (child_id in (select id from public.children where parent_id = auth.uid()));

create policy "Parents can insert/update equipped cosmetics of their children" on public.equipped_cosmetics
  for all using (child_id in (select id from public.children where parent_id = auth.uid()))
  with check (child_id in (select id from public.children where parent_id = auth.uid()));

-- 8. Learning Streaks Policies
create policy "Parents can view learning streaks of their children" on public.learning_streaks
  for select using (child_id in (select id from public.children where parent_id = auth.uid()));

create policy "Parents can insert/update learning streaks of their children" on public.learning_streaks
  for all using (child_id in (select id from public.children where parent_id = auth.uid()))
  with check (child_id in (select id from public.children where parent_id = auth.uid()));

-- 9. Streak Pet Progress Policies
create policy "Parents can view streak pet progress of their children" on public.streak_pet_progress
  for select using (child_id in (select id from public.children where parent_id = auth.uid()));

create policy "Parents can insert/update streak pet progress of their children" on public.streak_pet_progress
  for all using (child_id in (select id from public.children where parent_id = auth.uid()))
  with check (child_id in (select id from public.children where parent_id = auth.uid()));

-- 10. Heart State Policies
create policy "Parents can view heart state of their children" on public.heart_state
  for select using (child_id in (select id from public.children where parent_id = auth.uid()));

create policy "Parents can insert/update heart state of their children" on public.heart_state
  for all using (child_id in (select id from public.children where parent_id = auth.uid()))
  with check (child_id in (select id from public.children where parent_id = auth.uid()));
