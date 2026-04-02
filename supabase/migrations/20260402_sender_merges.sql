-- Track all merge operations for undo and audit
create table if not exists public.sender_merges (
  id              uuid primary key default uuid_generate_v4(),
  performed_by    uuid not null references public.profiles(id) on delete cascade,
  merge_type      text not null check (merge_type in ('quick_add_to_user', 'quick_add_to_quick_add', 'user_to_user')),
  canonical_name  text,
  canonical_id    uuid references public.profiles(id),
  absorbed_name   text,
  absorbed_id     uuid references public.profiles(id),
  reco_ids_updated uuid[] not null default '{}',
  created_at      timestamptz not null default now(),
  undone_at       timestamptz
);

-- RLS
alter table public.sender_merges enable row level security;
create policy sender_merges_own on public.sender_merges for all using (auth.uid() = performed_by);
