# RSSB Medical Invoice Workflow System

Improved evolution of `reception-main` for end-to-end medical/health-facility invoice workflow.

## Corrected operating model

**District Officer → HQ Reception → Verification Officer → Finance handoff → Paid**

- Verification is performed at HQ.
- Finance receives verified invoices for payment execution; the application tracks the handoff and reference.
- HQ Reception owns completeness checking and correction/return cycles.
- Verification Officers see their assigned queue and enter Billing ID, vouchers completed, amount after verification, deductions, amount to Finance, delay reason and verification status.
- The primary SLA KPI is **verification within 15 calendar days from submitted-to-HQ timestamp**.
- Admin/Lead assigns workload and monitors officer completion/voucher metrics and SLA breaches.
- Super Admin sees organization-wide KPI, money, stage distribution and district performance.

## Demo access

- HQ Reception: `reception123`
- Verification Lead/Admin: `admin123`
- Super Admin: `superadmin123`
- District demo: `9003`
- Verification officers: 4-digit PINs generated in `src/data/officers-seed.json`

## Run

```bash
npm install
npm run dev
npm run build
```

The included local seed data is derived from the supplied workbooks. The Supabase schema in `supabase/schema.sql` is normalized for a production migration.

## Important production hardening

The original prototype used anonymous Supabase read/write plus hard-coded demo passwords. This version keeps local demo access for rapid prototyping, but the included schema is designed to move to Supabase Auth + role-aware RLS before production deployment.
