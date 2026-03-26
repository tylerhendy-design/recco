-- ============================================================
-- RECO — Initial Schema Migration
-- Paste this into the Supabase SQL editor and run it.
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Profiles ─────────────────────────────────────────────────
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text unique not null,
  display_name  text not null,
  phone         text unique,
  avatar_url    text,
  joined_at     timestamptz not null default now()
);

-- Auto-create a minimal profile row when a user signs up via OAuth.
-- They'll fill in username/display_name on the setup-profile screen.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    -- Temporary username from email prefix; user replaces it on setup screen
    coalesce(split_part(new.email, '@', 1), new.id::text),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1), 'New user'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Friend connections ────────────────────────────────────────
-- One row per friendship. requester sends the invite, addressee accepts.
create table public.friend_connections (
  id            uuid primary key default uuid_generate_v4(),
  requester_id  uuid not null references public.profiles(id) on delete cascade,
  addressee_id  uuid not null references public.profiles(id) on delete cascade,
  status        text not null default 'pending' check (status in ('pending', 'accepted', 'blocked')),
  tier          text not null default 'tribe' check (tier in ('close', 'clan', 'tribe')),
  created_at    timestamptz not null default now(),
  unique (requester_id, addressee_id)
);

create index on public.friend_connections (requester_id);
create index on public.friend_connections (addressee_id);

-- ── Recommendations ───────────────────────────────────────────
create table public.recommendations (
  id             uuid primary key default uuid_generate_v4(),
  sender_id      uuid not null references public.profiles(id) on delete cascade,
  category       text not null,
  custom_cat     text,
  title          text not null,
  why_text       text,
  why_audio_url  text,
  photo_urls     text[] not null default '{}',
  meta           jsonb not null default '{}',
  created_at     timestamptz not null default now()
);

create index on public.recommendations (sender_id);

-- ── Reco recipients ───────────────────────────────────────────
create table public.reco_recipients (
  id                 uuid primary key default uuid_generate_v4(),
  reco_id            uuid not null references public.recommendations(id) on delete cascade,
  recipient_id       uuid not null references public.profiles(id) on delete cascade,
  status             text not null default 'unseen' check (status in ('unseen', 'seen', 'done', 'nogo')),
  score              integer check (score >= 0 and score <= 100),
  feedback_text      text,
  feedback_audio_url text,
  rated_at           timestamptz,
  created_at         timestamptz not null default now(),
  unique (reco_id, recipient_id)
);

create index on public.reco_recipients (recipient_id);
create index on public.reco_recipients (reco_id);

-- ── Sin bin ───────────────────────────────────────────────────
create table public.sin_bin (
  id            uuid primary key default uuid_generate_v4(),
  sender_id     uuid not null references public.profiles(id) on delete cascade,
  recipient_id  uuid not null references public.profiles(id) on delete cascade,
  category      text not null,
  bad_count     integer not null default 0,
  is_active     boolean not null default true,
  triggered_at  timestamptz,
  released_at   timestamptz,
  unique (sender_id, recipient_id, category)
);

