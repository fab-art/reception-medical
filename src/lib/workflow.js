// RSSB Medical Invoice Workflow — canonical pipeline.
// Mirrors the real process used by the Medical Benefits unit: district
// verification -> reconciliation -> physical transit to HQ (QR-tracked) ->
// lead medical officer review -> manager sign-off -> finance payment.
// Status keys match (case-normalized) the "Invoice Status Option" list used
// in the RSSB Master workbook, extended with the transit/lead/manager steps
// this app newly tracks end-to-end.

export const SLA_DAYS = 15; // district verification target, per the master sheet's "Deadline Verification Time"

export const STAGES = ['intake', 'verification', 'reconciliation', 'transit', 'lead', 'manager', 'finance'];

export const STAGE_LABELS = {
  intake: 'District intake',
  verification: 'Verification',
  reconciliation: 'Reconciliation',
  transit: 'Transit to HQ',
  lead: 'Lead medical review',
  manager: 'Manager sign-off',
  finance: 'Finance & payment',
};

// Ordered pipeline. `terminal: true` statuses stop the invoice's forward motion
// (either paid, or parked as no-activity). Everything else is "open".
export const PIPELINE = [
  { key: 'not_received', label: 'Not Received', stage: 'intake', color: '#94a3b8', terminal: true },
  { key: 'no_patient', label: 'No Patient', stage: 'intake', color: '#94a3b8', terminal: true },
  { key: 'awaiting_verification', label: 'Awaiting Verification', stage: 'intake', color: '#0b3d78' },
  { key: 'verification_ongoing', label: 'Verification Ongoing', stage: 'verification', color: '#2563eb' },
  { key: 'awaiting_rectification', label: 'Awaiting Rectification', stage: 'verification', color: '#d97706' },
  { key: 'under_counter_verification', label: 'Under Counter-Verification', stage: 'verification', color: '#d97706' },
  { key: 'verification_complete', label: 'Verification Complete', stage: 'verification', color: '#0d7a70' },
  { key: 'reconciliation_ongoing', label: 'Reconciliation Ongoing', stage: 'reconciliation', color: '#2563eb' },
  { key: 'reconciliation_complete', label: 'Reconciliation Complete', stage: 'reconciliation', color: '#0d7a70' },
  { key: 'in_transit_to_hq', label: 'In Transit to HQ', stage: 'transit', color: '#7c3aed' },
  { key: 'received_at_hq', label: 'Received & Archived at HQ', stage: 'transit', color: '#0d7a70' },
  { key: 'lead_review', label: 'With Lead Medical Officer', stage: 'lead', color: '#2563eb' },
  { key: 'returned_by_lead', label: 'Returned by Lead', stage: 'lead', color: '#dc2626' },
  { key: 'manager_review', label: 'With Manager', stage: 'manager', color: '#2563eb' },
  { key: 'returned_by_manager', label: 'Returned by Manager', stage: 'manager', color: '#dc2626' },
  { key: 'sent_to_finance', label: 'Sent to Finance', stage: 'finance', color: '#2563eb' },
  { key: 'payslip_generated', label: 'Payslip Generated', stage: 'finance', color: '#0ea5a3' },
  { key: 'payment_order_issued', label: 'Payment Order (OP) Issued', stage: 'finance', color: '#0ea5a3' },
  { key: 'facility_paid', label: 'Facility Paid', stage: 'finance', color: '#15803d', terminal: true },
];

const BY_KEY = Object.fromEntries(PIPELINE.map(s => [s.key, s]));

export function statusLabel(status) { return BY_KEY[status]?.label || status; }
export function statusColor(status) { return BY_KEY[status]?.color || '#64748b'; }
export function statusStage(status) { return BY_KEY[status]?.stage || 'intake'; }
export function isTerminal(status) { return !!BY_KEY[status]?.terminal; }
export function isOpen(status) { return !isTerminal(status); }
export function isReturned(status) { return status === 'awaiting_rectification' || status === 'returned_by_lead' || status === 'returned_by_manager'; }

