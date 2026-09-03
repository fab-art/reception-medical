import { useMemo } from 'react';
import { Card, StatCard } from '../components/UI';
import { IconCheck, IconAlert, IconList, IconMoney } from '../components/Icons';
import { formatMoney } from '../lib/utils';
import { STATUSES, ageDays } from '../lib/workflow';
import { DonutChart, TrendBarChart } from '../components/Charts';
export default function ReceptionDashboard({receptions=[],open}){
 const checking=receptions.filter(r=>[STATUSES.RECEPTION_CHECK,STATUSES.RETURNED_FOR_CORRECTION].includes(r.status));
 const returned=receptions.filter(r=>r.status===STATUSES.RETURNED_FOR_CORRECTION); const ready=receptions.filter(r=>r.status===STATUSES.READY_FOR_ASSIGNMENT); const oldest=[...checking].sort((a,b)=>ageDays(b.submittedToHqAt||b.receivedAt)-ageDays(a.submittedToHqAt||a.receivedAt))[0];
 const queueData=useMemo(()=>[
   {name:'Awaiting check',value:checking.length-returned.length},
   {name:'Returned for correction',value:returned.length},
   {name:'Ready for assignment',value:ready.length},
 ].filter(d=>d.value>0),[checking,returned,ready]);
 const dailyReceived=useMemo(()=>{
   const byDay={};
   for(const r of receptions){
     if(!r.receivedAt) continue;
     const key=new Date(r.receivedAt).toISOString().slice(0,10);
     byDay[key]=(byDay[key]||0)+1;
   }
   return Object.entries(byDay).sort((a,b)=>a[0].localeCompare(b[0])).slice(-14).map(([label,count])=>({label:label.slice(5),count}));
 },[receptions]);
 return <div className="p-4 md:p-8 max-w-7xl"><header className="mb-6"><h1 className="font-display text-2xl md:text-3xl font-medium text-rssb-blue-dark">HQ Reception Control Desk</h1><p className="text-sm text-gray-500 mt-1">Check completeness, correct incomplete records, and release clean invoices for verification.</p></header><div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6"><StatCard label="Awaiting check" value={checking.length} sub="HQ reception queue" accent="blue" icon={IconList}/><StatCard label="Returned for correction" value={returned.length} sub="reception owns these" accent="red" icon={IconAlert}/><StatCard label="Ready for assignment" value={ready.length} sub="can be assigned to verification" accent="teal" icon={IconCheck}/><StatCard label="Billed in queue" value={formatMoney(checking.reduce((s,r)=>s+Number(r.amountBilled||0),0))+' RWF'} sub={oldest?`oldest: ${ageDays(oldest.submittedToHqAt||oldest.receivedAt)} days`:''} accent="gold" icon={IconMoney}/></div>
 <div className="grid lg:grid-cols-3 gap-4 mb-6">
   <DonutChart data={queueData} title="Queue composition" sub={`${checking.length+ready.length} total`} />
   <div className="lg:col-span-2"><TrendBarChart data={dailyReceived} dataKey="count" name="Received" title="Invoices received (last 14 days)" color="#0b3d78" /></div>
 </div>
 <Card className="overflow-x-auto"><div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm">Items requiring reception action</div><table className="w-full text-sm"><thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr><th className="text-left px-4 py-2">Invoice</th><th className="text-left px-4 py-2">Facility</th><th className="text-left px-4 py-2">Received HQ</th><th className="text-right px-4 py-2">Amount</th><th className="text-left px-4 py-2">Issue</th><th></th></tr></thead><tbody className="divide-y divide-gray-100">{checking.slice(0,25).map(r=><tr key={r.id}><td className="px-4 py-2 font-mono text-xs">{r.receiptNo}</td><td className="px-4 py-2 font-medium">{r.facilityName}</td><td className="px-4 py-2 text-gray-500">{new Date(r.submittedToHqAt||r.receivedAt).toLocaleDateString()}</td><td className="px-4 py-2 text-right">{formatMoney(r.amountBilled)}</td><td className="px-4 py-2">{r.correctionReason||'Completeness check required'}</td><td className="px-4 py-2 text-right"><button className="text-rssb-blue text-xs underline" onClick={()=>open(r)}>Open</button></td></tr>)}</tbody></table></Card></div>
}
