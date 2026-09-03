import { useMemo, useState } from 'react';
import { Card, Field, inputCls, Button, PinChip, StatusBadge } from '../components/UI';
import { addOfficer, removeOfficer, updateOfficer } from '../lib/db';
import { formatMoney, generatePin } from '../lib/utils';

const ROLE_OPTIONS = [
  { value: 'officer', label: 'Verification Officer', hint: 'Verifies invoices assigned to them.' },
  { value: 'reception', label: 'Reception', hint: 'Logs incoming invoices at the front desk.' },
];

export default function Officers({ officers, setOfficers, receptions }) {
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [roleKind, setRoleKind] = useState('officer');
  const [justCreated, setJustCreated] = useState(null); // { name, pin }

  const workload = useMemo(() => {
    const map = {};
    for (const o of officers) map[o.id] = { count: 0, vouchers: 0, amount: 0, completed: 0, received: 0 };
    for (const r of receptions) {
      if (r.assignedOfficerId && map[r.assignedOfficerId]) {
        map[r.assignedOfficerId].count += 1;
        map[r.assignedOfficerId].vouchers += Number(r.vouchers || 0);
        map[r.assignedOfficerId].amount += Number(r.amountBilled || 0);
        if (r.status === 'verified' || r.status === 'paid') map[r.assignedOfficerId].completed += 1;
      }
      // Reception work this officer personally logged at the desk counts toward their workload.
      if (r.submittedByOfficerId && map[r.submittedByOfficerId]) {
        map[r.submittedByOfficerId].received += 1;
      }
    }
    return map;
  }, [officers, receptions]);

  const unassignedCount = receptions.filter((r) => !r.assignedOfficerId).length;
  const receptionCount = officers.filter((o) => o.isReceptionist).length;

  // Core of the redesigned assignment flow: creating (or re-flagging) a Reception
  // account never asks anyone to type a PIN — one is generated here, shown once,
  // and stored on the officer record so they can log in immediately.
  async function handleAdd(e) {
    e.preventDefault();
    if (!name.trim()) return;
    const pin = generatePin(officers);
    const created = await addOfficer({ name, role: title, isReceptionist: roleKind === 'reception', pin });
    await setOfficers();
    const saved = created.find((o) => o.name === name && o.pin === pin) || { name, pin };
    setJustCreated({ name: saved.name, pin: saved.pin });
    setName(''); setTitle(''); setRoleKind('officer');
  }

  async function handleRemove(id) {
    if (!confirm('Remove this officer? Records already assigned to them stay assigned, but they will no longer appear in the assignment list.')) return;
    await removeOfficer(id);
    await setOfficers();
  }

  async function toggleReceptionist(o) {
    await updateOfficer(o.id, { isReceptionist: !o.isReceptionist });
    await setOfficers();
  }

  async function regeneratePin(o) {
    if (!confirm(`Generate a new PIN for ${o.name}? Their current PIN will stop working immediately.`)) return;
    const pin = generatePin(officers);
    await updateOfficer(o.id, { pin });
    await setOfficers();
    setJustCreated({ name: o.name, pin });
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <header className="mb-6">
        <h1 className="font-display text-2xl md:text-3xl font-medium text-rssb-blue-dark">Officers &amp; Access</h1>
        <p className="text-sm text-gray-500 mt-1">
          Add staff, control who handles reception, and issue their login PIN &mdash; all from one place.
          {unassignedCount > 0 && <span className="text-status-warn font-medium"> {unassignedCount} record(s) currently unassigned.</span>}
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-5 mb-5">
        <Card className="p-5 md:col-span-3">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Add a staff account</h2>
          <p className="text-xs text-gray-400 mb-3">A login PIN is generated automatically &mdash; there's nothing to type or remember up front.</p>
          <form onSubmit={handleAdd}>
            <div className="grid grid-cols-2 gap-x-4">
              <Field label="Full name">
                <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required />
              </Field>
              <Field label="Title (optional)">
                <input className={inputCls} placeholder="e.g. Senior Officer" value={title} onChange={(e) => setTitle(e.target.value)} />
              </Field>
            </div>
            <Field label="Access type">
              <div className="grid grid-cols-2 gap-2">
                {ROLE_OPTIONS.map((opt) => (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => setRoleKind(opt.value)}
                    className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-colors cursor-pointer
                      ${roleKind === opt.value ? 'border-rssb-blue bg-rssb-blue-light text-rssb-blue-dark' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                  >
                    <div className="font-medium">{opt.label}</div>
                    <div className="text-[11px] opacity-70 mt-0.5">{opt.hint}</div>
                  </button>
                ))}
              </div>
            </Field>
            <Button type="submit" className="w-full mt-1">Create account &amp; generate PIN</Button>
          </form>
        </Card>

        <Card className="p-5 md:col-span-2 bg-gradient-to-br from-rssb-blue-light/60 to-white">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Snapshot</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Total staff</span><span className="font-semibold text-rssb-blue-dark">{officers.length}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Reception access</span><span className="font-semibold text-rssb-blue-dark">{receptionCount}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Verification officers</span><span className="font-semibold text-rssb-blue-dark">{officers.length - receptionCount}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Unassigned records</span><span className="font-semibold text-status-warn">{unassignedCount}</span></div>
          </div>
        </Card>
      </div>

      {justCreated && (
        <Card className="p-4 mb-5 border-rssb-teal/30 bg-rssb-teal-light/50 flex flex-wrap items-center justify-between gap-3 animate-fade-in">
          <div>
            <div className="text-sm font-semibold text-rssb-blue-dark">PIN ready for {justCreated.name}</div>
            <div className="text-xs text-gray-500">Share this PIN with them &mdash; entering it on the login screen opens their workspace directly.</div>
          </div>
          <div className="flex items-center gap-2">
            <PinChip pin={justCreated.pin} size="lg" />
            <button className="text-xs text-gray-400 underline min-h-[44px] px-1" onClick={() => setJustCreated(null)}>Dismiss</button>
          </div>
        </Card>
      )}

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-2.5">Staff</th>
              <th className="text-left px-4 py-2.5">Access</th>
              <th className="text-left px-4 py-2.5">Login PIN</th>
              <th className="text-right px-4 py-2.5">Assigned</th>
              <th className="text-right px-4 py-2.5">Completed</th>
              <th className="text-right px-4 py-2.5">Reception logged</th>
              <th className="text-right px-4 py-2.5">Amount (RWF)</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {officers.map((o) => (
              <tr key={o.id} className="hover:bg-gray-50/60">
                <td className="px-4 py-2.5">
                  <div className="font-medium text-gray-800">{o.name}</div>
                  {o.role && <div className="text-xs text-gray-400">{o.role}</div>}
                </td>
                <td className="px-4 py-2.5">
                  <button onClick={() => toggleReceptionist(o)} className="cursor-pointer">
                    <StatusBadge status={o.isReceptionist ? 'assigned' : 'received'} label={o.isReceptionist ? 'Reception' : 'Officer'} />
                  </button>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <PinChip pin={o.pin} size="sm" />
                    <button className="text-[11px] text-rssb-blue underline decoration-dotted min-h-[36px]" onClick={() => regeneratePin(o)}>
                      regenerate
                    </button>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right">{workload[o.id]?.count || 0}</td>
                <td className="px-4 py-2.5 text-right">{workload[o.id]?.completed || 0}</td>
                <td className="px-4 py-2.5 text-right">{workload[o.id]?.received || 0}</td>
                <td className="px-4 py-2.5 text-right">{formatMoney(workload[o.id]?.amount || 0)}</td>
                <td className="px-4 py-2.5 text-right">
                  <button className="text-xs text-rose-600 underline min-h-[44px]" onClick={() => handleRemove(o.id)}>Remove</button>
                </td>
              </tr>
            ))}
            {officers.length === 0 && (
              <tr><td colSpan={8} className="text-center py-8 text-gray-400 text-sm">No officers added yet.</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      <p className="text-xs text-gray-400 mt-3">
        Staff with "Reception" access are taken straight to the Reception desk when they log in with
        their PIN, instead of the verification portal &mdash; and any invoices they receive count toward their workload above.
        Click a PIN to copy it, or "regenerate" to issue a new one if it's been shared too widely.
      </p>
    </div>
  );
}
