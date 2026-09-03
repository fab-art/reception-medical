# Deploying to Vercel + Supabase

## What changed in this pass

- `src/lib/db.js` now talks to Supabase directly (reads + writes), instead of
  being local-only. Writes fall back to a local queue when offline and flush
  automatically when the connection comes back (see `src/lib/local.js`,
  `src/lib/casing.js`).
- `supabase/schema.sql` replaces the old schema — it now matches exactly what
  the app reads and writes (facilities, officers, invoices, invoice_events,
  settings). The previous schema.sql modeled a different, unused table design.
- Fixed an IndexedDB key bug where facilities/invoices/events all wrote to the
  same storage key and clobbered each other.
- Wired the Officers and Pharmacies/Facilities admin pages into the nav (they
  existed but weren't reachable from anywhere in the app).
- Removed dead code: an orphaned `Login.jsx` that called a function that didn't
  exist anywhere, and the old `sync.js`/`mapping.js` pair superseded by the
  new `db.js`.
- Extracted your tracking workbook (`RSSB_Master.xlsm`) into ready-to-run SQL:
  823 facilities, 51 officers, 10,783 historical invoice records.

## 1. Set up Supabase

1. Create a project at supabase.com (or use the existing one referenced in
   `.env` — `ptedinbrdwbibweqpcsz.supabase.co` — if that's still yours).
2. Open **SQL Editor** and run these three files **in this order**:
   1. `supabase/schema.sql` — creates the tables
   2. `supabase/seed_facilities.sql` — 823 facilities from FacilityNames
   3. `supabase/seed_officers.sql` — 51 officers from the staff list
   4. `supabase/seed_invoices.sql` — 10,783 historical invoice records from
      Consolidated Data (this file is ~4MB; if the web SQL editor chokes on
      pasting it, run it via `psql` or the Supabase CLI instead — see below)
3. Officer PINs seeded here are placeholders (`1000`, `1001`, ...) — not
   secret, just sequential. Change them for real officers in
   **Admin → Officers** after go-live, and change the three shared passwords
   in **Admin/Super Admin → Settings** (`admin123` / `superadmin123` /
   `reception123` are the current defaults).

### Running the large seed file via CLI (recommended for seed_invoices.sql)

```bash
# from the project root, with the Supabase CLI installed and linked
supabase db execute -f supabase/seed_invoices.sql
# or with plain psql, using your project's connection string:
psql "$DATABASE_URL" -f supabase/seed_invoices.sql
```

## 2. Environment variables

The app reads two variables (already in `.env` for local dev — do **not**
commit real production values, this repo's `.env` is a working example):

```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Get both from Supabase → Project Settings → API. Use the **anon** key (not
the service role key) — this is a client-side app.

## 3. Deploy to Vercel

```bash
npm i -g vercel   # if you don't have it
vercel login
vercel            # first deploy, follow prompts (framework: Vite)
```

In the Vercel project dashboard → Settings → Environment Variables, add:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Then redeploy (`vercel --prod`) so the build picks them up — Vite inlines
`VITE_*` vars at build time, so they must be set *before* the build runs, not
just at runtime.

`vercel.json` already has the SPA rewrite rule needed for client-side routing.

## 4. Sanity check after deploy

- Log in with `admin123` → **Pharmacies/Facilities** should list 823 rows,
  **Officers** should list ~51.
- Log in with a seeded officer PIN → their assigned/verified counts should
  reflect the imported historical data once you assign some invoices to them
  (the historical import doesn't set `assigned_officer_id`, since the source
  workbook didn't consistently map "Staff in Charge" to a stable ID — this is
  intentional so nothing looks falsely "already assigned" on day one).
- Open the app on two devices/browsers and confirm a new reception entry
  created on one shows up on the other after a refresh — this is the real
  multi-device sync test.

## Notes / things worth deciding later

- RLS is currently **off** on every table (see the note at the bottom of
  `schema.sql`) because the app authenticates with shared passwords/PINs, not
  Supabase Auth — access control is "only this app has the anon key," which is
  fine for an internal tool but worth revisiting if this becomes public-facing.
- The bundled JS is ~1.6MB (one big chunk) — build works fine, but if load
  time on slow connections becomes a problem, the recharts-heavy dashboard
  pages are the best candidates for `React.lazy()` code-splitting later.
