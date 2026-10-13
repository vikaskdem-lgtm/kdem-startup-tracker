-- ============================================================
-- KDEM Startup Tracker — call-tracking migration
-- Run this ONCE in Supabase → SQL Editor → New query → Run.
-- No schema change: everything lives in the existing data JSONB.
-- ============================================================

-- STEP 1 — how many startups do you actually have?
-- (Run this first on its own if you just want to check the count.)
select count(*) as total_startups from public.startups;


-- STEP 2 — mark the original 460 startups as already called by the KDEM team.
-- Those rows have ids s0001 … s0460 (exactly four digits). Startups added by
-- import have long ids with letters, so they are untouched.
update public.startups
set data = data || jsonb_build_object(
      'callStatus', 'Called',
      'calledOn',   to_char(now(), 'YYYY-MM-DD'),
      'calledBy',   'KDEM Team'
    ),
    updated_at = now()
where id ~ '^s[0-9]{4}$';


-- STEP 3 — everything else (the imported startups) becomes "Not Called",
-- so the filters and the dashboard count them correctly.
update public.startups
set data = jsonb_set(data, '{callStatus}', '"Not Called"', true),
    updated_at = now()
where data->>'callStatus' is null
   or data->>'callStatus' = '';


-- STEP 4 — check the result. You should see "Called" ≈ 460 and the rest "Not Called".
select data->>'callStatus' as call_status, count(*)
from public.startups
group by 1
order by 2 desc;
