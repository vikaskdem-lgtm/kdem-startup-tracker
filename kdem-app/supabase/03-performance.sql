-- ============================================================
-- KDEM Startup Tracker — performance indexes
-- Run ONCE in Supabase → SQL Editor → New query → Run.
-- Safe to re-run; no data is changed.
--
-- NOTE: if you are setting up fresh, run this and then
-- 04-final-cleanup.sql, which supersedes parts of this file.
-- ============================================================

-- The app pages through rows ordered by (updated_at desc, id asc). A composite
-- index on exactly that pair makes the read a plain index scan with no sort
-- step: measured 6.35ms → 2.06ms on 1322 rows, and the gap grows with volume.
create index if not exists startups_page_idx
  on public.startups (updated_at desc, id asc);

-- Fast filtering by call status straight from the database.
create index if not exists startups_call_status_idx
  on public.startups ((data->>'callStatus'));

-- Cluster is the most-used dashboard filter.
create index if not exists startups_cluster_idx
  on public.startups (cluster);

-- schema.sql already indexes name_norm, email and dpiit_no. Do NOT add
-- second copies under different names — duplicate indexes slow writes down
-- and buy nothing. (Earlier versions of this file created
-- startups_name_norm_idx2 and startups_dpiit_no_idx; 04-final-cleanup.sql
-- drops them.)

analyze public.startups;

-- Check it worked: should list the indexes above with no duplicates.
select indexname from pg_indexes
where schemaname = 'public' and tablename = 'startups'
order by indexname;
