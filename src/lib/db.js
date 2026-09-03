import { v4 as uuid } from 'uuid';
import { loadLocal, saveLocal } from './local';
import { supabase } from './supabase';
import { toSnake, toCamel, listToCamel } from './casing';
import { SLA_DAYS, STATUSES, ageDays } from './workflow';
import seedFacilities from '../data/facilities-seed.json';
import seedInvoices from '../data/invoices-seed.json';
import seedOfficers from '../data/officers-seed.json';

// ---------------------------------------------------------------------------
// Data layer: Supabase is the source of truth (shared across every device).
// idb-keyval is only a local cache so the app keeps working and stays fast
// while offline; every write is attempted against Supabase first and queued
// for retry if that fails (no connection, etc). This replaces the previous
// version of this file, which never talked to Supabase at all and stored
// everything under IndexedDB keys that didn't actually exist in local.js
// (so different record types silently overwrote each other).
// ---------------------------------------------------------------------------

const KEY = { facilities: 'facilities', invoices: 'invoices', officers: 'officers', settings: 'settings', events: 'events' };
const DEFAULT_SETTINGS = {
  id: 1,
  branch: 'RSSB HQ', province: 'Kigali City', district: 'NYARUGENGE',
  verificationSlaDays: SLA_DAYS,
  adminPassword: 'admin123', superadminPassword: 'superadmin123', receptionPassword: 'reception123',
};

function now() { return new Date().toISOString(); }
function isOnline() { return typeof navigator === 'undefined' ? true : navigator.onLine; }

async function queueWrite(op) {
  const queue = await loadLocal('queue', []);
  queue.push({ ...op, queueId: uuid(), createdAt: now() });
  await saveLocal('queue', queue);
}

// Runs a Supabase write; on any failure (offline, RLS, etc.) queues it for a
// later retry via flushQueue() instead of throwing, so the UI (which already
// updates its local cache optimistically) never blocks on connectivity.
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
          // Shared DB is empty (first run) — seed it once, and cache locally.
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

// ---- facilities / pharmacies ----
export async function getFacilities() { return (await loadLocal(KEY.facilities, seedFacilities)).slice().sort((a, b) => a.name.localeCompare(b.name)); }
export async function getPharmacies() { return getFacilities(); }

export async function upsertFacility(facility) {
  const list = await getFacilities();
  const item = { id: facility.id || uuid(), active: true, ...facility, updatedAt: now() };
  const next = list.some((f) => f.id === item.id) ? list.map((f) => (f.id === item.id ? item : f)) : [...list, item];
  await saveLocal(KEY.facilities, next);
  await tryRemote('facilities', (t) => t.upsert(toSnake(item), { onConflict: 'id' }),
    { replay: (sb) => sb.from('facilities').upsert(toSnake(item), { onConflict: 'id' }) });
  return item;
}
export async function upsertPharmacy(p) { return upsertFacility(p); }

export async function importFacilities(list) {
  const items = list.map((f) => ({ id: f.id || uuid(), active: true, updatedAt: now(), ...f }));
  await saveLocal(KEY.facilities, items);
  await tryRemote('facilities', (t) => t.upsert(items.map(toSnake), { onConflict: 'id' }),
    { replay: (sb) => sb.from('facilities').upsert(items.map(toSnake), { onConflict: 'id' }) });
  return items;
}
export async function importPharmacies(list) { return importFacilities(list); }

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

// ---- invoices / receptions ----
export async function getReceptions() { return getInvoices(); }
export async function getInvoices() { return (await loadLocal(KEY.invoices, seedInvoices)).slice().sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt)); }
export async function getReceptionById(id) { return (await getInvoices()).find((r) => r.id === id) || null; }
export async function getInvoiceById(id) { return getReceptionById(id); }

async function logEvent(invoiceId, type, actor, details = {}) {
  const events = await loadLocal(KEY.events, []);
  const item = { id: uuid(), invoiceId, action: type, actor, at: now(), details };
  await saveLocal(KEY.events, [item, ...events]);
  await tryRemote('invoice_events', (t) => t.insert(toSnake(item)),
    { replay: (sb) => sb.from('invoice_events').insert(toSnake(item)) });
}

async function saveInvoiceList(next) { await saveLocal(KEY.invoices, next); }

