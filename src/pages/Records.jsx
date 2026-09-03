import { useMemo, useState } from 'react';
import { Card, Button, Modal, Field, inputCls } from '../components/UI';
import Receipt from '../components/Receipt';
import ProgressSteps from '../components/ProgressSteps';
import { deleteReception, updateReception } from '../lib/db';
import { formatDateTime, formatMoney, isSameDay } from '../lib/utils';
import { buildAckMailto } from '../lib/mailto';
import { saveElementAsPdf } from '../lib/pdf';

export default function Records({ receptions, setReceptions, settings }) {
  const [scope, setScope] = useState('today');
  const [query, setQuery] = useState('');
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);

  const filtered = useMemo(() => {
    let list = receptions;
    if (scope === 'today') list = list.filter((r) => isSameDay(r.receivedAt));
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((r) => r.pharmacyName.toLowerCase().includes(q) || r.pharmacyCode.includes(q) || r.receiptNo.toLowerCase().includes(q));
    }
    return list;
  }, [receptions, scope, query]);

  async function handleDelete(id) {
    if (!confirm('Delete this reception record? This cannot be undone.')) return;
    await deleteReception(id);
    await setReceptions();
  }

  function handleSendEmail(record) {
    if (!record?.email) return;
    window.location.href = buildAckMailto({ record, settings, toEmail: record.email });
  }

  const totalVouchers = filtered.reduce((s, r) => s + Number(r.vouchers || 0), 0);
  const totalAmount = filtered.reduce((s, r) => s + Number(r.amountBilled || 0), 0);

  return (
    <div className="p-4 md:p-8 max-w-6xl">
      <header className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-semibold text-rssb-blue-dark">Reception Records</h1>
          <p className="text-sm text-gray-500 mt-1">{filtered.length} record(s) &middot; {totalVouchers} vouchers &middot; {formatMoney(totalAmount)} RWF</p>
        </div>
        <div className="flex gap-2">
          <select className={`${inputCls} !w-auto`} value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="today">Today</option>
            <option value="all">All records</option>
          </select>
          <input className={`${inputCls} !w-56`} placeholder="Search pharmacy, code, receipt no." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </header>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-2.5">Receipt</th>
              <th className="text-left px-4 py-2.5">Pharmacy</th>
              <th className="text-left px-4 py-2.5">District</th>
              <th className="text-right px-4 py-2.5">Vouchers</th>
              <th className="text-right px-4 py-2.5">Amount (RWF)</th>
              <th className="text-left px-4 py-2.5">Received</th>
              <th className="text-left px-4 py-2.5">Verification progress</th>
              <th className="text-left px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{r.receiptNo}</td>
                <td className="px-4 py-2.5">
                  <div className="font-medium text-gray-800">{r.pharmacyName}</div>
                  <div className="text-xs text-gray-400">{r.pharmacyCode}</div>
                </td>
                <td className="px-4 py-2.5 text-gray-600">{r.district}</td>
                <td className="px-4 py-2.5 text-right">{r.vouchers}</td>
                <td className="px-4 py-2.5 text-right">{formatMoney(r.amountBilled)}</td>
                <td className="px-4 py-2.5 text-gray-500 text-xs">
                  {formatDateTime(r.receivedAt)}
                  {r.updatedAt && <div className="text-amber-600">edited {formatDateTime(r.updatedAt)}</div>}
                </td>
                <td className="px-4 py-2.5">
                  <ProgressSteps status={r.status} compact />
                </td>
                <td className="px-4 py-2.5 text-right whitespace-nowrap">
                  <button className="text-xs text-rssb-blue underline mr-2 min-h-[44px] inline-block" onClick={() => setViewing(r)}>View</button>
                  <button className="text-xs text-rssb-blue underline mr-2 min-h-[44px] inline-block" onClick={() => setEditing(r)}>Edit</button>
                  <button className="text-xs text-rose-600 underline min-h-[44px] inline-block" onClick={() => handleDelete(r.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="text-center py-8 text-gray-400 text-sm">No records found.</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      <Modal open={!!viewing} onClose={() => setViewing(null)} wide>
        <div className="p-4">
          {viewing && <Receipt record={viewing} settings={settings} />}
          <div className="no-print flex flex-wrap gap-2 mt-4 items-center">
            <Button onClick={() => window.print()}>Print receipt</Button>
            <Button variant="secondary" onClick={() => saveElementAsPdf('printable-receipt', `Receipt-${viewing?.receiptNo}.pdf`)}>Save as PDF</Button>
            {viewing?.email && (
              <Button variant="secondary" onClick={() => handleSendEmail(viewing)}>
                Resend acknowledgement
              </Button>
            )}
          </div>
        </div>
      </Modal>

      <EditModal
        record={editing}
        onClose={() => setEditing(null)}
        onSaved={async () => { setEditing(null); await setReceptions(); }}
      />
    </div>
  );
}

function EditModal({ record, onClose, onSaved }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useMemo(() => {
    if (record) {
      setForm({
        vouchers: record.vouchers,
        amountBilled: record.amountBilled,
        submittedByName: record.submittedByName || '',
        submittedByFunction: record.submittedByFunction || '',
        receivedByName: record.receivedByName || '',
        receivedByFunction: record.receivedByFunction || '',
        email: record.email || '',
      });
    }
  }, [record]);

  if (!record || !form) return null;

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateReception(record.id, {
        vouchers: Number(form.vouchers),
        amountBilled: Number(form.amountBilled),
        submittedByName: form.submittedByName,
        submittedByFunction: form.submittedByFunction,
        receivedByName: form.receivedByName,
        receivedByFunction: form.receivedByFunction,
        email: form.email,
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={!!record} onClose={onClose}>
      <form className="p-5" onSubmit={handleSave}>
        <h3 className="font-semibold text-rssb-blue-dark mb-1">Edit reception</h3>
        <p className="text-xs text-gray-500 mb-4">
          Original fast-entry timestamp ({formatDateTime(record.receivedAt)}) is kept — only the edit time is recorded.
        </p>
        <div className="grid grid-cols-2 gap-x-4">
          <Field label="Number of vouchers">
            <input type="number" min="1" className={inputCls} value={form.vouchers} onChange={(e) => setForm({ ...form, vouchers: e.target.value })} />
          </Field>
          <Field label="Amount billed (RWF)">
            <input type="number" min="1" className={inputCls} value={form.amountBilled} onChange={(e) => setForm({ ...form, amountBilled: e.target.value })} />
          </Field>
          <Field label="Submitted by - Name">
            <input className={inputCls} value={form.submittedByName} onChange={(e) => setForm({ ...form, submittedByName: e.target.value })} />
          </Field>
          <Field label="Submitted by - Function">
            <input className={inputCls} value={form.submittedByFunction} onChange={(e) => setForm({ ...form, submittedByFunction: e.target.value })} />
          </Field>
          <Field label="Received by - Name">
            <input className={inputCls} value={form.receivedByName} onChange={(e) => setForm({ ...form, receivedByName: e.target.value })} />
          </Field>
          <Field label="Received by - Function">
            <input className={inputCls} value={form.receivedByFunction} onChange={(e) => setForm({ ...form, receivedByFunction: e.target.value })} />
          </Field>
          <Field label="Pharmacy email" className="col-span-2">
            <input type="email" className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
        </div>
        <div className="flex gap-2 mt-3">
          <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</Button>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}