-- ── Notifications ─────────────────────────────────────────────
create table public.notifications (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       text not null check (type in ('feedback_received', 'reco_received', 'request_received', 'friend_request', 'friend_accepted', 'sin_bin')),
  actor_id   uuid references public.profiles(id) on delete set null,
  reco_id    uuid references public.recommendations(id) on delete set null,
  payload    jsonb not null default '{}',
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

create index on public.notifications (user_id, read, created_at desc);

-- ── Messages (feedback threads) ───────────────────────────────
create table public.messages (
  id           uuid primary key default uuid_generate_v4(),
  reco_id      uuid not null references public.recommendations(id) on delete cascade,
  sender_id    uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body         text,
  audio_url    text,
  created_at   timestamptz not null default now()
);

create index on public.messages (reco_id);

-- ── Reco requests ─────────────────────────────────────────────
create table public.reco_requests (
  id           uuid primary key default uuid_generate_v4(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  target_id    uuid not null references public.profiles(id) on delete cascade,
  category     text,
  context      text,
  fulfilled    boolean not null default false,
  declined     boolean not null default false,
  created_at   timestamptz not null default now()
);

-- ── Lists ─────────────────────────────────────────────────────
create table public.lists (
  id          uuid primary key default uuid_generate_v4(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  description text,
  status      text not null default 'draft' check (status in ('draft', 'published')),
  created_at  timestamptz not null default now()
);

create table public.list_items (
  id         uuid primary key default uuid_generate_v4(),
  list_id    uuid not null references public.lists(id) on delete cascade,
  category   text not null,
  title      text not null,
  note       text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.list_shares (
  id           uuid primary key default uuid_generate_v4(),
  list_id      uuid not null references public.lists(id) on delete cascade,
  shared_with  uuid not null references public.profiles(id) on delete cascade,
  shared_at    timestamptz not null default now(),
  viewed       boolean not null default false,
  unique (list_id, shared_with)
);

-- ── Device tokens (push notifications) ───────────────────────
create table public.devices (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  push_token  text not null,
  platform    text not null check (platform in ('ios', 'android', 'web')),
  created_at  timestamptz not null default now(),
  unique (user_id, push_token)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles          enable row level security;
alter table public.friend_connections enable row level security;
alter table public.recommendations    enable row level security;
alter table public.reco_recipients    enable row level security;
alter table public.sin_bin            enable row level security;
alter table public.notifications      enable row level security;
alter table public.messages           enable row level security;
alter table public.reco_requests      enable row level security;
alter table public.lists              enable row level security;
alter table public.list_items         enable row level security;
alter table public.list_shares        enable row level security;
alter table public.devices            enable row level security;

-- ── profiles ─────────────────────────────────────────────────
create policy "Profiles are publicly readable"
  on public.profiles for select using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- ── friend_connections ────────────────────────────────────────
create policy "Users can see their own connections"
  on public.friend_connections for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "Users can send friend requests"
  on public.friend_connections for insert
  with check (auth.uid() = requester_id);

create policy "Addressee can accept/block; requester can delete"
  on public.friend_connections for update
  using (auth.uid() = addressee_id or auth.uid() = requester_id);

create policy "Either party can remove connection"
  on public.friend_connections for delete
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- ── recommendations ───────────────────────────────────────────
create policy "Sender can see their own recos"
  on public.recommendations for select
  using (auth.uid() = sender_id);

create policy "Recipients can see recos sent to them"
  on public.recommendations for select
  using (
    exists (
      select 1 from public.reco_recipients
      where reco_id = recommendations.id
      and recipient_id = auth.uid()
    )
  );

create policy "Authenticated users can send recos"
  on public.recommendations for insert
  with check (auth.uid() = sender_id);

create policy "Sender can update their own recos"
  on public.recommendations for update
  using (auth.uid() = sender_id);

-- ── reco_recipients ───────────────────────────────────────────
create policy "Sender can see all recipients of their recos"
  on public.reco_recipients for select
  using (
    exists (
      select 1 from public.recommendations
      where id = reco_recipients.reco_id
      and sender_id = auth.uid()
    )
  );

create policy "Recipient can see their own rows"
  on public.reco_recipients for select
  using (auth.uid() = recipient_id);

create policy "Sender can insert recipients"
  on public.reco_recipients for insert
  with check (
    exists (
      select 1 from public.recommendations
      where id = reco_recipients.reco_id
      and sender_id = auth.uid()
    )
  );

create policy "Recipient can update status/feedback"
  on public.reco_recipients for update
  using (auth.uid() = recipient_id);

-- ── sin_bin ───────────────────────────────────────────────────
create policy "Users can see sin bin rows involving them"
  on public.sin_bin for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

create policy "System can manage sin bin (via service role)"
  on public.sin_bin for all
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

-- ── notifications ─────────────────────────────────────────────
create policy "Users can see their own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users can mark their notifications as read"
  on public.notifications for update
  using (auth.uid() = user_id);

-- ── messages ─────────────────────────────────────────────────
create policy "Participants can see messages on their recos"
  on public.messages for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

create policy "Authenticated users can send messages"
  on public.messages for insert
  with check (auth.uid() = sender_id);

-- ── reco_requests ─────────────────────────────────────────────
create policy "Parties can see their requests"
  on public.reco_requests for select
  using (auth.uid() = requester_id or auth.uid() = target_id);

create policy "Authenticated users can make requests"
  on public.reco_requests for insert
  with check (auth.uid() = requester_id);

create policy "Target can update (fulfill/decline)"
  on public.reco_requests for update
  using (auth.uid() = target_id);

-- ── lists ─────────────────────────────────────────────────────
create policy "Owners can manage their lists"
  on public.lists for all
  using (auth.uid() = owner_id);

create policy "Shared users can view lists"
  on public.lists for select
  using (
    exists (
      select 1 from public.list_shares
      where list_id = lists.id and shared_with = auth.uid()
    )
  );

-- ── list_items ────────────────────────────────────────────────
create policy "Owner can manage list items"
  on public.list_items for all
  using (
    exists (
      select 1 from public.lists
      where id = list_items.list_id and owner_id = auth.uid()
    )
  );

create policy "Shared users can view list items"
  on public.list_items for select
  using (
    exists (
      select 1 from public.lists l
      join public.list_shares ls on ls.list_id = l.id
      where l.id = list_items.list_id and ls.shared_with = auth.uid()
    )
  );

-- ── list_shares ───────────────────────────────────────────────
create policy "Owner can share their lists"
  on public.list_shares for insert
  using (
    exists (
      select 1 from public.lists
      where id = list_shares.list_id and owner_id = auth.uid()
    )
  );

create policy "Parties can see shares involving them"
  on public.list_shares for select
  using (
    auth.uid() = shared_with
    or exists (
      select 1 from public.lists
      where id = list_shares.list_id and owner_id = auth.uid()
    )
  );

create policy "Recipient can mark as viewed"
  on public.list_shares for update
  using (auth.uid() = shared_with);

-- ── devices ───────────────────────────────────────────────────
create policy "Users manage their own devices"
  on public.devices for all
  using (auth.uid() = user_id);
