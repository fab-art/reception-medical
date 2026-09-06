import { useMemo, useState } from 'react';
import { Card, inputCls } from '../components/UI';
import WorkflowBadge from '../components/WorkflowBadge';
import { formatMoney } from '../lib/utils';
import { actionableBy, PIPELINE } from '../lib/workflow';

// Scopes the full invoice list down to what this role owns, per the org
// structure: an officer sees their own district's invoices (+ whatever an
// assistant has been handed); a zone supervisor sees every officer in their
// zone; HQ roles see whichever stage of the pipeline they act on.
export function scopeInvoices(invoices, officers, session) {
  const { role, officerId, zone } = session;
  if (role === 'admin' || role === 'superadmin') return invoices;
  if (role === 'district_officer') return invoices.filter((r) => r.assignedOfficerId === officerId || r.assignedAssistantId === officerId);
  if (role === 'hq_assistant') return invoices.filter((r) => r.assignedAssistantId === officerId);
  if (role === 'zone_supervisor') {
    const zoneOfficerIds = new Set(officers.filter((o) => o.zone === zone && o.role === 'district_officer').map((o) => o.id));
    return invoices.filter((r) => zoneOfficerIds.has(r.assignedOfficerId));
  }
  if (role === 'hq_reception') return invoices.filter((r) => ['in_transit_to_hq', 'received_at_hq'].includes(r.status));
  if (role === 'lead_medical_officer') return invoices.filter((r) => ['received_at_hq', 'lead_review', 'returned_by_lead', 'manager_review', 'sent_to_finance', 'payslip_generated', 'payment_order_issued', 'facility_paid'].includes(r.status));
  if (role === 'manager') return invoices.filter((r) => ['manager_review', 'returned_by_manager', 'sent_to_finance', 'payslip_generated', 'payment_order_issued', 'facility_paid'].includes(r.status));
  if (role === 'finance') return invoices.filter((r) => ['sent_to_finance', 'payslip_generated', 'payment_order_issued', 'facility_paid'].includes(r.status));
  return invoices;
}

export default function InvoiceQueue({ invoices, officers, session, open, title, subtitle }) {
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [onlyMine, setOnlyMine] = useState(false);

  const scoped = useMemo(() => scopeInvoices(invoices, officers, session), [invoices, officers, session]);

  const list = useMemo(() => {
    let l = scoped;
    if (onlyMine) l = l.filter((r) => actionableBy(r, session.role));
    if (statusFilter !== 'all') l = l.filter((r) => r.status === statusFilter);
    if (q.trim()) {
      const s = q.toLowerCase();
      l = l.filter((r) => r.receiptNo?.toLowerCase().includes(s) || r.facilityName?.toLowerCase().includes(s) || r.billingId?.toLowerCase().includes(s) || r.district?.toLowerCase().includes(s));
    }
    return l;
  }, [scoped, statusFilter, q, onlyMine, session.role]);

  const actionable = scoped.filter((r) => actionableBy(r, session.role)).length;

  return (
    <div className="p-4 md:p-8 max-w-7xl">
      <header className="mb-5 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-medium text-rssb-blue-dark">{title}</h1>
          <p className="text-sm text-gray-500 mt-1">{subtitle} &middot; {actionable} awaiting your action</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select className={`${inputCls} !w-auto`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            {PIPELINE.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
          <input className={`${inputCls} !w-56`} placeholder="Search invoice, facility, billing ID" value={q} onChange={(e) => setQ(e.target.value)} />
          <button
            onClick={() => setOnlyMine((v) => !v)}
            className={`px-3 py-2 rounded-md text-sm font-medium border cursor-pointer ${onlyMine ? 'bg-rssb-blue text-white border-rssb-blue' : 'bg-white text-gray-600 border-gray-300'}`}
          >
            Needs action
          </button>
        </div>
      </header>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="text-left px-4 py-2">Invoice</th>
              <th className="text-left px-4 py-2">Facility</th>
              <th className="text-left px-4 py-2">District</th>
              <th className="text-left px-4 py-2">Period</th>
              <th className="text-right px-4 py-2">Amount</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {list.slice(0, 300).map((r) => (
              <tr key={r.id} onClick={() => open(r)} className="hover:bg-gray-50 cursor-pointer">
                <td className="px-4 py-2 font-mono text-xs">{r.receiptNo}</td>
                <td className="px-4 py-2 font-medium">{r.facilityName}</td>
                <td className="px-4 py-2">{r.district}</td>
                <td className="px-4 py-2 text-gray-500">{r.periodMonth}</td>
                <td className="px-4 py-2 text-right">{formatMoney(r.amountBilled)}</td>
                <td className="px-4 py-2"><WorkflowBadge status={r.status} small /></td>
                <td className="px-4 py-2 text-gray-400 text-xs">{r.updatedAt ? new Date(r.updatedAt).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan="7" className="py-12 text-center text-gray-400">No invoices match this view.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