export async function addReception(record) {
  const list = await getInvoices();
  const item = {
    id: record.id || uuid(), receiptNo: record.receiptNo, facilityCode: record.facilityCode || record.pharmacyCode,
    facilityName: record.facilityName || record.pharmacyName, district: record.district, province: record.province,
    category: record.category || '', periodMonth: record.periodMonth, periodYear: Number(record.periodYear),
    billNumber: record.billNumber || '', vouchers: Number(record.vouchers || 0), amountBilled: Number(record.amountBilled || 0),
    submittedByName: record.submittedByName || '', receivedByName: record.receivedByName || '',
    receivedAt: record.receivedAt || now(), submittedToHQAt: record.submittedToHQAt || record.receivedAt || now(),
    status: STATUSES.RECEPTION_CHECK, assignedOfficerId: null, assignedAt: null,
    requirementsComplete: false, correctionCount: 0, correctionReason: '', deductionAmount: null, verifiedAmount: null,
    billId: '', vouchersDone: 0, verificationStartedAt: null, verifiedAt: null, amountToPay: null,
    sentToFinanceAt: null, paymentId: '', paidAt: null, notes: '', delayReason: '', delayStage: '',
    syncStatus: 'local', updatedAt: now(),
  };
  await saveInvoiceList([item, ...list]);
  await tryRemote('invoices', (t) => t.insert(toSnake(item)),
    { replay: (sb) => sb.from('invoices').insert(toSnake(item)) });
  await logEvent(item.id, 'invoice_received', record.receivedByName || 'reception');
  return item;
}

export async function updateReception(id, patch, editedBy = '') { return updateInvoice(id, patch, editedBy); }
export async function updateInvoice(id, patch, actor = 'system') {
  const list = await getInvoices();
  const old = list.find((r) => r.id === id);
  if (!old) throw new Error('Invoice not found');
  const updated = { ...old, ...patch, updatedAt: now() };
  await saveInvoiceList(list.map((r) => (r.id === id ? updated : r)));
  const row = toSnake({ ...patch, updatedAt: updated.updatedAt });
  await tryRemote('invoices', (t) => t.update(row).eq('id', id),
    { replay: (sb) => sb.from('invoices').update(row).eq('id', id) });
  await logEvent(id, 'invoice_updated', actor, { fields: Object.keys(patch) });
  return updated;
}
export async function assignReception(id, officerId, actor = 'admin') {
  return updateInvoice(id, { assignedOfficerId: officerId || null, assignedAt: officerId ? now() : null, status: officerId ? STATUSES.ASSIGNED : STATUSES.READY_FOR_ASSIGNMENT }, actor);
}
export async function setReceptionStatus(id, status, extra = {}, actor = 'system') { return updateInvoice(id, { status, ...extra }, actor); }
export async function receptionCheck(id, { complete, reason = '', actor = 'reception' }) {
  if (complete) return updateInvoice(id, { requirementsComplete: true, status: STATUSES.READY_FOR_ASSIGNMENT, correctionReason: '', delayReason: '' }, actor);
  return updateInvoice(id, { requirementsComplete: false, status: STATUSES.RETURNED_FOR_CORRECTION, correctionReason: reason, correctionCount: 1 + Number((await getReceptionById(id))?.correctionCount || 0), lastReturnedAt: now(), delayStage: 'hq_reception', delayReason: reason }, actor);
}
export async function startVerification(id, actor = 'officer') { return updateInvoice(id, { status: STATUSES.VERIFICATION_ONGOING, verificationStartedAt: now() }, actor); }
export async function completeVerification(id, payload, actor = 'officer') {
  const r = await getReceptionById(id);
  const verifiedAmount = Number(payload.verifiedAmount || 0);
  const billed = Number(r?.amountBilled || 0);
  const deductionAmount = Math.max(0, billed - verifiedAmount);
  const at = now();
  return updateInvoice(id, { status: STATUSES.VERIFICATION_COMPLETE, verifiedAt: at, verificationStartedAt: r?.verificationStartedAt || at, billId: payload.billId || '', vouchersDone: Number(payload.vouchersDone || r?.vouchers || 0), verifiedAmount, deductionAmount, amountToPay: Number(payload.amountToPay ?? verifiedAmount), delayReason: payload.delayReason || '' }, actor);
}
export async function sendToFinance(id, actor = 'lead') { return updateInvoice(id, { status: STATUSES.SENT_TO_FINANCE, sentToFinanceAt: now() }, actor); }
export async function markPaid(id, { paymentId }, actor = 'finance') { return updateInvoice(id, { status: STATUSES.PAID, paymentId: paymentId || '', paidAt: now() }, actor); }

export async function getInvoiceEvents(invoiceId) { const e = await loadLocal(KEY.events, []); return e.filter((x) => x.invoiceId === invoiceId).sort((a, b) => new Date(a.at) - new Date(b.at)); }
export async function getEvents() { return loadLocal(KEY.events, []); }

export async function deleteReception(id) {
  const list = await getInvoices();
  await saveInvoiceList(list.filter((r) => r.id !== id));
  await tryRemote('invoices', (t) => t.delete().eq('id', id),
    { replay: (sb) => sb.from('invoices').delete().eq('id', id) });
  return true;
}

export async function syncNow() { await initializeStore(); const r = await flushQueue(); return r || { count: 0 }; }
export function onSyncEvent() { return () => {}; }
export function getSlaDays() { return SLA_DAYS; }
export { ageDays };
