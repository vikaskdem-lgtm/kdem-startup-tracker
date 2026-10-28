-- ============================================================================
-- KDEM Startup Tracker — DELETE IS ADMIN-ONLY
-- Run ONCE: Supabase -> SQL Editor -> New query -> paste -> Run.
-- No VACUUM, so the whole file runs safely as one transaction.
--
-- Roles after this:
--   admin   add, edit, AND delete (startups, uploaded Excel batches)
--   editor  add and edit only — cannot delete anything
--   viewer  read only
--
-- private.is_admin() already exists; this repoints the delete policies at it.
-- ============================================================================

drop policy if exists startups_delete on public.startups;
create policy startups_delete on public.startups
  for delete to authenticated using (private.is_admin());

drop policy if exists config_delete on public.config;
create policy config_delete on public.config
  for delete to authenticated using (private.is_admin());

-- verify: startups_delete and config_delete should now use is_admin
select tablename, policyname, cmd, qual
from pg_policies
where schemaname='public' and tablename in ('startups','config')
order by tablename, cmd;

-- who is what right now
select email, role from public.profiles order by role, email;

-- ============================================================================
-- SETTING PEOPLE TO EDITOR
-- All six accounts are currently admin, so everyone can still delete. The
-- split only takes effect once you demote the ones who should not.
-- Change the emails to suit, then run:
--
--   update public.profiles set role = 'editor'
--   where email in ('intern.si@karnatakadigital.in',
--                   'associate.kan@karnatakadigital.in');
--
-- Read-only access for someone:
--   update public.profiles set role = 'viewer' where email = 'someone@...';
-- ============================================================================
