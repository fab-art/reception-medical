import { v4 as uuid } from 'uuid';
import { loadLocal, saveLocal } from './local';
import { supabase, supabaseConfigured } from './supabase';
import { toSnake, toCamel, listToCamel } from './casing';
import { SLA_DAYS } from './workflow';
import seedFacilities from '../data/facilities-seed.json';
import seedInvoices from '../data/invoices-seed.json';
import seedOfficers from '../data/officers-seed.json';

// ---------------------------------------------------------------------------
// Data layer: Supabase is the source of truth (shared across every device).
// A local cache (idb-keyval) keeps the app fast and usable offline; every
// write is attempted against Supabase first and queued for retry if that
// fails. Every invoice mutation also appends an immutable event to the
// invoice_events log via logEvent(), which is what powers the per-invoice
// "journey" timeline and the edit-history requirement across the app.
// ---------------------------------------------------------------------------

const KEY = { facilities: 'facilities', invoices: 'invoices', officers: 'officers', settings: 'settings', events: 'events' };
const DEFAULT_SETTINGS = {
  id: 1,
  branch: 'RSSB HQ — Medical Benefits Unit', province: 'Kigali City', district: 'Nyarugenge',
  verificationSlaDays: SLA_DAYS,
  adminPassword: 'admin123', superadminPassword: 'superadmin123',
};

function now() { return new Date().toISOString(); }
function isOnline() { return supabaseConfigured && (typeof navigator === 'undefined' ? true : navigator.onLine); }

async function queueWrite(op) {
  const queue = await loadLocal('queue', []);
  queue.push({ ...op, queueId: uuid(), createdAt: now() });
  await saveLocal('queue', queue);
}

async function tryRemote(table, fn, queued) {
  if (!isOnline()) { await queueWrite(queued); return; }
  try {
    const { error } = await fn(supabase.from(table));
    if (error) throw error;
  } catch {
    await queueWrite(queued);
  }
}

export async function flushQueue() {
  if (!isOnline()) return;
  const queue = await loadLocal('queue', []);
  if (!queue.length) return;
  const remaining = [];
  for (const op of queue) {
    try {
      const { error } = await op.replay(supabase);
      if (error && error.code !== '23505') remaining.push(op);
    } catch {
      remaining.push(op);
    }
  }
  await saveLocal('queue', remaining);
  return { flushed: queue.length - remaining.length, remaining: remaining.length };
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { flushQueue().catch(() => {}); });
}

// ---- bootstrap ----
export async function initializeStore() {
  await Promise.all([
    pullTable('facilities', KEY.facilities, seedFacilities),
    pullTable('officers', KEY.officers, seedOfficers),
    pullTable('invoices', KEY.invoices, seedInvoices),
    pullSettings(),
  ]);
  await flushQueue().catch(() => {});
}

async function pullTable(table, key, seed) {
  if (isOnline()) {
    try {
      const { data, error } = await supabase.from(table).select('*');
      if (!error && data) {
        if (data.length === 0 && seed.length > 0) {
          const rows = seed.map(toSnake);
          const { error: seedErr } = await supabase.from(table).upsert(rows, { onConflict: 'id' });
          if (!seedErr) { await saveLocal(key, seed); return; }
        } else {
          await saveLocal(key, listToCamel(data));
          return;
        }
      }
    } catch { /* fall through to local cache */ }
  }
  const local = await loadLocal(key, null);
  if (!local?.length) await saveLocal(key, seed);
}

async function pullSettings() {
  if (isOnline()) {
    try {
      const { data, error } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();
      if (!error && data) { await saveLocal(KEY.settings, toCamel(data)); return; }
      if (!error && !data) {
        await supabase.from('settings').upsert(toSnake(DEFAULT_SETTINGS), { onConflict: 'id' });
      }
    } catch { /* fall through */ }
  }
  const local = await loadLocal(KEY.settings, null);
  if (!local) await saveLocal(KEY.settings, DEFAULT_SETTINGS);
}

export async function getSettings() { return loadLocal(KEY.settings, DEFAULT_SETTINGS); }
export async function saveSettings(s) {
  const next = { ...s, id: 1 };
  await saveLocal(KEY.settings, next);
  await tryRemote('settings', (t) => t.upsert(toSnake(next), { onConflict: 'id' }),
    { replay: (sb) => sb.from('settings').upsert(toSnake(next), { onConflict: 'id' }) });
  return next;
}

