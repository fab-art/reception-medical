import { useMemo, useState } from 'react';
import { Card, Button, StatCard } from '../components/UI';
import { IconReport, IconList, IconMoney, IconCheck } from '../components/Icons';
import { formatMoney } from '../lib/utils';
import { deriveMetrics, statusLabel } from '../lib/workflow';
import { scopeInvoices } from './InvoiceQueue';
import { useToast } from '../lib/toast';

const REPORT_COLUMNS = [
  ['receiptNo', 'Invoice'], ['billingId', 'Billing ID'], ['facilityName', 'Facility'], ['district', 'District'],
  ['periodMonth', 'Period'], ['status', 'Status'], ['amountBilled', 'Amount Billed'], ['amountAfterVerification', 'Amount After Verification'],
  ['deductionAmount', 'Deduction'], ['assignedOfficerName', 'Officer'], ['submittedAt', 'Submitted'], ['verificationEndedAt', 'Verification Ended'],
  ['payslipDate', 'Payslip Date'], ['paidAt', 'Paid At'],
];

function toCsv(rows) {
  const header = REPORT_COLUMNS.map(([, label]) => label).join(',');
  const lines = rows.map((r) => REPORT_COLUMNS.map(([key]) => {
    let v = r[key];
    if (key === 'status') v = statusLabel(v);
    v = v == null ? '' : String(v).replace(/"/g, '""');
    return /[,"\n]/.test(v) ? `"${v}"` : v;
  }).join(','));
  return [header, ...lines].join('\n');
}

const REPORT_TITLES = {
  district_officer: 'My verification report', hq_assistant: 'My assigned-invoice report',
  zone_supervisor: 'Zone performance report', hq_reception: 'HQ transit & archive report',
  lead_medical_officer: 'Lead review report', manager: 'Manager sign-off report',
  finance: 'Payments report', admin: 'Organization-wide report', superadmin: 'Organization-wide report',
};

export default function Reports({ invoices, officers, session }) {
  const [period, setPeriod] = useState('all');
  const toast = useToast();
  const scoped = useMemo(() => scopeInvoices(invoices, officers, session), [invoices, officers, session]);
  const periods = useMemo(() => [...new Set(scoped.map((r) => r.periodMonth).filter(Boolean))].sort(), [scoped]);
  const filtered = useMemo(() => (period === 'all' ? scoped : scoped.filter((r) => r.periodMonth === period)), [scoped, period]);
  const m = useMemo(() => deriveMetrics(filtered), [filtered]);

  function download() {
    if (!filtered.length) { toast('No records in this report yet.', 'error'); return; }
    const csv = toCsv(filtered);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `RSSB_${(session.role)}_report_${period}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast('Report downloaded.');
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <header className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-medium text-rssb-blue-dark">{REPORT_TITLES[session.role] || 'Report'}</h1>
          <p className="text-sm text-gray-500 mt-1">Tailored to what you work on — {filtered.length} invoice{filtered.length === 1 ? '' : 's'} in scope.</p>
        </div>
        <div className="flex gap-2">
          <select className="rounded-md border border-gray-300 px-3 py-2 text-sm" value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="all">All periods</option>
            {periods.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <Button onClick={download}>Download CSV</Button>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Invoices" value={m.total} accent="blue" icon={IconList} />
        <StatCard label="Verified" value={m.verified} sub={`${m.slaRate}% within SLA`} accent="teal" icon={IconCheck} />
        <StatCard label="Billed" value={formatMoney(m.totalBilled)} sub="RWF" accent="gold" icon={IconMoney} />
        <StatCard label="Paid" value={m.paid} sub={formatMoney(m.totalPaid) + ' RWF'} accent="gold" icon={IconReport} />
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>{REPORT_COLUMNS.slice(0, 8).map(([k, label]) => <th key={k} className="text-left px-4 py-2 whitespace-nowrap">{label}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {filtered.slice(0, 200).map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2 font-mono text-xs">{r.receiptNo}</td>
                <td className="px-4 py-2 font-mono text-xs">{r.billingId || '—'}</td>
                <td className="px-4 py-2 font-medium">{r.facilityName}</td>
                <td className="px-4 py-2">{r.district}</td>
                <td className="px-4 py-2 text-gray-500">{r.periodMonth}</td>
                <td className="px-4 py-2">{statusLabel(r.status)}</td>
                <td className="px-4 py-2 text-right">{formatMoney(r.amountBilled)}</td>
                <td className="px-4 py-2 text-right">{r.amountAfterVerification != null ? formatMoney(r.amountAfterVerification) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length > 200 && <div className="px-4 py-3 text-xs text-gray-400 border-t">Showing first 200 of {filtered.length}. Download the CSV for the full report.</div>}
      </Card>
    </div>
  );
}
