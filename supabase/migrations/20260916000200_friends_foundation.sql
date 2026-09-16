-- =================================================================
-- Koki Friends Foundation: Friend Codes, Requests & Canonical Friendships
-- Migration: 20260916000200_friends_foundation.sql
-- =================================================================

-- 1. Child Friend Codes Table
-- Exactly one active friend code per child profile
create table if not exists public.child_friend_codes (
  child_id text primary key references public.children(id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_child_friend_codes_code on public.child_friend_codes(code);

-- Enable RLS
alter table public.child_friend_codes enable row level security;

-- Policies: Parents can only select, insert, or update friend codes of their own children
create policy "Parents can view friend codes of their children" on public.child_friend_codes
  for select using (child_id in (select id from public.children where parent_id = auth.uid()));

create policy "Parents can insert friend codes for their children" on public.child_friend_codes
  for insert with check (child_id in (select id from public.children where parent_id = auth.uid()));

create policy "Parents can update friend codes for their children" on public.child_friend_codes
  for update using (child_id in (select id from public.children where parent_id = auth.uid()))
  with check (child_id in (select id from public.children where parent_id = auth.uid()));


-- 2. Friend Requests Table
-- Tracks directed invitations between two children
create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_child_id text not null references public.children(id) on delete cascade,
  receiver_child_id text not null references public.children(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (sender_child_id <> receiver_child_id)
);

create index if not exists idx_friend_requests_sender on public.friend_requests(sender_child_id, status);
create index if not exists idx_friend_requests_receiver on public.friend_requests(receiver_child_id, status);

-- Prevent duplicate active pending requests in the same direction
create unique index if not exists idx_unique_pending_request
  on public.friend_requests(sender_child_id, receiver_child_id)
  where status = 'pending';

-- Enable RLS
alter table public.friend_requests enable row level security;

-- Policies: Parents can only access requests involving their children
create policy "Parents can view friend requests involving their children" on public.friend_requests
  for select using (
    sender_child_id in (select id from public.children where parent_id = auth.uid())
    or receiver_child_id in (select id from public.children where parent_id = auth.uid())
  );

create policy "Parents can insert friend requests from their children" on public.friend_requests
  for insert with check (
    sender_child_id in (select id from public.children where parent_id = auth.uid())
    and sender_child_id <> receiver_child_id
  );

create policy "Parents can update friend requests involving their children" on public.friend_requests
  for update using (
    sender_child_id in (select id from public.children where parent_id = auth.uid())
    or receiver_child_id in (select id from public.children where parent_id = auth.uid())
  )
  with check (
    sender_child_id in (select id from public.children where parent_id = auth.uid())
    or receiver_child_id in (select id from public.children where parent_id = auth.uid())
  );

create policy "Parents can delete friend requests involving their children" on public.friend_requests
  for delete using (
    sender_child_id in (select id from public.children where parent_id = auth.uid())
    or receiver_child_id in (select id from public.children where parent_id = auth.uid())
  );


-- 3. Child Friendships Table
-- Canonical mutual friendship relationship.
-- Strictly ordered child_a_id < child_b_id to enforce single canonical pair.
create table if not exists public.child_friendships (
  id uuid primary key default gen_random_uuid(),
  child_a_id text not null references public.children(id) on delete cascade,
  child_b_id text not null references public.children(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (child_a_id < child_b_id),
  unique (child_a_id, child_b_id)
);

create index if not exists idx_child_friendships_a on public.child_friendships(child_a_id);
create index if not exists idx_child_friendships_b on public.child_friendships(child_b_id);

-- Enable RLS
alter table public.child_friendships enable row level security;

-- Policies: Parents can view and remove friendships involving their children
create policy "Parents can view friendships of their children" on public.child_friendships
  for select using (
    child_a_id in (select id from public.children where parent_id = auth.uid())
    or child_b_id in (select id from public.children where parent_id = auth.uid())
  );

create policy "Parents can delete friendships of their children" on public.child_friendships
  for delete using (
    child_a_id in (select id from public.children where parent_id = auth.uid())
    or child_b_id in (select id from public.children where parent_id = auth.uid())
  );


-- =================================================================
-- Security Definer RPC Functions
-- =================================================================

-- 4. Lookup Friend Code
-- Exposes ONLY minimal non-sensitive data required for parent confirmation.
-- Zero exposure of parent email, real names, exact age, stars, coins, or progress.
create or replace function public.lookup_friend_code(p_code text)
returns table (
  child_id text,
  nickname text,
  avatar_id text,
  is_own_child boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_normalized text;
  v_matched_child_id text;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED';
  end if;

  v_normalized := upper(trim(p_code));
  if not v_normalized like 'KOKI-%' then
    v_normalized := 'KOKI-' || regexp_replace(v_normalized, '^KOKI-?', '');
  end if;

  select fc.child_id into v_matched_child_id
  from public.child_friend_codes fc
  where upper(fc.code) = v_normalized
  limit 1;

  if v_matched_child_id is null then
    return;
  end if;

  return query
  select 
    c.id as child_id,
    c.nickname,
    c.avatar_id,
    (c.parent_id = auth.uid()) as is_own_child
  from public.children c
  where c.id = v_matched_child_id;
end;
$$;


-- 5. Send Friend Request
-- Validates caller ownership, handles reciprocal pending requests cleanly,
-- and prevents self-friending or duplicate friendships.
create or replace function public.send_friend_request(
  p_sender_child_id text,
  p_friend_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_receiver_child_id text;
  v_child_a text;
  v_child_b text;
  v_existing_friendship boolean;
  v_reciprocal_req_id uuid;
  v_new_req_id uuid;
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  end if;

  -- 1. Validate sender child belongs to caller
  if not exists (select 1 from public.children where id = p_sender_child_id and parent_id = auth.uid()) then
    return jsonb_build_object('success', false, 'error', 'SENDER_NOT_OWNED');
  end if;

  -- 2. Lookup receiver by code
  select child_id into v_receiver_child_id
  from public.lookup_friend_code(p_friend_code)
  limit 1;

  if v_receiver_child_id is null then
    return jsonb_build_object('success', false, 'error', 'INVALID_CODE');
  end if;

  -- 3. Cannot friend own child / self
  if p_sender_child_id = v_receiver_child_id then
    return jsonb_build_object('success', false, 'error', 'CANNOT_FRIEND_SELF');
  end if;

  -- 4. Check if already friends
  v_child_a := least(p_sender_child_id, v_receiver_child_id);
  v_child_b := greatest(p_sender_child_id, v_receiver_child_id);
  select exists (
    select 1 from public.child_friendships where child_a_id = v_child_a and child_b_id = v_child_b
  ) into v_existing_friendship;

  if v_existing_friendship then
    return jsonb_build_object('success', false, 'error', 'ALREADY_FRIENDS');
  end if;

  -- 5. Check if sender already has a pending request
  if exists (
    select 1 from public.friend_requests
    where sender_child_id = p_sender_child_id and receiver_child_id = v_receiver_child_id and status = 'pending'
  ) then
    return jsonb_build_object('success', false, 'error', 'REQUEST_ALREADY_PENDING');
  end if;

  -- 6. Check reciprocal pending request (other parent already requested us)
  select id into v_reciprocal_req_id
  from public.friend_requests
  where sender_child_id = v_receiver_child_id and receiver_child_id = p_sender_child_id and status = 'pending'
  limit 1;

  if v_reciprocal_req_id is not null then
    -- Auto-accept reciprocal request
    insert into public.child_friendships (child_a_id, child_b_id)
    values (v_child_a, v_child_b)
    on conflict (child_a_id, child_b_id) do nothing;

    update public.friend_requests
    set status = 'accepted', updated_at = now()
    where id = v_reciprocal_req_id;

    return jsonb_build_object('success', true, 'auto_accepted', true);
  end if;

  -- 7. Insert new pending request
  insert into public.friend_requests (sender_child_id, receiver_child_id, status)
  values (p_sender_child_id, v_receiver_child_id, 'pending')
  returning id into v_new_req_id;

  return jsonb_build_object('success', true, 'request_id', v_new_req_id);
end;
$$;


-- 6. Accept Friend Request
-- Only the parent owning the receiving child can accept.
-- Creates single canonical friendship row and commits safely.
create or replace function public.accept_friend_request(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender_id text;
  v_receiver_id text;
  v_status text;
  v_child_a text;
  v_child_b text;
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  end if;

  select sender_child_id, receiver_child_id, status
  into v_sender_id, v_receiver_id, v_status
  from public.friend_requests
  where id = p_request_id;

  if v_status is null or v_status <> 'pending' then
    return jsonb_build_object('success', false, 'error', 'REQUEST_NOT_PENDING');
  end if;

  -- Only parent of receiver can accept
  if not exists (select 1 from public.children where id = v_receiver_id and parent_id = auth.uid()) then
    return jsonb_build_object('success', false, 'error', 'NOT_RECEIVER_OWNER');
  end if;

  v_child_a := least(v_sender_id, v_receiver_id);
  v_child_b := greatest(v_sender_id, v_receiver_id);

  -- Insert canonical friendship
  insert into public.child_friendships (child_a_id, child_b_id)
  values (v_child_a, v_child_b)
  on conflict (child_a_id, child_b_id) do nothing;

  -- Mark accepted
  update public.friend_requests
  set status = 'accepted', updated_at = now()
  where id = p_request_id;

  -- Close any reciprocal requests
  update public.friend_requests
  set status = 'accepted', updated_at = now()
  where sender_child_id = v_receiver_id and receiver_child_id = v_sender_id and status = 'pending';

  return jsonb_build_object('success', true);
end;
$$;


-- 7. Decline Friend Request
create or replace function public.decline_friend_request(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_receiver_id text;
  v_status text;
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  end if;

  select receiver_child_id, status into v_receiver_id, v_status
  from public.friend_requests
  where id = p_request_id;

  if v_status is null or v_status <> 'pending' then
    return jsonb_build_object('success', false, 'error', 'REQUEST_NOT_PENDING');
  end if;

  if not exists (select 1 from public.children where id = v_receiver_id and parent_id = auth.uid()) then
    return jsonb_build_object('success', false, 'error', 'NOT_RECEIVER_OWNER');
  end if;

  update public.friend_requests
  set status = 'declined', updated_at = now()
  where id = p_request_id;

  return jsonb_build_object('success', true);
end;
$$;


-- 8. Cancel Friend Request (Sender side)
create or replace function public.cancel_friend_request(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender_id text;
  v_status text;
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  end if;

  select sender_child_id, status into v_sender_id, v_status
  from public.friend_requests
  where id = p_request_id;

  if v_status is null or v_status <> 'pending' then
    return jsonb_build_object('success', false, 'error', 'REQUEST_NOT_PENDING');
  end if;

  if not exists (select 1 from public.children where id = v_sender_id and parent_id = auth.uid()) then
    return jsonb_build_object('success', false, 'error', 'NOT_SENDER_OWNER');
  end if;

  update public.friend_requests
  set status = 'cancelled', updated_at = now()
  where id = p_request_id;

  return jsonb_build_object('success', true);
end;
$$;


-- 9. Remove Friend (Unfriend)
create or replace function public.remove_friend(p_child_id text, p_friend_child_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_child_a text;
  v_child_b text;
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  end if;

  if not exists (select 1 from public.children where id = p_child_id and parent_id = auth.uid()) then
    return jsonb_build_object('success', false, 'error', 'CHILD_NOT_OWNED');
  end if;

  v_child_a := least(p_child_id, p_friend_child_id);
  v_child_b := greatest(p_child_id, p_friend_child_id);

  delete from public.child_friendships
  where child_a_id = v_child_a and child_b_id = v_child_b;

  return jsonb_build_object('success', true);
end;
$$;


-- 10. Rotate Friend Code
create or replace function public.rotate_friend_code(p_child_id text, p_new_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  end if;

  if not exists (select 1 from public.children where id = p_child_id and parent_id = auth.uid()) then
    return jsonb_build_object('success', false, 'error', 'CHILD_NOT_OWNED');
  end if;

  insert into public.child_friend_codes (child_id, code, updated_at)
  values (p_child_id, p_new_code, now())
  on conflict (child_id) do update set
    code = excluded.code,
    updated_at = now();

  return jsonb_build_object('success', true, 'code', p_new_code);
end;
$$;


-- 11. Get Confirmed Friends for a Child
create or replace function public.get_child_friends(p_child_id text)
returns table (
  friend_id text,
  nickname text,
  avatar_id text,
  friends_since timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED';
  end if;

  if not exists (select 1 from public.children where id = p_child_id and parent_id = auth.uid()) then
    raise exception 'CHILD_NOT_OWNED';
  end if;

  return query
  select 
    c.id as friend_id,
    c.nickname,
    c.avatar_id,
    f.created_at as friends_since
  from public.child_friendships f
  join public.children c on (
    (f.child_a_id = p_child_id and c.id = f.child_b_id) or
    (f.child_b_id = p_child_id and c.id = f.child_a_id)
  )
  order by f.created_at desc;
end;
$$;


-- 12. Get Incoming Pending Requests for a Child
create or replace function public.get_child_incoming_requests(p_child_id text)
returns table (
  request_id uuid,
  sender_child_id text,
  sender_nickname text,
  sender_avatar_id text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED';
  end if;

  if not exists (select 1 from public.children where id = p_child_id and parent_id = auth.uid()) then
    raise exception 'CHILD_NOT_OWNED';
  end if;

  return query
  select 
    r.id as request_id,
    r.sender_child_id,
    c.nickname as sender_nickname,
    c.avatar_id as sender_avatar_id,
    r.created_at
  from public.friend_requests r
  join public.children c on c.id = r.sender_child_id
  where r.receiver_child_id = p_child_id and r.status = 'pending'
  order by r.created_at desc;
end;
$$;


-- 13. Get Outgoing Pending Requests for a Child
create or replace function public.get_child_outgoing_requests(p_child_id text)
returns table (
  request_id uuid,
  receiver_child_id text,
  receiver_nickname text,
  receiver_avatar_id text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED';
  end if;

  if not exists (select 1 from public.children where id = p_child_id and parent_id = auth.uid()) then
    raise exception 'CHILD_NOT_OWNED';
  end if;

  return query
  select 
    r.id as request_id,
    r.receiver_child_id,
    c.nickname as receiver_nickname,
    c.avatar_id as receiver_avatar_id,
    r.created_at
  from public.friend_requests r
  join public.children c on c.id = r.receiver_child_id
  where r.sender_child_id = p_child_id and r.status = 'pending'
  order by r.created_at desc;
end;
$$;
