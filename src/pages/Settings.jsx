import { useState } from 'react';
import { Card, Field, inputCls, Button } from '../components/UI';
import { saveSettings } from '../lib/db';
import { useToast } from '../lib/toast';

export default function Settings({ settings, onChanged }) {
  const [form, setForm] = useState(settings);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try { await saveSettings(form); await onChanged?.(); toast('Settings saved.'); }
    catch (err) { toast(err.message || 'Could not save settings.', 'error'); }
    finally { setBusy(false); }
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-medium text-rssb-blue-dark">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Branch details and shared admin credentials.</p>
      </header>
      <form onSubmit={save}>
        <Card className="p-5 mb-4 space-y-3">
          <Field label="Branch / unit name"><input className={inputCls} value={form.branch || ''} onChange={(e) => setForm({ ...form, branch: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Province"><input className={inputCls} value={form.province || ''} onChange={(e) => setForm({ ...form, province: e.target.value })} /></Field>
            <Field label="District"><input className={inputCls} value={form.district || ''} onChange={(e) => setForm({ ...form, district: e.target.value })} /></Field>
          </div>
          <Field label="Verification SLA (days)"><input type="number" className={inputCls} value={form.verificationSlaDays || 15} onChange={(e) => setForm({ ...form, verificationSlaDays: Number(e.target.value) })} /></Field>
        </Card>
        <Card className="p-5 mb-4 space-y-3">
          <h2 className="font-semibold text-sm text-gray-700">Shared oversight logins</h2>
          <Field label="Admin password"><input className={inputCls} value={form.adminPassword || ''} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} /></Field>
          <Field label="Super admin password"><input className={inputCls} value={form.superadminPassword || ''} onChange={(e) => setForm({ ...form, superadminPassword: e.target.value })} /></Field>
          <p className="text-xs text-gray-400">Individual staff (district officers, zone supervisors, HQ roles) sign in with their personal PIN from the Officers page, not with these.</p>
        </Card>
        <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</Button>
      </form>
    </div>
  );
}
