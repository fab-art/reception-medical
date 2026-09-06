# RSSB Medical Invoice Workflow System

Tracks a medical/health-facility invoice through the real RSSB process, end to end:

**District submission → Verification (district officer) → Reconciliation (officer ↔ facility) →
QR-tracked transit to HQ → Lead Medical Officer review → Manager sign-off → Finance payment.**

Built from `RSSB_Master.xlsm`: 823 facilities, 59 officers with real district/zone assignments,
and 1,649 live invoice records mapped from the workbook's "Consolidated Data" sheet into this
app's pipeline.

## Roles

| Role | What they do |
|---|---|
| **District Officer** | Owns one district. Registers invoices arriving from local facilities, runs verification and reconciliation, dispatches to HQ. |
| **Zone Supervisor** | Oversees several districts' officers; monitors workload and SLA breaches. |
| **HQ Assistant** | Takes overflow invoices handed off by a Lead/Manager/Supervisor when a district officer is overloaded. |
| **HQ Reception & Archives** | Confirms physical arrival (QR scan) and archives hard copies; forwards to the Lead. |
| **Lead Medical Officer** | Reviews for payment eligibility; approves to Manager or returns to the officer. |
| **Manager** | Signs off; sends to Finance or returns to Lead. |
| **Finance** | Generates payslip, issues the payment order, marks the facility paid. |
| **Admin / Super Admin** | Full visibility, officer/facility management, org-wide KPI dashboards, settings. |

Zone groupings (province-based) are this app's own default — confirm or adjust these in the
Officers page, since the source workbook doesn't define zone-supervisor structure.

## Sign-in

Individual staff sign in with a personal 4-digit PIN (see `src/data/officers-seed.json`).
Admin and Super Admin use shared passwords, set in Settings (`admin123` / `superadmin123` by
default — change these before any real deployment).

## Run

```bash
npm install
npm run dev      # local dev server
npm run build    # production build
npm run lint      # oxlint
```

Without `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` set, the app runs entirely off its local
seed data and browser storage — good for evaluating the app, but nothing is shared across devices.
See `DEPLOY.md` to connect a real Supabase project, and `supabase/schema.sql` for the schema
(**not compatible with any previous version of this app's database** — use a fresh project).

## What's tracked on every invoice

Submission timestamp, verification start/end + billing ID + deductions, reconciliation
start/end, transit dispatch/QR/receipt, lead decision, manager decision, payslip/payment-order/
paid dates, and a full append-only event log (who did what, when) that powers the per-invoice
"journey" timeline in the invoice workspace.

## Known limitations of this prototype

- No Supabase Auth / Row Level Security yet — see the note at the bottom of `supabase/schema.sql`.
- Zone-supervisor structure is a placeholder grouping, not sourced from RSSB's actual org chart.
- Historical invoices imported from the workbook have no event-log history (they predate the
  app); only invoices created or transitioned going forward get a full journey timeline.
- Some historical "in transit to HQ" records are missing a dispatch date in the source workbook,
  so they won't show a QR code until an officer re-dispatches them.
