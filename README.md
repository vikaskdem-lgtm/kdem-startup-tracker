# KDEM Startup Ecosystem Tracker

Live, multi-user tracker for Startup Karnataka Policy 2025-30 — built for the
Karnataka Digital Economy Mission. Runs free on **Vercel + Supabase**.

**What it does**
- Dashboard: cluster-wise, district-wise and source-wise, with day-by-day growth.
- Every startup: all master-sheet fields, founders, remarks log, change history.
- **KITS Coordination** section per startup (action needed, status, response, action taken).
- Dropdowns you manage yourself; bulletproof duplicate detection + merge.
- Import / update from any Excel/CSV with automatic column matching.
- **Live Google-Form sync** — new responses appear instantly, de-duplicated.
- **Admin-approved email** — nothing sends until the admin approves from their inbox.
- Weekly summary + overdue-follow-up email (automatic).
- Excel export anytime. Realtime: everyone sees changes live.

Admin: **Vikas Vishwakarma** (`vikaskdem@gmail.com`).

---

## One-time setup (~30–40 min, no coding)

You'll use three free accounts: **Supabase** (database + logins), **Vercel**
(hosting), **Resend** (email). You already created the Supabase project.

### 1 · Supabase — database

1. Open your project → **SQL Editor** → **New query**.
2. Paste all of **`supabase/schema.sql`**, click **Run**.
3. New query again, paste **`supabase/seed.sql`** (your 460 startups), **Run**.
4. **Database → Replication** → make sure `startups` is in the `supabase_realtime`
   publication (the schema adds it; confirm it's on).
5. Get your keys: **Settings → API** — copy the **Project URL**, the **anon public**
   key, and the **service_role** key (keep this one secret).

### 2 · Create your login

**Authentication → Users → Add user → Create new user.**
Use `vikaskdem@gmail.com` and a password — this account becomes **admin**
automatically. (Add teammates the same way; see *Managing people* below.)
Under **Authentication → Providers → Email**, you may turn **Confirm email** off
for internal use so new users can sign in immediately.

### 3 · Vercel — deploy

1. Go to vercel.com → **Add New → Project** → **Import** this GitHub repo
   (`vikaskdem-lgtm/kdem-startup-tracker`).
2. Framework preset: **Other**. No build command needed.
3. **Environment Variables** — add these (from `.env.example`):

   | Name | Value |
   |---|---|
   | `SUPABASE_URL` | your Project URL |
   | `SUPABASE_ANON_KEY` | anon public key |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role key (secret) |
   | `ADMIN_EMAIL` | `vikaskdem@gmail.com` |
   | `APP_URL` | leave blank now, set after first deploy |
   | `FORM_WEBHOOK_SECRET` | any long random string |
   | `RESEND_API_KEY` | from step 4 |
   | `EMAIL_FROM` | `KDEM Tracker <onboarding@resend.dev>` |
   | `CRON_SECRET` | any long random string |

4. **Deploy.** When it's live, copy the URL (e.g.
   `https://kdem-startup-tracker.vercel.app`), set it as **`APP_URL`**, and redeploy.
5. Open the URL → sign in with your admin email. You should see all 460 startups.

### 4 · Resend — email

1. Sign up at resend.com (free). **API Keys → Create** → copy into `RESEND_API_KEY`.
2. For quick start, send from `onboarding@resend.dev` (works immediately to your
   own address). To email founders from your own domain later, verify a domain in
   Resend and change `EMAIL_FROM`.

### 5 · Live Google-Form sync

For **each** form (registration, surveys, event RSVPs, incentive trackers):

1. Open the form → ⋮ → **Script editor**.
2. Paste **`google-apps-script.gs`**, set `WEBHOOK_URL` to
   `https://YOUR-APP.vercel.app/api/form-webhook` and `WEBHOOK_SECRET` to the same
   `FORM_WEBHOOK_SECRET` you set in Vercel.
3. **Triggers → Add Trigger** → function `onFormSubmit`, event **On form submit** → save & authorize.