// Delay-reason taxonomies lifted directly from the master workbook's dropdown lists.
export const VERIFICATION_DELAY_REASONS = [
  'High volume of vouchers',
  'Staff unavailability (leave/training/reassignment)',
  'System/technical issues',
  'Inconsistent soft copy submitted',
  'Field verification/audit pending',
  'Awaiting higher authority approval',
];
export const RECONCILIATION_DELAY_REASONS = [
  'Missing/incomplete documents',
  'Pending clarifications from facility',
  'Delay in facility feedback',
  'Awaiting MPC decision',
  'Awaiting management approval',
  'Under dispute with facility',
  'Under further audit/investigation',
  'Failure to attend reconciliation session',
];
export const RETURN_REASONS = [
  'Improper verification',
  'Errors/oversights found',
  'Sent for counter-verification',
];

export function ageDays(from, to = new Date()) {
  if (!from) return null;
  const ms = new Date(to) - new Date(from);
  return Math.max(0, Math.floor(ms / 86400000));
}

// Verification SLA is measured from district submission to verification end.
export function verificationSla(record, now = new Date()) {
  const start = record.submittedAt;
  if (!start) return { days: null, breached: false, met: false };
  const end = record.verificationEndedAt;
  const days = ageDays(start, end || now);
  return {
    days,
    breached: !end && days > SLA_DAYS,
    met: !!end && days <= SLA_DAYS,
  };
}

// What action, if any, can this role take on this record right now.
// Used to build role-scoped queues ("my work") rather than the whole table.
export function actionableBy(record, role) {
  const s = record.status;
  switch (role) {
    case 'district_officer':
    case 'hq_assistant':
      return ['awaiting_verification', 'verification_ongoing', 'awaiting_rectification', 'reconciliation_ongoing'].includes(s);
    case 'hq_reception':
      return ['in_transit_to_hq'].includes(s);
    case 'lead_medical_officer':
      return ['received_at_hq', 'lead_review'].includes(s);
    case 'manager':
      return ['manager_review'].includes(s);
    case 'finance':
      return ['sent_to_finance', 'payslip_generated'].includes(s);
    default:
      return false;
  }
}

export function deriveMetrics(records) {
  const now = new Date();
  const total = records.length;
  const open = records.filter(r => isOpen(r.status));
  const paid = records.filter(r => r.status === 'facility_paid');
  const verified = records.filter(r => r.verificationEndedAt);
  const withinSla = verified.filter(r => verificationSla(r).met);
  const overdue = records.filter(r => verificationSla(r, now).breached);
  const returned = records.filter(r => isReturned(r.status));
  const inTransit = records.filter(r => r.status === 'in_transit_to_hq');
  const totalBilled = records.reduce((s, r) => s + Number(r.amountBilled || 0), 0);
  const totalVerifiedAmount = verified.reduce((s, r) => s + Number(r.amountAfterVerification || 0), 0);
  const totalDeduction = verified.reduce((s, r) => s + Number(r.deductionAmount || 0), 0);
  const totalPaid = paid.reduce((s, r) => s + Number(r.amountAfterVerification ?? r.amountBilled ?? 0), 0);
  const byStage = Object.fromEntries(STAGES.map(st => [st, records.filter(r => statusStage(r.status) === st).length]));
  return {
    total, open: open.length, paid: paid.length, verified: verified.length,
    slaRate: verified.length ? Math.round((withinSla.length / verified.length) * 100) : 0,
    overdue: overdue.length, returned: returned.length, inTransit: inTransit.length,
    totalBilled, totalVerifiedAmount, totalDeduction, totalPaid, byStage,
  };
}

export function officerStats(records, officers) {
  return officers.map(o => {
    const mine = records.filter(r => r.assignedOfficerId === o.id || r.assignedAssistantId === o.id);
    const openMine = mine.filter(r => isOpen(r.status));
    const done = mine.filter(r => r.verificationEndedAt);
    const breaches = mine.filter(r => verificationSla(r).breached).length;
    return { officer: o, total: mine.length, open: openMine.length, completed: done.length, breaches };
  }).filter(s => s.total > 0).sort((a, b) => b.open - a.open);
}
