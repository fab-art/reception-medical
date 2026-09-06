# Implementation notes

## Pipeline (see src/lib/workflow.js for the authoritative list)

1. **District intake** — invoice + vouchers arrive at the district office (`submitInvoice`).
2. **Verification** — district officer (or HQ assistant, if reassigned) enters the Billing ID
   from Finance's own system and verifies vouchers (`startVerification` → `completeVerification`,
   with `returnForRectification` as a side branch).
3. **Reconciliation** — officer and facility agree on the verification output
   (`startReconciliation` → `completeReconciliation`).
4. **Transit to HQ** — hard copies dispatched with a generated QR code, then confirmed received
   and archived at HQ (`dispatchToHq` → `confirmReceivedAtHq` → `sendToLead`).
5. **Lead Medical Officer review** — approve to Manager or return to the officer
   (`leadApprove` / `leadReturn`).
6. **Manager sign-off** — approve to Finance or return to Lead (`managerApprove` / `managerReturn`).
7. **Finance** — payslip → payment order → paid (`markPayslipGenerated` → `markPaymentOrderIssued`
   → `markFacilityPaid`).

Any "returned" state resumes at its origin stage via `resubmitAfterCorrection`.

## Overload handling

`assignToAssistant` / `unassignAssistant` let a Lead, Manager, Zone Supervisor, or Admin hand a
district officer's invoice to an HQ assistant. `InvoiceQueue`'s `scopeInvoices()` makes sure both
the original officer and the assistant see the invoice in their own queue.

## SLA

Verification target is **15 calendar days from district submission** (`SLA_DAYS` in
`workflow.js`), configurable per-deployment in Settings.

## Audit trail

Every transition function in `db.js` calls `logEvent()`, writing an immutable row to
`invoice_events` with actor, timestamp, and a human-readable note. This is what the invoice
Timeline component renders, and it's also how `lastEditedBy` / `updatedAt` stay accurate on
every record. Historical invoices bulk-imported from the source workbook have no such events —
only invoices created or transitioned inside this app do.

## Data provenance

`src/data/{facilities,officers,invoices}-seed.json` were generated from `RSSB_Master.xlsm`
(FacilityNames, Staff list, Zone Verification, and Consolidated Data sheets). The workbook's own
status text had typos and inconsistent casing ("not receved", "TD", "WTO", mixed casing) which
were normalized against its own official 13-status dropdown list during import; a handful of
"Submitted to HQ" rows were advanced to their true later stage where payslip/OP dates in the
source proved they'd progressed further than their stored status said.