That's it — every new submission lands in the tracker within a second, matched to
an existing startup (by DPIIT no / email / name) or added as new, with possible
duplicates flagged.

---

## How the key features work

- **Roles.** `admin` (Vikas) = everything. `editor` = add/edit/import. `viewer` =
  read + export. Row-level security enforces this in the database.
- **Admin-approved email.** Anyone (editor+) clicks *Email status* on a startup →
  the message is queued and an approval email goes to the admin → admin clicks
  **Approve & send** (or **Reject**) → only then does it send. Weekly summaries go
  straight to the admin (no approval needed to email yourself).
- **Duplicates.** Server-side on every form submission and client-side on import,
  matched by DPIIT number, company email, any founder's email, phone, exact name,
  and name similarity. Review and merge on the Duplicates page.
- **Realtime.** Any change (form, import, edit) pushes to every open browser.

## Managing people

Add a user in **Supabase → Authentication → Users**. New users start as `viewer`.
To promote someone, run in SQL Editor:
```sql
update public.profiles set role = 'editor' where email = 'teammate@example.com';
```
(`admin` for a second administrator.) Share the Vercel URL with your team — they
sign in with the email/password you created.

## Scaling note

Supabase's free tier holds far more than your 22,000 DPIIT startups (500 MB; your
data is ~40 MB). Generated, indexed columns (`dpiit_no`, `email`, `name_norm`,
`cluster`) keep dedup and search fast at that size.

## Troubleshooting

- **Blank page / "Server not configured":** env vars missing — check
  `SUPABASE_URL` and `SUPABASE_ANON_KEY` in Vercel, redeploy.
- **Can sign in but can't edit:** your profile is `viewer` — promote it (above).
- **Form responses not appearing:** check the Apps Script trigger exists and the
  `WEBHOOK_SECRET` matches Vercel exactly; see the form's Apps Script → Executions.
- **Email not sending:** verify `RESEND_API_KEY`; free Resend sends to your own
  address until you verify a domain.

## Local files

```
index.html              the whole app (static) — talks to Supabase
api/                    serverless functions (form sync, email, cron)
lib/                    shared server code (column mapping, dedup, email)
supabase/schema.sql     database tables, roles, security, realtime
supabase/seed.sql       your 460 startups
google-apps-script.gs   paste into each Google Form
.env.example            the environment variables to set in Vercel
```

---

## Excel round-trip (download → edit → re-upload)

**Export Excel** produces the full KDEM master-tracker workbook:

| Sheet | What it is |
|---|---|
| Master Tracker | every startup, 63 columns, in the exact KDEM layout (title block, coloured section bands, headings on row 5, frozen panes, filters, dropdowns) |
| Lists | the allowed dropdown values — edit here to change them |
| Dashboard | KPI summary + cluster breakdown |
| READ ME | instructions for whoever you send the file to |

Columns 1–47 match the original KDEM master tracker exactly, except four headings
that the original repeated word-for-word (two "If applied, mention application date"
and two "KITS team to confirm (Yes/No)"). Those are now
**SK Application Date / Fiscal Incentive Application Date** and
**KITS to Confirm — Registration / KITS to Confirm — Incentive**, so each one can be
matched back unambiguously. Columns 48–63 add Company Details, the KITS
Coordination block, the Remarks Log and **Startup ID**.

**How the round-trip works**
1. Export Excel and send the file to KITS or your team.
2. They edit it in Excel — dropdowns are built in, grey columns are calculated.
3. Upload the file back under **Import / Update**.
4. Each row is matched by **Startup ID** (exact), then DPIIT number, email, name.
   Edits land on the right startup and are written into its change history.
   Rows typed at the bottom with no Startup ID are added as new startups, after a
   duplicate check.

Never delete, move or retype the **Startup ID** column — it is what makes the
matching exact.

**Importing other files.** Any Excel or CSV still works: every sheet is read, the
header row is found automatically even when it sits under a title block, and
columns are matched by name. Tick columns (✓) set the incentives.


---

## What's new in this build