// ---- facilities ----
export async function getFacilities() { return (await loadLocal(KEY.facilities, seedFacilities)).slice().sort((a, b) => a.name.localeCompare(b.name)); }

export async function upsertFacility(facility) {
  const list = await getFacilities();
  const item = { id: facility.id || uuid(), active: true, ...facility, updatedAt: now() };
  const next = list.some((f) => f.id === item.id) ? list.map((f) => (f.id === item.id ? item : f)) : [...list, item];
  await saveLocal(KEY.facilities, next);
  await tryRemote('facilities', (t) => t.upsert(toSnake(item), { onConflict: 'id' }),
    { replay: (sb) => sb.from('facilities').upsert(toSnake(item), { onConflict: 'id' }) });
  return item;
}

export async function importFacilities(list) {
  const items = list.map((f) => ({ id: f.id || uuid(), active: true, updatedAt: now(), ...f }));
  await saveLocal(KEY.facilities, items);
  await tryRemote('facilities', (t) => t.upsert(items.map(toSnake), { onConflict: 'id' }),
    { replay: (sb) => sb.from('facilities').upsert(items.map(toSnake), { onConflict: 'id' }) });
  return items;
}

// ---- officers ----
export async function getOfficers() { return (await loadLocal(KEY.officers, seedOfficers)).filter((o) => o.active !== false); }
export async function addOfficer(officer) {
  const list = await loadLocal(KEY.officers, seedOfficers);
  const item = { id: uuid(), active: true, ...officer };
  const next = [...list, item];
  await saveLocal(KEY.officers, next);
  await tryRemote('officers', (t) => t.insert(toSnake(item)),
    { replay: (sb) => sb.from('officers').insert(toSnake(item)) });
  return getOfficers();
}
export async function updateOfficer(id, patch) {
  const list = await loadLocal(KEY.officers, seedOfficers);
  const next = list.map((o) => (o.id === id ? { ...o, ...patch } : o));
  await saveLocal(KEY.officers, next);
  const row = toSnake(patch);
  await tryRemote('officers', (t) => t.update(row).eq('id', id),
    { replay: (sb) => sb.from('officers').update(row).eq('id', id) });
  return getOfficers();
}
export async function removeOfficer(id) { return updateOfficer(id, { active: false }); }
export async function findOfficerByPin(pin) { return (await getOfficers()).find((o) => String(o.pin) === String(pin)) || null; }

// ---- invoices ----
export async function getInvoices() { return (await loadLocal(KEY.invoices, seedInvoices)).slice().sort((a, b) => new Date(b.updatedAt || b.submittedAt || 0) - new Date(a.updatedAt || a.submittedAt || 0)); }
export async function getInvoiceById(id) { return (await getInvoices()).find((r) => r.id === id) || null; }

async function logEvent(invoiceId, action, actor, note = '', details = {}) {
  const events = await loadLocal(KEY.events, []);
  const item = { id: uuid(), invoiceId, action, actor, note, at: now(), details };
  await saveLocal(KEY.events, [item, ...events]);
  await tryRemote('invoice_events', (t) => t.insert(toSnake(item)),
    { replay: (sb) => sb.from('invoice_events').insert(toSnake(item)) });
  return item;
}

async function saveInvoiceList(next) { await saveLocal(KEY.invoices, next); }

// Generic mutation used by every workflow transition below. Every call is
// logged as an immutable event (actor + timestamp + note + changed fields),
// which is what the invoice Timeline and "last edited" labels read from.
export async function updateInvoice(id, patch, actor = 'system', note = '') {
  const list = await getInvoices();
  const old = list.find((r) => r.id === id);
  if (!old) throw new Error('Invoice not found');
  const updated = { ...old, ...patch, updatedAt: now(), lastEditedBy: actor };
  await saveInvoiceList(list.map((r) => (r.id === id ? updated : r)));
  const row = toSnake({ ...patch, updatedAt: updated.updatedAt, lastEditedBy: actor });
  await tryRemote('invoices', (t) => t.update(row).eq('id', id),
    { replay: (sb) => sb.from('invoices').update(row).eq('id', id) });
  await logEvent(id, 'update', actor, note, { fields: Object.keys(patch) });
  return updated;
}

