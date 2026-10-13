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