- **Instant updates.** Every save is applied on screen immediately and pushed to
  everyone else through Supabase realtime. Changes arrive row-by-row rather than by
  refetching the whole table, so nothing needs a page refresh. A green **Live** dot
  in the header shows the connection is active.
- **Fast bulk import.** Large files are written in batches of 200 with a progress
  bar, instead of one row at a time. A 1,000-row import takes seconds.
- **Custom fields.** If an uploaded file has a column the tracker doesn't know,
  pick **"Create as a new field in the tracker"** on the matching screen. It becomes
  a real field — visible on every startup, editable in the form, included in the
  Excel export, and matched automatically the next time that column appears.
  Manage them later under **Dropdowns → Custom Fields**.
- **Unmatched-column warning.** The preview tells you exactly which columns are
  still unmatched before you apply anything, so no data is silently dropped.

## Pushing changes from VS Code

```bash
# one-time, if you don't have the repo locally yet
git clone https://github.com/vikaskdem-lgtm/kdem-startup-tracker.git
cd kdem-startup-tracker

# copy the new files in (replacing the old ones), then:
git add -A
git commit -m "Excel round-trip, instant updates, custom fields"
git push origin main
```

Vercel redeploys automatically within about a minute of the push. If git asks for a
password, use a GitHub **personal access token** (Settings → Developer settings →
Personal access tokens) as the password, not your account password.

**Keep the Vercel Root Directory setting as it is.** If the files live in a
`kdem-app/` folder in the repo, Root Directory must stay `kdem-app`. If you put them
at the repo root, clear that field.

## Database

No SQL changes are needed for this build. Every field — including custom fields —
is stored inside the existing `data` JSONB column, so your schema and your existing
startups are untouched.


---

## Build 3 — calling workflow, inline editing, and the row-count fix

### The 1,000-startup bug (fixed)
Supabase returns a maximum of **1,000 rows per request**, so the app was only ever
loading the first 1,000 startups no matter how many existed. Your import of 860 new
startups *did* save correctly — the screen just couldn't see past 1,000. The app now
pages through the table 1,000 rows at a time, so the real total always shows.

### KDEM Calling
- Every startup has a **Call Status**: Not Called · Called · No Response ·
  Call Back Later · Wrong Number · Not Reachable.
- It sits right next to the startup name in **All Startups**, with the date and the
  person who called shown underneath.
- Filter the list by call status to work through "Not Called" like a call sheet.
- The dashboard shows **Startups Called by KDEM** and **Still to Call**, plus a
  calling-progress breakdown.
- Changing the status stamps the date and caller automatically and writes a line into
  that startup's remarks log.

### Edit in the row, or in the panel
Call Status, SK Registration, Fiscal Incentive and Priority are now **dropdowns
inside the table** — change one and it saves instantly, no panel needed. Click
anywhere else on the row (or the **Open** button) for the full profile when you need
everything. Both work; use whichever is faster.

### All Startups table
Now shows **S.No · Startup · KDEM Call · Email · Mobile · Cluster · SK Reg · FI ·
Priority**, with a live "x called / y not called" count above it.

### Excel
Three new columns — **KDEM Call Status, Last Called On, Called By** — in their own
green "KDEM CALLING" band, with a dropdown on the status. They round-trip back on
re-upload like every other field.

### SQL to run (once)
Open **Supabase → SQL Editor → New query**, paste **`supabase/02-call-status.sql`**,
and press Run. It marks the original 460 startups as *Called* and everything else as
*Not Called*, then prints the totals so you can confirm. Nothing in the schema
changes.


---

## Build 4 — speed, undo, notes in the list, multi-select filters

### Why it was lagging, and what changed

| Cause | Fix | Effect |
|---|---|---|
| De-duplication scanned every startup for every imported row | Lookup maps + a token index built once per import | **58x faster** (5.9s → 0.1s on 1,065 rows vs 1,320 startups) |
| The list drew 800 rows at once, each with dropdowns | Draws 150 with a **Load more** / **Show all** button | Far lighter page, instant filtering |
| Nothing showed until every page of data had loaded | Each 1,000-row page paints as it arrives | Startups appear in about a second |
| Every realtime change redrew the whole screen | Redraws only the table, and pauses entirely during an import | No stutter while saving |
| No index on `updated_at`, so Postgres sorted the whole table each load | `supabase/03-performance.sql` | Quicker first connection |

