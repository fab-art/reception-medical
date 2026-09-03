import { SLA_DAYS, STATUSES, ageDays, slaInfo, currentStage } from './workflow';
export function invoiceMetrics(records, officers=[]){
 const total=records.length;
 const verified=records.filter(r=>r.verifiedAt);
 const paid=records.filter(r=>r.status===STATUSES.PAID);
 const finance=records.filter(r=>[STATUSES.SENT_TO_FINANCE,STATUSES.PAID].includes(r.status));
 const open=records.filter(r=>!r.verifiedAt || [STATUSES.VERIFICATION_COMPLETE].includes(r.status));
 const onTime=verified.filter(r=>ageDays(r.submittedToHQAt||r.receivedAt,r.verifiedAt)<=SLA_DAYS);
 const overdue=records.filter(r=>!r.verifiedAt && ageDays(r.submittedToHQAt||r.receivedAt)>SLA_DAYS);
 const billed=records.reduce((s,r)=>s+Number(r.amountBilled||0),0);
 const verifiedAmount=verified.reduce((s,r)=>s+Number(r.verifiedAmount||0),0);
 const deductions=verified.reduce((s,r)=>s+Number(r.deductionAmount||0),0);
 const paidAmount=paid.reduce((s,r)=>s+Number(r.amountToPay||0),0);
 const stageCounts={hq_reception:0,verification:0,finance:0}; records.forEach(r=>stageCounts[currentStage(r.status)]++);
 const officerStats=officers.filter(o=>o.active!==false&&!o.isReceptionist&&!o.isDistrictOfficer).map(o=>{
   const mine=records.filter(r=>r.assignedOfficerId===o.id); const done=mine.filter(r=>r.verifiedAt); const vouchers=mine.reduce((s,r)=>s+Number(r.vouchers||0),0); const doneV=mine.filter(r=>r.verifiedAt).reduce((s,r)=>s+Number(r.vouchersDone||0),0); const breaches=done.filter(r=>ageDays(r.submittedToHQAt||r.receivedAt,r.verifiedAt)>SLA_DAYS).length;
   const avg=done.length?done.reduce((s,r)=>s+(new Date(r.verifiedAt)-new Date(r.verificationStartedAt||r.assignedAt||r.submittedToHQAt))/3600000,0)/done.length:null;
   return {officer:o,assigned:mine.length,completed:done.length,pending:mine.length-done.length,completionRate:mine.length?Math.round(done.length/mine.length*100):0,vouchers,doneV,voucherRate:vouchers?Math.round(doneV/vouchers*100):0,breaches,avg};
 }).sort((a,b)=>b.pending-a.pending);
 return {total,verified:verified.length,paid:paid.length,finance:finance.length,open,overdue:overdue.length,onTime:onTime.length,slaRate:verified.length?Math.round(onTime.length/verified.length*100):0,billed,verifiedAmount,deductions,paidAmount,stageCounts,officerStats};
}
