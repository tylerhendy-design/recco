-- ============================================================
-- RECO — Supabase Schema
-- Run this in the Supabase SQL editor after creating your project.
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── Profiles ────────────────────────────────────────────────────────────────

create table public.profiles (
  id            uuid primary key references auth.users on delete cascade,
  username      text unique not null,
  display_name  text not null,
  avatar_url    text,
  joined_at     timestamptz default now() not null,
  recos_sent    int default 0 not null
);

-- Create profile automatically on sign up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── Friend connections ───────────────────────────────────────────────────────

create type public.friend_tier as enum ('band', 'close', 'clan', 'tribe');

create table public.friend_connections (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles on delete cascade,
  friend_id   uuid not null references public.profiles on delete cascade,
  tier        public.friend_tier not null default 'tribe',
  created_at  timestamptz default now() not null,
  unique (user_id, friend_id)
);

-- ─── Recommendations ──────────────────────────────────────────────────────────

create table public.recommendations (
  id              uuid primary key default uuid_generate_v4(),
  sender_id       uuid not null references public.profiles on delete cascade,
  category        text not null,
  custom_cat      text,
  title           text not null,
  why_text        text,
  why_audio_url   text,
  meta            jsonb default '{}'::jsonb not null,
  created_at      timestamptz default now() not null
);

create table public.reco_recipients (
  id              uuid primary key default uuid_generate_v4(),
  reco_id         uuid not null references public.recommendations on delete cascade,
  recipient_id    uuid not null references public.profiles on delete cascade,
  status          text not null default 'unseen' check (status in ('unseen', 'seen', 'been_there', 'done', 'no_go')),
  score           int check (score >= 1 and score <= 10),
  feedback_text   text,
  feedback_audio  text,
  rated_at        timestamptz,
  created_at      timestamptz default now() not null,
  unique (reco_id, recipient_id)
);

-- Increment recos_sent counter on new recipient rows
create or replace function public.increment_recos_sent()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  -- Count distinct recos sent by looking at recommendations table, not here,
  -- to avoid double-counting multi-recipient sends.
  -- Simpler: just increment once per reco_recipients insert
  update public.profiles set recos_sent = recos_sent + 1 where id = (
    select sender_id from public.recommendations where id = new.reco_id
  );
  return new;
end;
$$;

create trigger on_reco_recipient_created
  after insert on public.reco_recipients
  for each row execute procedure public.increment_recos_sent();

-- ─── Sin bin ─────────────────────────────────────────────────────────────────

create table public.sin_bin (
  id              uuid primary key default uuid_generate_v4(),
  -- recipient_id is the person whose recos are being tracked (the sender of the reco)
  sender_id       uuid not null references public.profiles on delete cascade,
  -- The person who is receiving the recos and tracking bad ones
  recipient_id    uuid not null references public.profiles on delete cascade,
  category        text not null,
  bad_count       int default 0 not null,
  is_active       bool default false not null,
  triggered_at    timestamptz,
  released_at     timestamptz,
  unique (sender_id, recipient_id, category)
);

-- Auto-update sin bin on score update
create or replace function public.update_sin_bin()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_sender_id   uuid;
  v_category    text;
  v_bad_count   int;
begin
  -- Only process when status changes to 'done' with a bad score
  if new.status = 'done' and new.score is not null and new.score <= 3 then
    -- Get reco sender and category
    select sender_id, category into v_sender_id, v_category
    from public.recommendations where id = new.reco_id;

    -- Upsert sin_bin record
    insert into public.sin_bin (sender_id, recipient_id, category, bad_count)
    values (v_sender_id, new.recipient_id, v_category, 1)
    on conflict (sender_id, recipient_id, category) do update
      set bad_count = sin_bin.bad_count + 1;

    -- Check if threshold reached
    select bad_count into v_bad_count
    from public.sin_bin
    where sender_id = v_sender_id
      and recipient_id = new.recipient_id
      and category = v_category;

    if v_bad_count >= 3 then
      update public.sin_bin
      set is_active = true, triggered_at = now()
      where sender_id = v_sender_id
        and recipient_id = new.recipient_id
        and category = v_category
        and is_active = false;

      -- Create sin_bin notification
      insert into public.notifications (user_id, type, actor_id, reco_id)
      values (new.recipient_id, 'sin_bin', v_sender_id, new.reco_id);
    end if;
  end if;
  return new;
end;
$$;

create trigger on_reco_rated
  after update on public.reco_recipients
  for each row execute procedure public.update_sin_bin();

-- ─── Notifications ────────────────────────────────────────────────────────────

create type public.notif_type as enum (
  'feedback_received', 'reco_received', 'request_received',
  'friend_added', 'friend_request', 'friend_accepted', 'sin_bin'
);

create table public.notifications (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles on delete cascade,
  type        public.notif_type not null,
  actor_id    uuid not null references public.profiles on delete cascade,
  reco_id     uuid references public.recommendations on delete set null,
  payload     jsonb default '{}'::jsonb,
  read        bool default false not null,
  created_at  timestamptz default now() not null
);

create index notifications_user_id_idx on public.notifications (user_id, created_at desc);