### Undo an import
After any upload the Import page shows what the last import did and an **Undo this
import** button (click twice to confirm). It deletes the startups that import
created and restores the previous version of the ones it changed. The record
survives a page reload, so you can undo later as well.

### Action Notes / Remarks in the list
Now a column in **All Startups**, after Priority, and **editable right in the row** —
type a note, press Enter or click away, and it saves. The change is written into that
startup's history like any other edit.

### Multi-select filters
Every filter is now a checkbox dropdown: tick several clusters, several call
statuses, several stages at once. Within one filter the choices are OR'd; across
filters they are AND'd. Each dropdown has its own **Clear this filter**, and the
button shows how many you picked.

### SQL to run (once)
Supabase → SQL Editor → paste **`supabase/03-performance.sql`** → Run.
(If you have not run it yet, `supabase/02-call-status.sql` marks your original 460
startups as *Called*.) Neither changes the schema.


---

## Build 5 — merge fixed, uploaded-file registry

### Why Merge felt broken
The Duplicates page compared **every startup against every other one** — about
870,000 pairs at 1,300 startups — rebuilding word-sets and arrays for each pair.
Worse, every merge click re-ran that whole scan before redrawing. So the button
worked, but the page froze for a long time afterwards.

Now duplicates are found by bucketing records on the things that actually make
them duplicates (DPIIT number, email, phone, exact name) and running the fuzzy
name check only inside small buckets, joined with union-find.

**2,600 ms → 12 ms (217x faster)**, and it is *more* thorough: it found 12 duplicate
groups where the old scan found 6. Results are cached, so merging no longer
rescans — the button also shows "Merging…" while it works, and there is a
**Rescan** button when you want a fresh pass.

### Files you have uploaded
The Import page now lists **every Excel/CSV you have imported**: file name, date,
who uploaded it, how many startups it added and updated, and how many of those are
still live.

**Delete these** removes the startups a particular file created. Before anything
happens you get a warning that spells out the consequence — the startups disappear
from All Startups, the dashboard counts, the cluster report and every export, and it
cannot be undone — and you must type a **reason**. The entry stays in the list
afterwards, greyed out, showing who removed it, when, how many, and why.

Updates that an upload made to startups which already existed are not reversed by
this; only the records that upload created are removed. (For a complete rollback of
the most recent import, use **Undo this import** instead.)

### No SQL needed for this build.

---

## Build 6 — trimmed to the called list, and a much faster database

This build was done with the Supabase connector wired directly into Claude, so
the database was inspected and tuned live rather than through hand-run scripts.

### What the database actually contained

Before anything was changed, here is what was in `startups`:

| | rows |
|---|---|
| Original startups your team has called (ids `s0001`–`s0460`) | **436** |
| Imported rows from the 13-Oct upload, called / No Response | **3** |
| Imported rows never called | **883** |
| **Total** | **1322** |

Two things worth knowing:

**It is 436 originals, not 460.** The other 24 are not lost — they were
duplicates that got absorbed when you ran **Merge**. 76 records in the table
carry a merge entry in their history. So 436 is the correct de-duplicated count
of the original 460, and re-adding the missing 24 would just put the duplicates
back. Nothing was dropped.

**The 883 deleted rows were all from the 13-Oct import** and none of them had
ever been called. This was checked before deleting: the number of records with
a pre-October date that had never been called was **zero**, so no genuine
original record was inside the delete set.

### Everything is recoverable

A complete copy of all 1322 rows was taken first, into
`public.startups_backup_20261013` (admin-read only, RLS on). The restore
command is at the bottom of `supabase/04-final-cleanup.sql`. Drop the table
once you are confident, in a few weeks.

### Why loading was slow, and what changed

