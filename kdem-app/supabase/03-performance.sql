-- ============================================================
-- KDEM Startup Tracker — performance indexes
-- Run ONCE in Supabase → SQL Editor → New query → Run.
-- Safe to re-run; no data is changed.
-- ============================================================

-- The app loads startups newest-first. Without this index Postgres has to
-- sort the whole table on every load, which is the main "slow to connect".
create index if not exists startups_updated_at_idx
  on public.startups (updated_at desc);

-- Fast filtering by call status straight from the database.
create index if not exists startups_call_status_idx
  on public.startups ((data->>'callStatus'));

-- Helps the name/email duplicate checks the import runs.
create index if not exists startups_name_norm_idx2
  on public.startups (name_norm);

analyze public.startups;

-- Check it worked: should list the indexes above.
select indexname from pg_indexes
where schemaname = 'public' and tablename = 'startups'
order by indexname;
