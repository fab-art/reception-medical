import { v4 as uuid } from 'uuid';
import { loadLocal, saveLocal } from './local';
import { SLA_DAYS, STATUSES, ageDays } from './workflow';
import seedFacilities from '../data/facilities-seed.json';
import seedInvoices from '../data/invoices-seed.json';
import seedOfficers from '../data/officers-seed.json';

const KEY = {
  facilities: 'facilities', invoices: 'invoices', officers: 'officers', settings: 'settings', events: 'invoice_events'
};
const DEFAULT_SETTINGS = {
  branch: 'RSSB HQ', province: 'Kigali City', district: 'NYARUGENGE',
  verificationSlaDays: SLA_DAYS,
  adminPassword: 'admin123', superadminPassword: 'superadmin123', receptionPassword: 'reception123',
};

function now() { return new Date().toISOString(); }

export async function initializeStore() {
  let facilities = await loadLocal(KEY.facilities, null);
  if (!facilities?.length) { facilities = seedFacilities; await saveLocal(KEY.facilities, facilities); }
  let officers = await loadLocal(KEY.officers, null);
  if (!officers?.length) { officers = seedOfficers; await saveLocal(KEY.officers, officers); }
  let invoices = await loadLocal(KEY.invoices, null);
  if (!invoices?.length) { invoices = seedInvoices; await saveLocal(KEY.invoices, invoices); }
  const settings = await loadLocal(KEY.settings, null);
  if (!settings) await saveLocal(KEY.settings, DEFAULT_SETTINGS);
}

export async function getSettings() { return loadLocal(KEY.settings, DEFAULT_SETTINGS); }
export async function saveSettings(s) { await saveLocal(KEY.settings, s); return s; }

export async function getFacilities() { return (await loadLocal(KEY.facilities, seedFacilities)).slice().sort((a,b)=>a.name.localeCompare(b.name)); }
export async function getPharmacies() { return getFacilities(); }
export async function importFacilities(list) { await saveLocal(KEY.facilities, list); return list; }

export async function getOfficers() { return (await loadLocal(KEY.officers, seedOfficers)).filter(o=>o.active !== false); }
export async function addOfficer(officer) { const list=await getOfficers(); const item={id:uuid(),active:true,...officer}; await saveLocal(KEY.officers,[...list,item]); return list; }
export async function updateOfficer(id, patch) { const list=await getOfficers(); const next=list.map(o=>o.id===id?{...o,...patch}:o); await saveLocal(KEY.officers,next); return next; }
export async function removeOfficer(id) { return updateOfficer(id,{active:false}); }

export async function getReceptions() { return getInvoices(); }
export async function getInvoices() { return (await loadLocal(KEY.invoices, seedInvoices)).slice().sort((a,b)=>new Date(b.receivedAt)-new Date(a.receivedAt)); }
export async function getReceptionById(id) { return (await getInvoices()).find(r=>r.id===id) || null; }
export async function getInvoiceById(id) { return getReceptionById(id); }

async function saveInvoice(next, oldRecord=null, action=null, actor='system') {
  await saveLocal(KEY.invoices, next);
  if (action) {
    const events = await loadLocal(KEY.events, []);
    await saveLocal(KEY.events, [{id:uuid(), invoiceId:action.invoiceId, action:action.type, actor, at:now(), details:action.details||{}}, ...events]);
  }
}