Four separate causes, all now fixed:

**1. Every read was also running a permission check, per row.** The
`startups_write` policy was declared `FOR ALL`, and in Postgres `ALL` includes
`SELECT`. So every row returned by a dashboard load was being checked against
`is_editor()`, which queries the `profiles` table. Loading 1000 rows meant 1000
permission lookups on top of the actual read. It is now split into separate
INSERT / UPDATE / DELETE policies, so reads evaluate one `true` and stop. This
was the largest single cause.

**2. The read was sorting the whole table.** Added a composite index on exactly
the order the app pages in, `(updated_at desc, id asc)`. The sort step
disappeared from the query plan:

```
before:  Incremental Sort -> Index Scan     Execution Time: 6.347 ms
after:   Index Scan using startups_page_idx Execution Time: 2.063 ms
```

**3. Pages were fetched one after another.** Supabase caps any single response
at 1000 rows, so the app has to page. It used to wait for each page before
asking for the next. It now asks for the row count first, then fetches the
remaining pages four at a time. At 22,000 startups that is ~6 waves instead of
22 sequential round-trips. Paging also got a stable tiebreak (`id asc`) and
de-duplication by id, so a row can never appear twice or be skipped if someone
edits during a load.

**4. The first paint waited for the network.** The rows you last saw are now
kept in your browser and painted immediately on open, then refreshed from the
server in the background. Opening the dashboard shows data straight away
instead of an empty table. The cache is per-browser, never shared, capped at
3 MB, and every read and write of it is guarded — in a private window, or with
storage blocked, the app simply loads from the network as before.

Also added: the table refreshes when you switch back to the tab, and two
duplicate indexes were dropped (duplicates cost write time and buy nothing).

### Security findings fixed

The Supabase linter flagged these; all are now closed:

- `handle_new_user()` is a trigger function but was callable by **anyone, signed
  in or not**, over the REST API as a `SECURITY DEFINER` function. `EXECUTE`
  revoked from `anon` and `authenticated`.
- `is_editor()` was callable by `anon`. Revoked; signed-in users only.
- `email_queue` had RLS on but no policy at all. Admins can now read it; writes
  stay service-role only.
- The admin policies re-evaluated `auth.uid()` once per row. Wrapped in
  `(select auth.uid())` so it runs once per query.

One finding is left for you, because it is a dashboard toggle and not SQL:
**leaked-password protection is off.** Turn it on at Authentication → Policies
in the Supabase dashboard; it checks new passwords against known-breached lists.

### SQL to run (once) — required

Open `supabase/04-final-cleanup.sql`, paste the whole thing into Supabase →
SQL Editor → New query → **Run**.

The indexes, the new policies, the permission revokes and the backup table are
**already applied** — they were done live over the connector. What that file
still has to do is the parts that need your approval: the **delete of the 883
uncalled rows**, dropping the two old `FOR ALL` policies, and dropping the
redundant indexes. It is safe to re-run end to end, and it prints a before
count, then a verification report at the end.

Expect the final report to read: `remaining 439, originals 436, called 437,
no_response 2, not_called 0, backup_rows 1322`.

### Tests

93 automated tests across five suites, all passing — the 64 from earlier builds
plus 29 new ones covering the loader: paging at 22,000 rows, parallelism capped
at 4, no duplicate or skipped rows across page boundaries, instant paint from
cache while the network is still pending, storage-blocked browsers, missing row
count falling back to sequential paging, a failed page not taking the rest down,
realtime insert/update/delete reconciliation, refresh on tab refocus, and clean
unsubscribe.

---

## Build 7 — four new admins, and a hardening pass

### New accounts

Four admin accounts were created. All four are email-confirmed and ready to
sign in immediately; each password was verified against the stored hash.

| Email | Role |
|---|---|
| suvin@karnatakadigital.in | admin |
| bharath.chandra@karnatakadigital.in | admin |
| omar.saud@karnatakadigital.in | admin |
| associate.kan@karnatakadigital.in | admin |

