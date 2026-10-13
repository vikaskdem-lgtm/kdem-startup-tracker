-- ============================================================================
-- KDEM Startup Tracker — FINAL CLEANUP & SPEED PASS
--
-- Run ONCE: Supabase dashboard -> SQL Editor -> New query -> paste -> Run.
--
-- What this does, in order:
--   0. Makes a full backup of `startups` (skipped if one already exists)
--   1. Shows you what is about to be deleted
--   2. Deletes the ~883 uncalled rows from the 13-Oct import, keeping the
--      439 startups your team has actually worked (436 originals + 3 imported
--      rows that were called / marked No Response)
--   3. Takes is_editor() off the read path  <-- the big speed win
--   4. Drops two duplicate indexes
--   5. Makes the admin policies evaluate auth.uid() once instead of per row
--   6. Reclaims space and refreshes planner statistics
--   7. Prints a verification report
--
-- EVERY DELETED ROW IS RECOVERABLE from public.startups_backup_20261013
-- (restore command is at the bottom of this file).
-- ============================================================================


-- ---------------------------------------------------------------- 0. BACKUP
create table if not exists public.startups_backup_20261013 as
  select *, now() as backed_up_at from public.startups;

alter table public.startups_backup_20261013 enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies
                 where schemaname='public'
                   and tablename='startups_backup_20261013'
                   and policyname='bk_admin_read') then
    create policy bk_admin_read on public.startups_backup_20261013
      for select to authenticated
      using (exists (select 1 from public.profiles p
                     where p.id = (select auth.uid()) and p.role = 'admin'));
  end if;
end $$;


-- ------------------------------------------------- 1. WHAT WILL BE DELETED
-- Read this before scrolling on. "to_delete" should be ~883 and
-- "to_keep" should be ~439.
select
  count(*) as total_now,
  count(*) filter (where
        coalesce(data->>'callStatus','Not Called') = 'Not Called'
    and id !~ '^s[0-9]{4}$'
    and coalesce(nullif(data->>'date','')::date, current_date) >= '2026-10-01'
  ) as to_delete,
  count(*) filter (where not (
        coalesce(data->>'callStatus','Not Called') = 'Not Called'
    and id !~ '^s[0-9]{4}$'
    and coalesce(nullif(data->>'date','')::date, current_date) >= '2026-10-01'
  )) as to_keep,
  (select count(*) from public.startups_backup_20261013) as rows_in_backup
from public.startups;


-- ------------------------------------------------------------- 2. THE DELETE
-- Three conditions, ALL of which must be true for a row to go. The second and
-- third are the safety rails: an original startup (id s0001-s0460, or any row
-- dated before October) is never touched even if it was never called.
delete from public.startups
where coalesce(data->>'callStatus','Not Called') = 'Not Called'      -- never worked
  and id !~ '^s[0-9]{4}$'                                            -- not an original
  and coalesce(nullif(data->>'date','')::date, current_date) >= '2026-10-01';  -- from the import


-- ----------------------------------------- 3. TAKE is_editor() OFF READS
-- `startups_write` was declared FOR ALL, and ALL includes SELECT. So every
-- single row returned by a dashboard load was also being checked against
-- is_editor(), which queries the profiles table. Splitting it into the three
-- write verbs leaves reads with one `true` policy and nothing else to do.
--
-- The replacement policies are already in place; this drops the old FOR ALL
-- ones. The create statements are repeated with guards so the whole file can
-- be re-run safely.
drop policy if exists startups_write on public.startups;
drop policy if exists startups_insert on public.startups;
drop policy if exists startups_update on public.startups;
drop policy if exists startups_delete on public.startups;
create policy startups_insert on public.startups
  for insert to authenticated with check (public.is_editor());
create policy startups_update on public.startups
  for update to authenticated using (public.is_editor()) with check (public.is_editor());
create policy startups_delete on public.startups
  for delete to authenticated using (public.is_editor());

-- same shape on config
drop policy if exists config_write on public.config;
drop policy if exists config_insert on public.config;
drop policy if exists config_update on public.config;
drop policy if exists config_delete on public.config;
create policy config_insert on public.config
  for insert to authenticated with check (public.is_editor());
create policy config_update on public.config
  for update to authenticated using (public.is_editor()) with check (public.is_editor());