// 1. District submission — invoice + vouchers arrive at the district office.
export async function submitInvoice(record, actor) {
  const list = await getInvoices();
  const item = {
    id: record.id || uuid(), receiptNo: record.receiptNo || `RSSB-${Date.now()}`,
    billingId: null,
    facilityCode: record.facilityCode, facilityName: record.facilityName,
    district: record.district, province: record.province, category: record.category || '',
    periodMonth: record.periodMonth,
    assignedOfficerId: record.assignedOfficerId || null, assignedOfficerName: record.assignedOfficerName || null,
    assignedAssistantId: null,
    status: 'awaiting_verification',
    amountBilled: Number(record.amountBilled || 0), vouchers: Number(record.vouchers || 0),
    submittedAt: now(),
    verificationStartedAt: null, vouchersDone: 0, verificationEndedAt: null, verificationDeadline: null,
    amountAfterVerification: null, deductionAmount: null, verificationDelayDays: null, verificationDelayReason: null,
    reconciliationInvitedAt: null, reconciliationStartedAt: null, reconciliationEndedAt: null, reconciliationDelayReason: null,
    transitDispatchedAt: null, transitReceivedAt: null, transitQrCode: null,
    returnedForCorrectionAt: null, returnReason: null, resentAfterCorrectionAt: null,
    leadReviewedAt: null, leadDecision: null, leadComment: null,
    managerSignedAt: null, managerComment: null,
    sentToFinanceAt: null, payslipDate: null, payslipNo: null, paymentOrderDate: null, paidAt: null,
    notes: record.notes || '', correctionCount: 0, lastEditedBy: actor, updatedAt: now(),
  };
  await saveInvoiceList([item, ...list]);
  await tryRemote('invoices', (t) => t.insert(toSnake(item)),
    { replay: (sb) => sb.from('invoices').insert(toSnake(item)) });
  await logEvent(item.id, 'submitted', actor, `Invoice received at ${item.district} district office.`);
  return item;
}

