import { useMemo, useState } from 'react';
import { Card, Field, inputCls, Button } from '../components/UI';
import { submitInvoice } from '../lib/db';
import { useToast } from '../lib/toast';
import { MONTHS } from '../lib/utils';

export default function NewSubmission({ facilities = [], session, onDone }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const toast = useToast();
  const now = new Date();
  const [form, setForm] = useState({ periodMonth: `${MONTHS[now.getMonth()]}-${now.getFullYear()}`, vouchers: '', amountBilled: '' });
  const [busy, setBusy] = useState(false);

  const myFacilities = useMemo(() => {
    if (session.role === 'district_officer' && session.district) return facilities.filter((f) => f.district === session.district);
    return facilities;
  }, [facilities, session]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return myFacilities.filter((p) => p.name.toLowerCase().includes(q) || String(p.code).includes(q)).slice(0, 8);
  }, [query, myFacilities]);

  async function submit(e) {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    try {
      await submitInvoice({
        facilityCode: selected.code, facilityName: selected.name, district: selected.district, province: selected.province,
        category: selected.category, periodMonth: form.periodMonth, vouchers: Number(form.vouchers), amountBilled: Number(form.amountBilled),
        assignedOfficerId: session.role === 'district_officer' ? session.officerId : null,
        assignedOfficerName: session.role === 'district_officer' ? session.officerName : selected.staff,
      }, session.officerName || session.role);
      toast('Invoice registered and queued for verification.');
      setSelected(null); setQuery(''); setForm({ ...form, vouchers: '', amountBilled: '' });
      onDone?.();
    } catch (err) {
      toast(err.message || 'Could not save this invoice.', 'error');
    } finally { setBusy(false); }
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-medium text-rssb-blue-dark">Register district submission</h1>
        <p className="text-sm text-gray-500 mt-1">Create one invoice record when a facility's invoice + vouchers arrive at the district office.</p>
      </header>
      <Card className="p-5 mb-4">
        <Field label="Facility / clinic / hospital">
          <input className={inputCls} placeholder="Search name or facility code" value={query} onChange={(e) => { setQuery(e.target.value); setSelected(null); }} />
          {results.length > 0 && !selected && (
            <div className="border rounded-md divide-y mt-2">
              {results.map((p) => (
                <button key={p.code} type="button" className="w-full text-left px-3 py-2 hover:bg-blue-50" onClick={() => { setSelected(p); setQuery(p.name); }}>
                  {p.name}<div className="text-xs text-gray-400">{p.code} · {p.district}</div>
                </button>
              ))}
            </div>
          )}
        </Field>
        {selected && <div className="p-3 bg-blue-50 rounded-md text-sm mb-2 mt-2"><b>{selected.name}</b> · {selected.code} · {selected.district}</div>}
      </Card>
      {selected && (
        <form onSubmit={submit}>
          <Card className="p-5 mb-4">
            <div className="grid md:grid-cols-3 gap-3">
              <Field label="Billing period"><input className={inputCls} value={form.periodMonth} onChange={(e) => setForm({ ...form, periodMonth: e.target.value })} placeholder="e.g. Jun-2026" /></Field>
              <Field label="Number of vouchers"><input type="number" min="1" required className={inputCls} value={form.vouchers} onChange={(e) => setForm({ ...form, vouchers: e.target.value })} /></Field>
              <Field label="Amount billed (RWF)"><input type="number" min="1" required className={inputCls} value={form.amountBilled} onChange={(e) => setForm({ ...form, amountBilled: e.target.value })} /></Field>
            </div>
          </Card>
          <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Submit invoice to district office'}</Button>
        </form>
      )}
    </div>
  );
}
