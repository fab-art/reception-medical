import { useMemo } from 'react';
import { Card, StatCard } from '../components/UI';
import { IconList, IconCheck, IconAlert, IconMoney } from '../components/Icons';
import { formatMoney } from '../lib/utils';
import { deriveMetrics, officerStats, STAGE_LABELS, STAGES } from '../lib/workflow';
import { scopeInvoices } from './InvoiceQueue';
import { DonutChart, HorizontalBarChart, TrendAreaChart } from '../components/Charts';

export default function Dashboard({ invoices, officers, facilities, session }) {
  const scoped = useMemo(() => scopeInvoices(invoices, officers, session), [invoices, officers, session]);
  const m = useMemo(() => deriveMetrics(scoped), [scoped]);

  const stageData = useMemo(() => STAGES.map((st) => ({ name: STAGE_LABELS[st], value: m.byStage[st] || 0 })).filter((d) => d.value > 0), [m]);

  const trend = useMemo(() => {
    const byMonth = {};
    for (const r of scoped) {
      const key = r.periodMonth || 'Unknown';
      byMonth[key] = byMonth[key] || { label: key, billed: 0, count: 0 };
      byMonth[key].billed += Number(r.amountBilled || 0);
      byMonth[key].count += 1;
    }
    const parse = (label) => {
      const [mon, yr] = String(label).split('-');
      const idx = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(mon);
      return new Date(Number(yr) || 0, idx >= 0 ? idx : 0, 1);
    };
    return Object.values(byMonth).sort((a, b) => parse(a.label) - parse(b.label)).slice(-9);
  }, [scoped]);

  const isOfficerLike = ['district_officer', 'hq_assistant'].includes(session.role);
  const isOversight = ['zone_supervisor', 'admin', 'superadmin'].includes(session.role);

  const officerRows = useMemo(() => {
    if (session.role === 'zone_supervisor') {
      const zoneOfficers = officers.filter((o) => o.zone === session.zone && o.role === 'district_officer');
      return officerStats(invoices, zoneOfficers);
    }
    if (session.role === 'admin' || session.role === 'superadmin') {
      return officerStats(invoices, officers.filter((o) => o.role === 'district_officer')).slice(0, 10);
    }
    return [];
  }, [invoices, officers, session]);

  const districtCoverage = useMemo(() => {
    if (!isOversight) return [];
    const map = {};
    for (const r of scoped) { map[r.district] = (map[r.district] || 0) + 1; }
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));
  }, [scoped, isOversight]);

  return (
    <div className="p-4 md:p-8 max-w-7xl">
      <header className="mb-6">
        <h1 className="font-display text-2xl md:text-3xl font-medium text-rssb-blue-dark">
          {isOfficerLike ? 'My Workload' : session.role === 'zone_supervisor' ? `Zone Overview — ${session.zone}` : 'Dashboard'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {isOfficerLike ? `${session.district || 'District'} verification workload and SLA status.` : 'End-to-end visibility across submission, verification, reconciliation, transit, and payment.'}
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Invoices" value={m.total} sub={isOfficerLike ? (session.district || 'assigned district') : `${facilities?.length ?? ''} facilities in scope`} accent="blue" icon={IconList} />
        <StatCard label="Open" value={m.open} sub="still moving through the pipeline" accent="teal" icon={IconCheck} />
        <StatCard label="Overdue" value={m.overdue} sub={`beyond the SLA window`} accent="red" icon={IconAlert} />
        <StatCard label="Billed" value={formatMoney(m.totalBilled) + ' RWF'} sub="" accent="gold" icon={IconMoney} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <DonutChart data={stageData} title="Where invoices sit" sub={`${m.total} total`} />
        <div className="lg:col-span-2"><TrendAreaChart data={trend} dataKey="billed" name="Billed" title="Billed amount by period" sub="RWF" money height={240} /></div>
      </div>

      {isOversight && (
        <div className="grid lg:grid-cols-2 gap-4 mb-6">
          <HorizontalBarChart data={districtCoverage} dataKey="value" name="Invoices" title="Top districts by volume" color="#0b3d78" />
          <Card className="p-5">
            <h2 className="font-semibold mb-4">Decision signals</h2>
            <div className="space-y-3 text-sm">
              <Signal label="Verification SLA met" value={`${m.slaRate}%`} tone={m.slaRate >= 90 ? 'good' : 'warn'} />
              <Signal label="Overdue verifications" value={m.overdue} tone={m.overdue ? 'bad' : 'good'} />
              <Signal label="Returned for correction" value={m.returned} tone={m.returned ? 'warn' : 'good'} />
              <Signal label="In transit to HQ" value={m.inTransit} tone="info" />
              <Signal label="Facilities paid" value={m.paid} tone="good" />
              <Signal label="Total deductions found" value={formatMoney(m.totalDeduction) + ' RWF'} tone="info" />
            </div>
          </Card>
        </div>
      )}

      {officerRows.length > 0 && (
        <Card className="overflow-x-auto">
          <div className="px-4 py-3 border-b font-semibold text-sm">{session.role === 'zone_supervisor' ? 'Officers in this zone' : 'Officer workload (top 10)'}</div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr><th className="text-left px-4 py-2">Officer</th><th className="text-left px-4 py-2">District</th><th className="text-right px-4 py-2">Open</th><th className="text-right px-4 py-2">Completed</th><th className="text-right px-4 py-2">SLA breaches</th></tr>
            </thead>
            <tbody className="divide-y">
              {officerRows.map((s) => (
                <tr key={s.officer.id}>
                  <td className="px-4 py-2 font-medium">{s.officer.name}</td>
                  <td className="px-4 py-2 text-gray-500">{s.officer.district}</td>
                  <td className="px-4 py-2 text-right">{s.open}</td>
                  <td className="px-4 py-2 text-right">{s.completed}</td>
                  <td className="px-4 py-2 text-right">{s.breaches === 0 ? <span className="text-rssb-teal">On track</span> : <span className="text-rose-600">{s.breaches}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function Signal({ label, value, tone }) {
  const colors = { good: 'text-rssb-teal', warn: 'text-amber-600', bad: 'text-rose-600', info: 'text-rssb-blue' };
  return <div className="flex items-center justify-between"><span className="text-gray-600">{label}</span><span className={`font-semibold ${colors[tone]}`}>{value}</span></div>;
}