export async function addReception(record) {
  const list=await getInvoices();
  const item={
    id: record.id || uuid(), receiptNo:record.receiptNo, facilityCode:record.facilityCode||record.pharmacyCode,
    facilityName:record.facilityName||record.pharmacyName, district:record.district, province:record.province,
    category:record.category||'', periodMonth:record.periodMonth, periodYear:Number(record.periodYear),
    billNumber:record.billNumber||'', vouchers:Number(record.vouchers||0), amountBilled:Number(record.amountBilled||0),
    submittedByName:record.submittedByName||'', receivedByName:record.receivedByName||'',
    receivedAt:record.receivedAt||now(), submittedToHQAt:record.submittedToHQAt||record.receivedAt||now(),
    status:STATUSES.RECEPTION_CHECK, assignedOfficerId:null, assignedAt:null,
    requirementsComplete:false, correctionCount:0, deductionAmount:null, verifiedAmount:null,
    billId:'', vouchersDone:0, verificationStartedAt:null, verifiedAt:null, amountToPay:null,
    sentToFinanceAt:null, paymentId:'', paidAt:null, notes:'', delayReason:'', delayStage:'',
    syncStatus:'local', updatedAt:now(),
  };
  await saveInvoice([item,...list], null, {invoiceId:item.id,type:'invoice_received',details:{}}, record.receivedByName||'reception');
  return item;
}
export async function updateReception(id, patch, editedBy='') { return updateInvoice(id,patch,editedBy); }
export async function updateInvoice(id, patch, actor='system') {
  const list=await getInvoices(); const old=list.find(r=>r.id===id); if(!old) throw new Error('Invoice not found');
  const updated={...old,...patch,updatedAt:now()};
  await saveInvoice(list.map(r=>r.id===id?updated:r), old, {invoiceId:id,type:'invoice_updated',details:{fields:Object.keys(patch)}}, actor);
  return updated;
}
export async function assignReception(id, officerId, actor='admin') {
  return updateInvoice(id,{assignedOfficerId:officerId||null, assignedAt:officerId?now():null, status:officerId?STATUSES.ASSIGNED:STATUSES.READY_FOR_ASSIGNMENT},actor);
}
export async function setReceptionStatus(id,status,extra={},actor='system') { return updateInvoice(id,{status,...extra},actor); }
export async function receptionCheck(id,{complete,reason='',actor='reception'}) {
  if (complete) return updateInvoice(id,{requirementsComplete:true,status:STATUSES.READY_FOR_ASSIGNMENT,correctionReason:'',delayReason:''},actor);
  return updateInvoice(id,{requirementsComplete:false,status:STATUSES.RETURNED_FOR_CORRECTION,correctionReason:reason,correctionCount:1 + Number((await getReceptionById(id))?.correctionCount||0),lastReturnedAt:now(),delayStage:'hq_reception',delayReason:reason},actor);
}
export async function startVerification(id, actor='officer') { return updateInvoice(id,{status:STATUSES.VERIFICATION_ONGOING,verificationStartedAt:now()},actor); }
export async function completeVerification(id, payload, actor='officer') {
  const r=await getReceptionById(id); const verifiedAmount=Number(payload.verifiedAmount||0); const billed=Number(r?.amountBilled||0);
  const deductionAmount=Math.max(0,billed-verifiedAmount); const at=now();
  return updateInvoice(id,{status:STATUSES.VERIFICATION_COMPLETE,verifiedAt:at,verificationStartedAt:r?.verificationStartedAt||at,billId:payload.billId||'',vouchersDone:Number(payload.vouchersDone||r?.vouchers||0),verifiedAmount,deductionAmount,amountToPay:Number(payload.amountToPay ?? verifiedAmount),delayReason:payload.delayReason||''},actor);
}
export async function sendToFinance(id, actor='lead') { return updateInvoice(id,{status:STATUSES.SENT_TO_FINANCE,sentToFinanceAt:now()},actor); }
export async function markPaid(id,{paymentId},actor='finance') { return updateInvoice(id,{status:STATUSES.PAID,paymentId:paymentId||'',paidAt:now()},actor); }
export async function getInvoiceEvents(invoiceId) { const e=await loadLocal(KEY.events,[]); return e.filter(x=>x.invoiceId===invoiceId).sort((a,b)=>new Date(a.at)-new Date(b.at)); }
export async function getEvents() { return loadLocal(KEY.events,[]); }
export async function deleteReception(id) { const list=await getInvoices(); await saveLocal(KEY.invoices,list.filter(r=>r.id!==id)); return true; }
export async function completeVerificationLegacy(id,payload){return completeVerification(id,payload);}
export async function findOfficerByPin(pin){return (await getOfficers()).find(o=>String(o.pin)===String(pin))||null;}
export async function syncNow(){ await initializeStore(); return {count:0}; }
export function onSyncEvent(){ return ()=>{}; }
export function getSlaDays(){ return SLA_DAYS; }
export { ageDays };