Passwords follow the pattern agreed: first name + `123@kdem`. **Please read the
password note at the end of this section.**

### A bug this surfaced

The app decided who counts as an admin by comparing against a single hardcoded
email (`ADMIN_EMAIL`). Anyone else made admin in the database would still have
been shown as "Editor" in the header. Worse, the app force-set the displayed
name to "Vikas Vishwakarma" for anyone it considered an owner — so once the
four new admins were recognised, all four would have appeared under Vikas's
name in the header and the activity log.

Both are fixed. `isOwner()` now reflects the actual role in the `profiles`
table, and display names are derived from the email when an account has no
full name set (`bharath.chandra@…` → "Bharath Chandra"). A real name in the
account metadata still wins.

### Security fixes

**The weekly-email endpoint was open to the public.** `api/cron-weekly.js`
guarded itself with `if (CRON_SECRET && supplied !== CRON_SECRET)`. The leading
`CRON_SECRET &&` meant that whenever the variable was not configured, the check
was skipped entirely and anyone who knew the URL could run the job, read the
whole startup table and trigger an email to the admin. It now refuses with 503
when the secret is missing, and compares in constant time.

> **Action needed:** make sure `CRON_SECRET` is set in Vercel → Settings →
> Environment Variables. The endpoint now fails closed, so if it is missing the
> weekly email stops rather than running unprotected. Vercel sends the value
> automatically as a Bearer token once it is defined.

**The form webhook could become an open endpoint.** `FORM_WEBHOOK_SECRET` being
blank would have let a blank incoming header match it. It now refuses unless
the secret is actually configured.

**The weekly summary only counted the first 1000 startups**, because it never
paged past Supabase's response cap. It pages now — harmless at 439, wrong at
22,000.

`api/email-request.js` was already correct: it rejects unauthenticated callers
and viewers, and validates the JWT server-side.

### Database hardening

Applied live:

- `handle_new_user()` was callable over the REST API by **anyone, signed in or
  not**, as a `SECURITY DEFINER` function. `EXECUTE` revoked.
- `is_editor()` was callable by `anon`. Revoked.
- `email_queue` had RLS enabled with no policy at all. Admins can read it now;
  writes stay service-role only.
- Admin policies re-evaluated `auth.uid()` once per row. Wrapped in
  `(select auth.uid())`.
- A `private` schema was added with `private.is_editor()` in it.

### SQL to run (once)

`supabase/05-harden.sql` — repoints the policies at `private.is_editor()` and
drops the public copy, so it is no longer published as an API endpoint at
`/rest/v1/rpc/is_editor`. It needs `DROP`, which is why it is a file rather
than already applied. No `VACUUM`, so it runs as one transaction safely.

That file also carries, commented out, the statement to demote the intern
account and the statement to change any password later.

### Still to do by hand

- **`CRON_SECRET` in Vercel** (above) — otherwise the weekly email stops.
- **Leaked-password protection** — Supabase → Authentication → Policies. It
  checks new passwords against known-breached lists. Dashboard toggle only.

### A note on the passwords

`firstname123@kdem` is predictable: the first name is already in the email
address, so anyone who learns the pattern from one account can derive the other
three. These are **admin** accounts — each can delete all 439 startups and
change everyone else's role. They were also typed into a chat.

Recommended, in order of value:

1. Have each person change their password on first sign-in.
2. Give `editor` rather than `admin` to anyone who only needs to record calls
   and edit records. Editors can do all the day-to-day work; they just cannot
   delete the dataset or change roles. `intern.si@karnatakadigital.in`
   currently has admin and is the clearest candidate — the SQL is in
   `05-harden.sql`.
3. Turn on leaked-password protection before the next account is made.

### Tests

132 automated tests, all passing: the 93 from earlier builds, 24 new ones for
role and display-name resolution (each new admin is a real admin, nobody is
mislabelled as Vikas, editors and viewers are correctly held back), and 15 for
the endpoint guards (unset secret refuses, wrong secret refuses, truncated
secret refuses, correct secret passes, unauthenticated email requests refused).
