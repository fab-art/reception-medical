export const SLA_DAYS = 15;

export const STATUSES = {
  SUBMITTED: 'submitted_to_hq',
  RECEPTION_CHECK: 'reception_check',
  RETURNED_FOR_CORRECTION: 'returned_for_correction',
  READY_FOR_ASSIGNMENT: 'ready_for_assignment',
  ASSIGNED: 'assigned',
  VERIFICATION_ONGOING: 'verification_ongoing',
  VERIFICATION_COMPLETE: 'verified',
  SENT_TO_FINANCE: 'sent_to_finance',
  PAID: 'paid',
};

export const STATUS_LABELS = {
  submitted_to_hq: 'Submitted to HQ',
  reception_check: 'Reception checking',
  returned_for_correction: 'Returned for correction',
  ready_for_assignment: 'Ready for assignment',
  assigned: 'Assigned',
  verification_ongoing: 'Verification ongoing',
  verified: 'Verified',
  sent_to_finance: 'Sent to Finance',
  paid: 'Paid',
};

export const STAGE_LABELS = {
  district: 'District submission',
  hq_reception: 'HQ reception',
  verification: 'Verification',
  finance: 'Finance / payment',
};

export function ageDays(from, to = new Date()) {
  if (!from) return null;
  const ms = new Date(to) - new Date(from);
  return Math.max(0, Math.floor(ms / 86400000));
}

export function slaInfo(record, now = new Date()) {
  const days = ageDays(record.submittedToHqAt || record.receivedAt, now);
  const verified = record.verifiedAt != null;
  const within = verified ? ageDays(record.submittedToHqAt || record.receivedAt, record.verifiedAt) <= SLA_DAYS : days <= SLA_DAYS;
  return { days, dueIn: Math.max(0, SLA_DAYS - days), breached: !verified && days > SLA_DAYS, met: verified && within };
}

export function currentStage(status) {
  if ([STATUSES.SUBMITTED, STATUSES.RECEPTION_CHECK, STATUSES.RETURNED_FOR_CORRECTION, STATUSES.READY_FOR_ASSIGNMENT].includes(status)) return 'hq_reception';
  if ([STATUSES.ASSIGNED, STATUSES.VERIFICATION_ONGOING, STATUSES.VERIFICATION_COMPLETE].includes(status)) return 'verification';
  if ([STATUSES.SENT_TO_FINANCE, STATUSES.PAID].includes(status)) return 'finance';
  return 'district';
}

export function statusLabel(status) { return STATUS_LABELS[status] || status; }

export function deriveMetrics(records) {
  const now = new Date();
  const verified = records.filter(r => r.verifiedAt);
  const within15 = verified.filter(r => ageDays(r.submittedToHqAt || r.receivedAt, r.verifiedAt) <= SLA_DAYS);
  const open = records.filter(r => ![STATUSES.VERIFICATION_COMPLETE, STATUSES.SENT_TO_FINANCE, STATUSES.PAID].includes(r.status));
  const totalBilled = records.reduce((s, r) => s + Number(r.amountBilled || 0), 0);
  const totalVerified = verified.reduce((s, r) => s + Number(r.verifiedAmount || 0), 0);
  const totalDeduction = verified.reduce((s, r) => s + Number(r.deductionAmount || 0), 0);
  const totalToPay = records.reduce((s, r) => s + Number(r.amountToPay || 0), 0);
  const overdue = records.filter(r => !r.verifiedAt && ageDays(r.submittedToHqAt || r.receivedAt, now) > SLA_DAYS);
  return {
    total: records.length, open: open.length, verified: verified.length, within15: within15.length,
    slaRate: verified.length ? Math.round((within15.length / verified.length) * 100) : 0,
    overdue: overdue.length, totalBilled, totalVerified, totalDeduction, totalToPay,
  };
}
