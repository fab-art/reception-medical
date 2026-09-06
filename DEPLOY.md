# Deploying to Vercel + Supabase

## Fixing the blank-page-after-deploy issue

If the deployed app showed a blank white page, the near-certain cause was
this: **Vercel doesn't read your local `.env` file.** `.env` is gitignored
(correctly — it holds a real credential) and even if it weren't, Vercel only
uses environment variables you set in the project dashboard. Without
`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` at build time, the previous
version of `src/lib/supabase.js` called `createClient('', '')`, which throws
synchronously — that crashed the whole React tree before anything could
render, with zero visible error on screen (only in the browser console).

Two independent fixes are now in place:

1. **`src/lib/supabase.js` no longer throws.** If the env vars are missing or
   invalid, it falls back to a stub client, logs a clear console warning, and
   the app boots in local-only mode — you'll see an amber banner on the login
   screen ("Running in local-only mode: Supabase isn't connected") instead of
   a blank page.
2. **`src/main.jsx` now wraps `<App/>` in an `ErrorBoundary`.** Any other
   unexpected render error will show a recoverable "Something went wrong"
   screen with a Reload button and the actual error message, instead of a
   silent blank page. This is a general safety net, not specific to Supabase.

So: if you still get a blank page after this fix, it's a **different** error —
open the browser console (F12), it will now either show the ErrorBoundary
screen with the message, or a clear `[RSSB Reception]` console warning
telling you what's missing.

### The actual fix: set the env vars in Vercel, not just locally

1. Vercel dashboard → your project → **Settings → Environment Variables**
2. Add both, for the environments you deploy to (Production/Preview/Dev):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. **Redeploy** — these are inlined at build time (`VITE_*` prefix), so a
   deployment that ran before you added them won't pick them up. Trigger a
   new deployment (push a commit, or "Redeploy" in the dashboard) after
   adding them.
4. If you use `vercel` CLI locally instead of git-based deploys, you can also
   run `vercel env add VITE_SUPABASE_URL` / `vercel env add
   VITE_SUPABASE_ANON_KEY` to set them without the dashboard.

### One more thing that can look like a blank page: PWA caching

This app is a PWA with a service worker (`vite-plugin-pwa`, `registerType:
'autoUpdate'`). After a redeploy, some browsers keep serving the *previous*
cached version until the new service worker activates, which can look like a
stale or partially-blank page. If a hard refresh (Ctrl/Cmd+Shift+R) or
clearing site data fixes it, that's what happened — it's expected PWA
behavior, not a bug, but worth knowing so you don't chase it as one.

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
2. Open **SQL Editor → New query** and run these **in order**, one at a time,
   pasting each file's contents and clicking Run before moving to the next:
   1. `supabase/schema.sql` — creates the tables
   2. `supabase/seed_facilities.sql` — 823 facilities from FacilityNames
   3. `supabase/seed_officers.sql` — 51 officers from the staff list
   4. `supabase/invoices_parts/seed_invoices_part01.sql` through
      `seed_invoices_part11.sql` — 10,783 historical invoice records from
      Consolidated Data, split into 11 files of ~1,000 rows / ~400KB each so
      each one pastes and runs comfortably in the web SQL editor (the earlier
      single 4MB file was too big to paste reliably). Run `part01`, wait for
      it to finish, then `part02`, and so on through `part11` — they're
      independent statements (each one is its own `insert ... on conflict do
      nothing`), so if one part times out you can just re-run that same part.
3. Officer PINs seeded here are placeholders (`1000`, `1001`, ...) — not
   secret, just sequential. Change them for real officers in
   **Admin → Officers** after go-live, and change the three shared passwords
   in **Admin/Super Admin → Settings** (`admin123` / `superadmin123` are the current defaults).

### Running all 11 invoice parts via CLI in one go (optional, faster)

```bash
# from the project root, with the Supabase CLI installed and linked
for f in supabase/invoices_parts/seed_invoices_part*.sql; do
  supabase db execute -f "$f"
done
# or with plain psql, using your project's connection string:
for f in supabase/invoices_parts/seed_invoices_part*.sql; do
  psql "$DATABASE_URL" -f "$f"
done
```

After all 11 parts, confirm the count in the SQL editor:
```sql
select count(*) from invoices; -- should be 10783
```

## 2. Environment variables

The app reads two variables. A working `.env` for local dev is already
included in this zip (pointing at the Supabase project referenced earlier in
this doc) — copy `.env.example` to `.env` if you ever need to point at a
different project:

```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Get both from Supabase → Project Settings → API. Use the **anon** key (not
the service role key) — this is a client-side app. **Remember:** this local
`.env` only affects `npm run dev`/`npm run build` on your machine — see
"Fixing the blank-page-after-deploy issue" above for what Vercel actually
needs.

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

- Log in with `admin123` → **Facilities** should list 823 rows,
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
