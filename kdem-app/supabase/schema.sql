-- ============================================================
-- KDEM Startup Tracker — Supabase schema
-- Run this once in Supabase → SQL Editor → New query → Run.
-- ============================================================

-- ---------- STARTUPS (document store) ----------
create table if not exists public.startups (
  id          text primary key,
  data        jsonb not null default '{}'::jsonb,
  -- generated, indexed columns for fast dedup & search (scales to 25k+)
  name_norm   text generated always as (lower(regexp_replace(coalesce(data->>'name',''),'[^a-zA-Z0-9]','','g'))) stored,
  email       text generated always as (lower(coalesce(data->>'email',''))) stored,
  dpiit_no    text generated always as (lower(regexp_replace(coalesce(data->>'dpiitNo',''),'\s','','g'))) stored,
  cluster     text generated always as (data->>'cluster') stored,
  updated_at  timestamptz not null default now(),
  updated_by  text
);
create index if not exists startups_name_norm_idx on public.startups(name_norm);
create index if not exists startups_email_idx     on public.startups(email);
create index if not exists startups_dpiit_idx      on public.startups(dpiit_no);
create index if not exists startups_cluster_idx    on public.startups(cluster);

-- ---------- CONFIG (user-managed dropdowns, settings) ----------
create table if not exists public.config (
  key   text primary key,
  data  jsonb not null default '{}'::jsonb
);

-- ---------- PROFILES (roles: admin | editor | viewer) ----------
create table if not exists public.profiles (
  id    uuid primary key references auth.users(id) on delete cascade,
  email text,
  role  text not null default 'viewer',
  created_at timestamptz default now()
);

-- Auto-create a profile when a user signs up.
-- The admin email is granted 'admin' automatically; everyone else starts as 'viewer'.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role)
  values (
    new.id,
    new.email,
    case when lower(new.email) = lower('vikaskdem@gmail.com') then 'admin' else 'viewer' end
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper: is the current user an editor or admin?
create or replace function public.is_editor()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin','editor')
  );
$$;

-- ---------- EMAIL QUEUE (admin-approved sending) ----------
create table if not exists public.email_queue (
  id         uuid primary key default gen_random_uuid(),
  to_email   text not null,
  subject    text not null,
  body_html  text not null,
  status     text not null default 'pending',   -- pending | sent | rejected
  token      text not null,
  requested_by text,
  created_at timestamptz default now(),
  sent_at    timestamptz
);
-- RLS on: only the service role (used by API routes) touches this table.
alter table public.email_queue enable row level security;

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.startups enable row level security;
alter table public.config   enable row level security;
alter table public.profiles enable row level security;

-- Startups: any signed-in user can read; editors/admins can write.
drop policy if exists startups_read  on public.startups;
drop policy if exists startups_write on public.startups;
create policy startups_read  on public.startups for select to authenticated using (true);
create policy startups_write on public.startups for all    to authenticated using (public.is_editor()) with check (public.is_editor());

-- Config: all signed-in read; editors write.
drop policy if exists config_read  on public.config;
drop policy if exists config_write on public.config;
create policy config_read  on public.config for select to authenticated using (true);
create policy config_write on public.config for all    to authenticated using (public.is_editor()) with check (public.is_editor());

-- Profiles: a user can read all profiles (to show names); only admins change roles.
drop policy if exists profiles_read  on public.profiles;
drop policy if exists profiles_admin on public.profiles;
create policy profiles_read  on public.profiles for select to authenticated using (true);
create policy profiles_admin on public.profiles for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role='admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role='admin'));

-- ============================================================
-- Realtime: push live changes to connected browsers
-- ============================================================
alter publication supabase_realtime add table public.startups;

-- ============================================================
-- Done. Next: load seed data (supabase/seed.sql), then create
-- your login user in Authentication → Users.
-- ============================================================
