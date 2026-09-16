-- =================================================================
-- Koki Cloud Sync: Streak Days Table & RLS
-- Migration: 20260916000100_streak_days_and_sync_helpers.sql
-- =================================================================

-- 1. Streak Days Table (Durable calendar-day qualification records)
create table if not exists public.streak_days (
  child_id text not null references public.children(id) on delete cascade,
  day_date text not null,
  created_at timestamptz not null default now(),
  primary key (child_id, day_date)
);

create index if not exists idx_streak_days_child on public.streak_days(child_id);

-- Enable RLS
alter table public.streak_days enable row level security;

-- Policy: Parents can manage streak days for their children
create policy "Parents can view streak days of their children" on public.streak_days
  for select using (child_id in (select id from public.children where parent_id = auth.uid()));

create policy "Parents can insert streak days for their children" on public.streak_days
  for insert with check (child_id in (select id from public.children where parent_id = auth.uid()));

create policy "Parents can delete streak days of their children" on public.streak_days
  for delete using (child_id in (select id from public.children where parent_id = auth.uid()));
