import { useMemo, useState } from 'react';
import { Card, Field, inputCls, Button, Modal } from '../components/UI';
import { ROLE_LABELS } from '../lib/auth';
import { addOfficer, updateOfficer, removeOfficer } from '../lib/db';
import { useToast } from '../lib/toast';

const ROLES = ['district_officer', 'zone_supervisor', 'hq_assistant', 'hq_reception', 'lead_medical_officer', 'manager', 'finance'];
const ZONES = ['Kigali City Zone', 'Northern Zone', 'Southern Zone', 'Eastern Zone', 'Western Zone'];

export default function Officers({ officers = [], invoices = [], onChanged }) {
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const toast = useToast();

  const rows = useMemo(() => {
    let l = officers;
    if (q.trim()) { const s = q.toLowerCase(); l = l.filter((o) => o.name.toLowerCase().includes(s) || (o.district || '').toLowerCase().includes(s)); }
    return l.slice().sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name));
  }, [officers, q]);

  function workloadFor(o) {
    return invoices.filter((r) => r.assignedOfficerId === o.id || r.assignedAssistantId === o.id).length;
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl">
      <header className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-medium text-rssb-blue-dark">Officers & staff</h1>
          <p className="text-sm text-gray-500 mt-1">{officers.length} active accounts across districts, zones, and HQ.</p>
        </div>
        <Button onClick={() => setCreating(true)}>Add officer</Button>
      </header>

      <input className={`${inputCls} !w-72 mb-4`} placeholder="Search name or district" value={q} onChange={(e) => setQ(e.target.value)} />

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="text-left px-4 py-2">Name</th><th className="text-left px-4 py-2">Role</th>
              <th className="text-left px-4 py-2">District / Zone</th><th className="text-right px-4 py-2">Current invoices</th>
              <th className="text-left px-4 py-2">PIN</th><th></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((o) => (
              <tr key={o.id}>
                <td className="px-4 py-2 font-medium">{o.name}</td>
                <td className="px-4 py-2">{ROLE_LABELS[o.role] || o.role}</td>
                <td className="px-4 py-2 text-gray-500">{o.district || o.zone || '—'}</td>
                <td className="px-4 py-2 text-right">{workloadFor(o)}</td>
                <td className="px-4 py-2 font-mono text-xs">{o.pin}</td>
                <td className="px-4 py-2 text-right"><button className="text-rssb-blue text-xs underline" onClick={() => setEditing(o)}>Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {(editing || creating) && (
        <OfficerModal officer={editing} onClose={() => { setEditing(null); setCreating(false); }} onSaved={async () => { await onChanged?.(); toast('Officer saved.'); setEditing(null); setCreating(false); }} />
      )}
    </div>
  );
}

function OfficerModal({ officer, onClose, onSaved }) {
  const [form, setForm] = useState(officer || { name: '', role: 'district_officer', district: '', zone: '', pin: String(1000 + Math.floor(Math.random() * 9000)) });
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function save() {
    setBusy(true);
    try {
      if (officer) await updateOfficer(officer.id, form);
      else await addOfficer({ ...form, assignedFacilityCodes: [], workloadByPeriod: {}, isReceptionist: form.role === 'hq_reception', isDistrictOfficer: form.role === 'district_officer' });
      await onSaved();
    } catch (e) { toast(e.message || 'Could not save.', 'error'); }
    finally { setBusy(false); }
  }
  async function deactivate() {
    if (!officer) return;
    setBusy(true);
    try { await removeOfficer(officer.id); await onSaved(); } finally { setBusy(false); }
  }

  return (
    <Modal open onClose={onClose}>
      <div className="p-6">
        <h2 className="font-display text-lg font-medium text-rssb-blue-dark mb-4">{officer ? 'Edit officer' : 'Add officer'}</h2>
        <div className="space-y-3">
        <Field label="Full name"><input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Role">
          <select className={inputCls} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {ROLES.map((r) => <option key={r} value={r}>{r.replaceAll('_', ' ')}</option>)}
          </select>
        </Field>
        {form.role === 'district_officer' && <Field label="District"><input className={inputCls} value={form.district || ''} onChange={(e) => setForm({ ...form, district: e.target.value })} /></Field>}
        {(form.role === 'district_officer' || form.role === 'zone_supervisor') && (
          <Field label="Zone">
            <select className={inputCls} value={form.zone || ''} onChange={(e) => setForm({ ...form, zone: e.target.value })}>
              <option value="">—</option>
              {ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
            </select>
          </Field>
        )}
        <Field label="Login PIN"><input className={inputCls} value={form.pin || ''} onChange={(e) => setForm({ ...form, pin: e.target.value })} /></Field>
        <div className="flex justify-between pt-2">
          {officer && <Button variant="danger" disabled={busy} onClick={deactivate}>Deactivate</Button>}
          <div className="flex gap-2 ml-auto">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button disabled={busy || !form.name} onClick={save}>{busy ? 'Saving…' : 'Save'}</Button>
          </div>
        </div>
        </div>
      </div>
    </Modal>
  );
}
