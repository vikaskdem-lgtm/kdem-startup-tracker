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
