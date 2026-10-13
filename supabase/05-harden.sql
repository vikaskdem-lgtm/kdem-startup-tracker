-- ============================================================================
-- KDEM Startup Tracker — HARDENING PASS
--
-- Run ONCE: Supabase -> SQL Editor -> New query -> paste -> Run.
-- No VACUUM in here, so the whole file runs as one transaction safely.
--
-- Everything else from the hardening pass is already applied live:
--   - handle_new_user() EXECUTE revoked from anon + authenticated
--   - email_queue given an admin-read policy (it had RLS on and no policy)
--   - admin policies rewritten to evaluate auth.uid() once, not per row
--   - the four new admin accounts created
--   - private.is_editor() created
--
-- What is left is the part that needs DROP, which the connector will not run
-- without your approval: repointing the policies at private.is_editor() and
-- removing the public copy.
-- ============================================================================


-- -------------------------------- TAKE is_editor() OFF THE PUBLIC API
-- public.is_editor() sits in the `public` schema, and PostgREST publishes
-- every function in `public` as a callable endpoint at /rest/v1/rpc/is_editor.
-- It is harmless to call (it only reports whether YOU are an editor), but it
-- does not belong on the public API surface. `private` is not an exposed
-- schema, so moving it there removes the endpoint while RLS keeps working.
--
-- private.is_editor() already exists. This repoints the policies at it, then
-- drops the public copy. Order matters: the policies must stop referencing
-- the old function before it can be dropped.

drop policy if exists startups_insert on public.startups;
drop policy if exists startups_update on public.startups;
drop policy if exists startups_delete on public.startups;
create policy startups_insert on public.startups
  for insert to authenticated with check (private.is_editor());
create policy startups_update on public.startups
  for update to authenticated using (private.is_editor()) with check (private.is_editor());
create policy startups_delete on public.startups
  for delete to authenticated using (private.is_editor());

drop policy if exists config_insert on public.config;
drop policy if exists config_update on public.config;
drop policy if exists config_delete on public.config;
create policy config_insert on public.config
  for insert to authenticated with check (private.is_editor());
create policy config_update on public.config
  for update to authenticated using (private.is_editor()) with check (private.is_editor());
create policy config_delete on public.config
  for delete to authenticated using (private.is_editor());

drop function if exists public.is_editor();


-- ------------------------------------------------------------ VERIFICATION
-- policies: 4 rows for startups (SELECT/INSERT/UPDATE/DELETE), 4 for config
select tablename, policyname, cmd from pg_policies
where schemaname='public' and tablename in ('startups','config')
order by tablename, cmd;

-- should return no rows: the public copy is gone
select n.nspname, p.proname from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where p.proname = 'is_editor';

-- who can sign in, and at what level
select u.email, p.role, u.last_sign_in_at
from auth.users u join public.profiles p on p.id = u.id
order by p.role, u.email;

-- prove writes still work for an editor (should not error)
-- select private.is_editor();


-- ============================================================================
-- OPTIONAL — DEMOTE THE INTERN
-- intern.si@karnatakadigital.in currently has the admin role, which means it
-- can delete every startup and change other people's roles. If that account
-- only needs to record calls and edit records, 'editor' gives it exactly that
-- and nothing more:
--
--   update public.profiles set role = 'editor'
--   where email = 'intern.si@karnatakadigital.in';
--
-- Roles in this app:
--   admin   full access, can delete everything and change roles
--   editor  can add and edit startups, cannot change roles
--   viewer  read only
-- ============================================================================


-- ============================================================================
-- CHANGING A PASSWORD LATER
-- Replace both values. The password is hashed, never stored as text:
--
--   update auth.users
--      set encrypted_password = extensions.crypt('NewPassword', extensions.gen_salt('bf')),
--          updated_at = now()
--    where lower(email) = 'someone@karnatakadigital.in';
--
-- Or do it from the dashboard: Authentication -> Users -> the user -> Reset password.
-- ============================================================================