-- ─── Messages ────────────────────────────────────────────────────────────────

create table public.messages (
  id            uuid primary key default uuid_generate_v4(),
  reco_id       uuid not null references public.recommendations on delete cascade,
  sender_id     uuid not null references public.profiles on delete cascade,
  recipient_id  uuid not null references public.profiles on delete cascade,
  body          text,
  audio_url     text,
  created_at    timestamptz default now() not null
);

create index messages_thread_idx on public.messages (reco_id, sender_id, recipient_id, created_at);

-- ─── Reco requests ───────────────────────────────────────────────────────────

create table public.reco_requests (
  id            uuid primary key default uuid_generate_v4(),
  requester_id  uuid not null references public.profiles on delete cascade,
  target_id     uuid not null references public.profiles on delete cascade,
  category      text,
  context       text,
  fulfilled     bool default false not null,
  created_at    timestamptz default now() not null
);

-- ─── Lists ───────────────────────────────────────────────────────────────────

create table public.lists (
  id          uuid primary key default uuid_generate_v4(),
  owner_id    uuid not null references public.profiles on delete cascade,
  title       text not null,
  description text,
  status      text not null default 'draft' check (status in ('draft', 'published')),
  created_at  timestamptz default now() not null
);

create table public.list_items (
  id          uuid primary key default uuid_generate_v4(),
  list_id     uuid not null references public.lists on delete cascade,
  category    text not null,
  title       text not null,
  note        text,
  sort_order  int not null default 0,
  created_at  timestamptz default now() not null
);

create table public.list_shares (
  id          uuid primary key default uuid_generate_v4(),
  list_id     uuid not null references public.lists on delete cascade,
  shared_with uuid not null references public.profiles on delete cascade,
  shared_at   timestamptz default now() not null,
  viewed      bool default false not null,
  unique (list_id, shared_with)
);

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.friend_connections enable row level security;
alter table public.recommendations enable row level security;
alter table public.reco_recipients enable row level security;
alter table public.sin_bin enable row level security;
alter table public.notifications enable row level security;
alter table public.messages enable row level security;
alter table public.reco_requests enable row level security;
alter table public.lists enable row level security;
alter table public.list_items enable row level security;
alter table public.list_shares enable row level security;

-- Profiles: readable by all authenticated, editable by owner
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select to authenticated using (true);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Friend connections: users see their own
create policy "Users see their own connections"
  on public.friend_connections for select using (auth.uid() = user_id or auth.uid() = friend_id);
create policy "Users manage their own connections"
  on public.friend_connections for all using (auth.uid() = user_id);

-- Recommendations: see ones you sent or received
create policy "See recos you sent"
  on public.recommendations for select using (auth.uid() = sender_id);
create policy "See recos sent to you"
  on public.recommendations for select using (
    exists (select 1 from public.reco_recipients where reco_id = recommendations.id and recipient_id = auth.uid())
  );
create policy "Send recos"
  on public.recommendations for insert with check (auth.uid() = sender_id);

-- Reco recipients
create policy "See your own recipient rows"
  on public.reco_recipients for select using (auth.uid() = recipient_id);
create policy "Sender sees recipient rows for their recos"
  on public.reco_recipients for select using (
    exists (select 1 from public.recommendations where id = reco_recipients.reco_id and sender_id = auth.uid())
  );
create policy "Update own recipient row (rating)"
  on public.reco_recipients for update using (auth.uid() = recipient_id);
create policy "Insert recipient rows (by sender)"
  on public.reco_recipients for insert with check (
    exists (select 1 from public.recommendations where id = reco_recipients.reco_id and sender_id = auth.uid())
  );

-- Notifications
create policy "See own notifications"
  on public.notifications for select using (auth.uid() = user_id);
create policy "Mark own notifications read"
  on public.notifications for update using (auth.uid() = user_id);

-- Messages
create policy "See messages you sent or received"
  on public.messages for select using (auth.uid() = sender_id or auth.uid() = recipient_id);
create policy "Send messages"
  on public.messages for insert with check (auth.uid() = sender_id);

-- Lists
create policy "See own lists"
  on public.lists for select using (auth.uid() = owner_id);
create policy "See shared lists"
  on public.lists for select using (
    exists (select 1 from public.list_shares where list_id = lists.id and shared_with = auth.uid())
  );
create policy "Manage own lists"
  on public.lists for all using (auth.uid() = owner_id);

-- List items (accessible when list is accessible)
create policy "See list items for accessible lists"
  on public.list_items for select using (
    exists (
      select 1 from public.lists
      where id = list_items.list_id
        and (owner_id = auth.uid() or exists (
          select 1 from public.list_shares where list_id = lists.id and shared_with = auth.uid()
        ))
    )
  );
create policy "Manage list items for own lists"
  on public.list_items for all using (
    exists (select 1 from public.lists where id = list_items.list_id and owner_id = auth.uid())
  );

-- Sin bin: you see sin bins where you are the recipient (tracking others)
create policy "See sin bins you track"
  on public.sin_bin for select using (auth.uid() = recipient_id);
create policy "Release from sin bin"
  on public.sin_bin for update using (auth.uid() = recipient_id);