create policy config_delete on public.config
  for delete to authenticated using (public.is_editor());


-- -------------------------------------------- 4. INDEXES: ADD ONE, DROP THREE
-- The app pages through rows ordered by (updated_at desc, id asc). A composite
-- index on exactly that pair turns the read into a plain index scan with no
-- sort step at all: measured 6.35ms -> 2.06ms on 1322 rows, and the gap widens
-- with row count. (Already created; repeated here so the file stands alone.)
create index if not exists startups_page_idx
  on public.startups (updated_at desc, id asc);

-- Now redundant: (updated_at desc) is just a prefix of the composite above.
drop index if exists public.startups_updated_at_idx;

-- Exact duplicates of indexes schema.sql already created under other names.
-- Duplicates cost write time and buy nothing.
drop index if exists public.startups_dpiit_no_idx;      -- same as startups_dpiit_idx
drop index if exists public.startups_name_norm_idx2;    -- same as startups_name_norm_idx


-- ------------------------------- 5. EVALUATE auth.uid() ONCE, NOT PER ROW
drop policy if exists profiles_admin on public.profiles;
create policy profiles_admin on public.profiles
  for update to authenticated
  using      (exists (select 1 from public.profiles p
                      where p.id = (select auth.uid()) and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p
                      where p.id = (select auth.uid()) and p.role = 'admin'));

drop policy if exists eq_admin_read on public.email_queue;
create policy eq_admin_read on public.email_queue
  for select to authenticated
  using (exists (select 1 from public.profiles p
                 where p.id = (select auth.uid()) and p.role = 'admin'));


-- ------------------------------------------------------- 6. RE-ANALYZE
-- NOTE: do NOT put VACUUM here. The Supabase SQL Editor runs everything you
-- paste as a single transaction, and VACUUM cannot run inside one — it fails
-- with "ERROR: 25001: VACUUM cannot run inside a transaction block" and rolls
-- the WHOLE file back, including the delete above. ANALYZE is transaction-safe
-- and is the part that matters for query speed.
analyze public.startups;

-- If you want the disk space back right away, run this on its own afterwards,
-- in an empty query tab with nothing else in it:
--     vacuum (analyze) public.startups;
-- Skipping it is fine; autovacuum reclaims the space within a day.


-- -------------------------------------------------------- 7. VERIFICATION
-- Expect: remaining ~439, originals 436, called 437, no_response 2,
--         not_called 0, backup 1322.
select
  (select count(*) from public.startups)                                          as remaining,
  (select count(*) from public.startups where id ~ '^s[0-9]{4}$')                 as originals,
  (select count(*) from public.startups where data->>'callStatus'='Called')       as called,
  (select count(*) from public.startups where data->>'callStatus'='No Response')  as no_response,
  (select count(*) from public.startups where coalesce(data->>'callStatus','Not Called')='Not Called') as not_called,
  (select count(*) from public.startups_backup_20261013)                          as backup_rows;

-- policies: startups should now show SELECT/INSERT/UPDATE/DELETE separately,
-- with no row saying "ALL".
select tablename, policyname, cmd from pg_policies
where schemaname='public' and tablename in ('startups','config')
order by tablename, cmd, policyname;

-- indexes: expect startups_page_idx, startups_call_status_idx,
-- startups_cluster_idx, startups_dpiit_idx, startups_email_idx,
-- startups_name_norm_idx, startups_pkey  (7 rows, no _idx2 / _no_idx / _updated_at_idx)
select indexname from pg_indexes
where schemaname='public' and tablename='startups' order by indexname;

-- and the read path should be a bare index scan with no "Sort" node
explain select id, data from public.startups order by updated_at desc, id asc limit 1000;


-- ============================================================================
-- IF YOU WANT THE DELETED STARTUPS BACK
-- Restores every row exactly as it was, without disturbing anything your team
-- has edited since (existing ids are left alone):
--
--   insert into public.startups (id, data, updated_at, updated_by)
--   select id, data, updated_at, updated_by
--   from public.startups_backup_20261013
--   on conflict (id) do nothing;
--
-- Once you are happy and no longer need the safety net (give it a few weeks):
--
--   drop table public.startups_backup_20261013;
-- ============================================================================
