-- ====================================================================
-- E-RISE Meeting Platform - Database Schema & Security Policies (RLS)
-- Target: Supabase PostgreSQL
-- ====================================================================

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";

-- 2. ENUMS
create type user_status_type as enum ('online', 'asleep', 'dnd', 'offline');
create type participant_role_type as enum ('host', 'co-host', 'participant');

-- 3. PROFILES TABLE (Linked with auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text not null,
  avatar_url text,
  status user_status_type default 'online',
  status_message text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. MEETINGS TABLE (Enforces max_participants cap)
create table if not exists public.meetings (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  room_code text unique not null,
  host_id uuid references public.profiles(id) on delete cascade not null,
  max_participants int default 10 check (max_participants >= 2 and max_participants <= 50),
  is_locked boolean default false,
  is_ended boolean default false,
  created_at timestamptz default now(),
  ended_at timestamptz
);

-- 5. MEETING PARTICIPANTS TABLE
create table if not exists public.meeting_participants (
  id uuid default uuid_generate_v4() primary key,
  meeting_id uuid references public.meetings(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role participant_role_type default 'participant',
  is_muted boolean default false,
  is_camera_off boolean default false,
  is_screen_sharing boolean default false,
  raised_hand boolean default false,
  hand_raised_at timestamptz,
  joined_at timestamptz default now(),
  left_at timestamptz,
  unique (meeting_id, user_id)
);

-- 6. CHAT MESSAGES (Room & Channel Messages)
create table if not exists public.chat_messages (
  id uuid default uuid_generate_v4() primary key,
  meeting_id uuid references public.meetings(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now()
);

-- 7. FUNCTION: Automatic Profile Creation on Supabase Auth Sign-Up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, status, status_message)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', ''),
    'online',
    'Available'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to hook auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 8. FUNCTION: Enforce Room Max Participant Limit Atomically
create or replace function public.join_meeting_with_quota_check(
  p_room_code text,
  p_user_id uuid
)
returns json as $$
declare
  v_meeting record;
  v_count int;
  v_role participant_role_type;
begin
  select * into v_meeting from public.meetings 
  where room_code = p_room_code and is_ended = false;

  if not found then
    return json_build_object('success', false, 'error', 'Meeting not found or already ended');
  end if;

  if v_meeting.is_locked and v_meeting.host_id <> p_user_id then
    return json_build_object('success', false, 'error', 'This meeting is locked by the host');
  end if;

  -- Count currently active participants (left_at is null)
  select count(*) into v_count from public.meeting_participants 
  where meeting_id = v_meeting.id and left_at is null and user_id <> p_user_id;

  if v_count >= v_meeting.max_participants then
    return json_build_object(
      'success', false, 
      'error', format('Meeting is full (Capacity: %s participants)', v_meeting.max_participants)
    );
  end if;

  if v_meeting.host_id = p_user_id then
    v_role := 'host';
  else
    v_role := 'participant';
  end if;

  insert into public.meeting_participants (meeting_id, user_id, role, left_at)
  values (v_meeting.id, p_user_id, v_role, null)
  on conflict (meeting_id, user_id) 
  do update set left_at = null, role = v_role, joined_at = now();

  return json_build_object(
    'success', true, 
    'meeting_id', v_meeting.id,
    'title', v_meeting.title,
    'max_participants', v_meeting.max_participants,
    'role', v_role
  );
end;
$$ language plpgsql security definer;

-- 9. ROW LEVEL SECURITY (RLS) POLICIES
alter table public.profiles enable row level security;
alter table public.meetings enable row level security;
alter table public.meeting_participants enable row level security;
alter table public.chat_messages enable row level security;

-- Profiles: Anyone authenticated can read profiles, users can update only their own
create policy "Allow read access to all profiles" on public.profiles
  for select using (auth.role() = 'authenticated');

create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = id);

-- Meetings: Anyone authenticated can see active meetings, host can create/update
create policy "Allow read access to meetings" on public.meetings
  for select using (auth.role() = 'authenticated');

create policy "Host can create meeting" on public.meetings
  for insert with check (auth.uid() = host_id);

create policy "Host can update meeting" on public.meetings
  for update using (auth.uid() = host_id);

-- Meeting participants: Read active participants, users can update their state
create policy "Allow read participants" on public.meeting_participants
  for select using (auth.role() = 'authenticated');

create policy "Users and hosts can update participant state" on public.meeting_participants
  for all using (auth.role() = 'authenticated');

-- Chat messages: Authenticated users can read and write to room chat
create policy "Allow chat in room" on public.chat_messages
  for all using (auth.role() = 'authenticated');

-- 10. STORAGE BUCKET FOR AVATARS
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Avatar Public Access"
on storage.objects for select
using (bucket_id = 'avatars');

create policy "Avatar Upload Access"
on storage.objects for insert
with check (bucket_id = 'avatars' and auth.role() = 'authenticated');