// 2. Start verification — billing ID (from Finance's system) is entered here
// and travels with the invoice through every later step.
export async function startVerification(id, billingId, actor) {
  return updateInvoice(id, { status: 'verification_ongoing', verificationStartedAt: now(), billingId }, actor,
    `Verification started. Billing ID ${billingId} recorded.`);
}
export async function returnForRectification(id, reason, actor) {
  return updateInvoice(id, { status: 'awaiting_rectification', verificationDelayReason: reason }, actor,
    `Sent back for rectification: ${reason}`);
}
export async function resumeVerification(id, actor) {
  return updateInvoice(id, { status: 'verification_ongoing' }, actor, 'Verification resumed after rectification.');
}
// 3. End verification.
export async function completeVerification(id, payload, actor) {
  const r = await getInvoiceById(id);
  const billed = Number(r?.amountBilled || 0);
  const amountAfterVerification = Number(payload.amountAfterVerification ?? billed);
  const deductionAmount = Math.max(0, billed - amountAfterVerification);
  return updateInvoice(id, {
    status: 'verification_complete', verificationEndedAt: now(),
    vouchersDone: Number(payload.vouchersDone ?? r?.vouchers ?? 0),
    amountAfterVerification, deductionAmount,
  }, actor, `Verification completed. ${deductionAmount ? `Deduction of ${deductionAmount.toLocaleString()} RWF identified.` : 'No deductions.'}`);
}
// 4. Reconciliation — officer & facility agree on the verification output.
export async function startReconciliation(id, actor) {
  const r = await getInvoiceById(id);
  return updateInvoice(id, {
    status: 'reconciliation_ongoing',
    reconciliationInvitedAt: r?.reconciliationInvitedAt || now(),
    reconciliationStartedAt: now(),
  }, actor, 'Reconciliation session started with the facility.');
}
export async function completeReconciliation(id, actor) {
  return updateInvoice(id, { status: 'reconciliation_complete', reconciliationEndedAt: now() }, actor,
    'Facility agreed on the verification output. Reconciliation closed.');
}
// 5. Transit to HQ — QR-coded handoff.
export async function dispatchToHq(id, actor) {
  return updateInvoice(id, { status: 'in_transit_to_hq', transitDispatchedAt: now(), transitQrCode: uuid() }, actor,
    'Hard copies (invoice + vouchers) dispatched to HQ. QR code generated for pickup.');
}
export async function confirmReceivedAtHq(id, actor) {
  return updateInvoice(id, { status: 'received_at_hq', transitReceivedAt: now() }, actor,
    'QR scanned on arrival. Hard copies received and archived at HQ.');
}
// 6. Lead medical officer review.
export async function sendToLead(id, actor) {
  return updateInvoice(id, { status: 'lead_review' }, actor, 'Forwarded to the Lead Medical Officer for review.');
}
export async function leadApprove(id, comment, actor) {
  return updateInvoice(id, { status: 'manager_review', leadReviewedAt: now(), leadDecision: 'approved', leadComment: comment || '' }, actor,
    'Lead Medical Officer approved for payment. Forwarded to the Manager.');
}
export async function leadReturn(id, reason, actor) {
  return updateInvoice(id, { status: 'returned_by_lead', leadReviewedAt: now(), leadDecision: 'returned', leadComment: reason }, actor,
    `Returned by Lead Medical Officer: ${reason}`);
}
// 7. Manager sign-off.
export async function managerApprove(id, comment, actor) {
  return updateInvoice(id, { status: 'sent_to_finance', managerSignedAt: now(), managerComment: comment || '', sentToFinanceAt: now() }, actor,
    'Manager signed. Invoice sent to Finance for payment.');
}
export async function managerReturn(id, reason, actor) {
  return updateInvoice(id, { status: 'returned_by_manager', managerComment: reason }, actor,
    `Returned by Manager: ${reason}`);
}
// Generic resubmission after any "returned" state, back to the stage it was returned from.
export async function resubmitAfterCorrection(id, actor) {
  const r = await getInvoiceById(id);
  const nextStatus = r?.status === 'returned_by_lead' ? 'lead_review'
    : r?.status === 'returned_by_manager' ? 'manager_review'
    : 'verification_ongoing';
  return updateInvoice(id, { status: nextStatus, resentAfterCorrectionAt: now(), correctionCount: 1 + Number(r?.correctionCount || 0) }, actor,
    'Corrections made — resubmitted into the workflow.');
}
// 8. Finance.
export async function markPayslipGenerated(id, payslipNo, actor) {
  return updateInvoice(id, { status: 'payslip_generated', payslipDate: now(), payslipNo }, actor, `Payslip ${payslipNo} generated.`);
}
export async function markPaymentOrderIssued(id, actor) {
  return updateInvoice(id, { status: 'payment_order_issued', paymentOrderDate: now() }, actor, 'Payment order (OP) issued.');
}
export async function markFacilityPaid(id, actor) {
  return updateInvoice(id, { status: 'facility_paid', paidAt: now() }, actor, 'Facility paid. Invoice closed.');
}

// Overload management — lead/manager can hand some of a district officer's
// invoices to an HQ assistant; both the officer and assistant can see them.
export async function assignToAssistant(id, assistantId, assistantName, actor) {
  return updateInvoice(id, { assignedAssistantId: assistantId }, actor,
    `Assigned to HQ assistant ${assistantName} to help with workload.`);
}
export async function unassignAssistant(id, actor) {
  return updateInvoice(id, { assignedAssistantId: null }, actor, 'Removed from HQ assistant queue.');
}

export async function getInvoiceEvents(invoiceId) {
  const e = await loadLocal(KEY.events, []);
  return e.filter((x) => x.invoiceId === invoiceId).sort((a, b) => new Date(a.at) - new Date(b.at));
}
export async function getEvents() { return loadLocal(KEY.events, []); }

export async function deleteInvoice(id) {
  const list = await getInvoices();
  await saveInvoiceList(list.filter((r) => r.id !== id));
  await tryRemote('invoices', (t) => t.delete().eq('id', id),
    { replay: (sb) => sb.from('invoices').delete().eq('id', id) });
  return true;
}

export async function syncNow() { await initializeStore(); const r = await flushQueue(); return r || { count: 0 }; }
export function getSlaDays() { return SLA_DAYS; }
export { ageDays } from './workflow';
