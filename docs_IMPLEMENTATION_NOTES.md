# V2 implementation notes

## Corrected workflow

1. District office registers the corrected invoice and submits it to HQ.
2. HQ Reception receives/checks the record. Receptionists own completeness correction and return cycles.
3. Lead assigns complete invoices to verification officers at HQ.
4. Verification officer starts the task and records Billing ID, vouchers done, amount after verification, deduction, amount to Finance and delay reason.
5. Lead sends verified invoices to Finance for payment execution.
6. Finance/payment reference is tracked in the system; Finance remains the payment-execution owner.

## Primary SLA

The management target is to have invoices verified within **15 calendar days from `submittedToHQAt`**.

The application computes:
- current age in days
- SLA breach for unverified invoices older than 15 days
- SLA met for completed invoices verified within 15 days
- delay stage and delay reason

## Duplication removed

- Facility identity is held separately from invoices.
- Invoice status is controlled rather than free text.
- Durations are derived from timestamps rather than manually typed.
- Corrections are represented as cycles/count + reason instead of overwriting the invoice history.
- Assignment is an explicit relationship to a verification officer.
- Financial values are explicit: billed, verified, deduction, amount to Finance.

## Seed data

`src/data/facilities-seed.json`, `invoices-seed.json`, and `officers-seed.json` were generated from the supplied workbooks for a runnable local prototype.

## Production next step

Replace demo/local authentication and IndexedDB-only persistence with Supabase Auth + the normalized schema in `supabase/schema.sql`, with role-aware Row Level Security and immutable workflow events.
