import { useMemo } from 'react'; import { Card, StatCard } from '../components/UI'; import { IconCheck, IconMoney, IconAlert, IconList } from '../components/Icons'; import { invoiceMetrics } from '../lib/metrics'; import { formatMoney } from '../lib/utils'; import { STAGE_LABELS } from '../lib/workflow'; import { DonutChart, HorizontalBarChart, TrendAreaChart } from '../components/Charts';
export default function SuperAdminDashboard({receptions=[],officers=[],facilities=[]}){
  const m=useMemo(()=>invoiceMetrics(receptions,officers),[receptions,officers]);
  const stageData=useMemo(()=>[
    {name:STAGE_LABELS.hq_reception,value:m.stageCounts.hq_reception},
    {name:STAGE_LABELS.verification,value:m.stageCounts.verification},
    {name:STAGE_LABELS.finance,value:m.stageCounts.finance},
  ],[m]);
  const districts=useMemo(()=>[...new Map(receptions.map(r=>[r.district,r])).keys()].map(d=>{const rs=receptions.filter(r=>r.district===d);const v=rs.filter(r=>r.verifiedAt).length;return{d,n:rs.length,v,rate:rs.length?Math.round(v/rs.length*100):0}}).sort((a,b)=>b.n-a.n).slice(0,10),[receptions]);
  const districtChartData=useMemo(()=>districts.slice(0,8).map(x=>({name:x.d,value:x.n})),[districts]);
  const monthlyTrend=useMemo(()=>{
    const byMonth={};
    for(const r of receptions){
      const key=`${r.periodYear}-${String(r.periodMonth).padStart(2,'0')}`;
      byMonth[key]=byMonth[key]||{label:key,billed:0,count:0};
      byMonth[key].billed+=Number(r.amountBilled||0); byMonth[key].count+=1;
    }
    return Object.values(byMonth).sort((a,b)=>a.label.localeCompare(b.label)).slice(-9);
  },[receptions]);
  return <div className="p-4 md:p-8 max-w-7xl"><header className="mb-6"><h1 className="font-display text-2xl md:text-3xl font-medium text-rssb-blue-dark">Super Admin — Invoice Management KPIs</h1><p className="text-sm text-gray-500 mt-1">Organization-wide visibility from district submission through HQ verification and Finance handoff.</p></header><div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6"><StatCard label="Invoices" value={m.total} sub={`${facilities.length} facilities`} accent="blue" icon={IconList}/><StatCard label="Verified" value={m.verified} sub={`${m.slaRate}% within 15 days`} accent="teal" icon={IconCheck}/><StatCard label="SLA breaches" value={m.overdue} sub="still unverified after 15 days" accent="red" icon={IconAlert}/><StatCard label="Billed" value={formatMoney(m.billed)} sub="RWF" accent="gold" icon={IconMoney}/><StatCard label="Verified value" value={formatMoney(m.verifiedAmount)} sub="RWF" accent="teal" icon={IconCheck}/><StatCard label="Deductions" value={formatMoney(m.deductions)} sub="RWF" accent="gold" icon={IconMoney}/></div>
  <div className="grid lg:grid-cols-3 gap-4 mb-6">
    <DonutChart data={stageData} title="Where work is sitting" sub={`${m.total} total`} />
    <div className="lg:col-span-2"><TrendAreaChart data={monthlyTrend} dataKey="billed" name="Billed" title="Billed amount by period" sub="RWF" money height={240} /></div>
  </div>
  <div className="grid lg:grid-cols-2 gap-4 mb-6">
    <HorizontalBarChart data={districtChartData} dataKey="value" name="Invoices" title="Top districts by volume" color="#0b3d78" />
    <Card className="p-5"><h2 className="font-semibold mb-4">Decision signals</h2><div className="space-y-3 text-sm"><Signal label="15-day target" value={`${m.slaRate}% met`} tone={m.slaRate>=90?'good':'warn'}/><Signal label="Invoices over 15 days" value={m.overdue} tone={m.overdue?'bad':'good'}/><Signal label="Finance handoff" value={m.finance} tone="info"/><Signal label="Open workload" value={m.open.length} tone="info"/></div></Card>
  </div>
  <Card className="overflow-x-auto"><div className="px-4 py-3 border-b font-semibold">District performance</div><table className="w-full text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="text-left px-4 py-2">District</th><th className="text-right px-4 py-2">Invoices</th><th className="text-right px-4 py-2">Verified</th><th className="text-right px-4 py-2">Verification rate</th></tr></thead><tbody className="divide-y">{districts.map(x=><tr key={x.d}><td className="px-4 py-2 font-medium">{x.d}</td><td className="px-4 py-2 text-right">{x.n}</td><td className="px-4 py-2 text-right">{x.v}</td><td className="px-4 py-2 text-right">{x.rate}%</td></tr>)}</tbody></table></Card></div>}
function Signal({label,value,tone}){const cls=tone==='good'?'text-rssb-teal':tone==='bad'?'text-rose-600':tone==='warn'?'text-amber-600':'text-rssb-blue';return <div className="flex justify-between border-b border-gray-100 pb-2"><span className="text-gray-500">{label}</span><b className={cls}>{value}</b></div>}
