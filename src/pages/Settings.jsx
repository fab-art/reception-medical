import { useState } from 'react';
import { Card, Field, inputCls, Button } from '../components/UI';
import { saveSettings } from '../lib/db';

// Officer/reception PIN management lives entirely on the Officers page now —
// keeping a single place to issue, view, and regenerate PINs avoids the two
// screens drifting out of sync with each other.
export default function Settings({ settings, setSettings, isAdmin, goTo }) {
  const [form, setForm] = useState(settings);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    await saveSettings(form);
    await setSettings();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="p-4 md:p-8 max-w-lg">
      <header className="mb-6">
        <h1 className="font-display text-2xl md:text-3xl font-semibold text-rssb-blue-dark">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Branch details for the receipt, plus console passwords.</p>
      </header>
      <Card className="p-5 mb-5">
        <form onSubmit={handleSubmit}>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Branch details</h2>
          <Field label="RSSB Branch">
            <input className={inputCls} value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} />
          </Field>
          <Field label="Province">
            <input className={inputCls} value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} />
          </Field>
          <Field label="Administrative district">
            <input className={inputCls} value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
          </Field>
          <Field label="Po Box">
            <input className={inputCls} value={form.poBox} onChange={(e) => setForm({ ...form, poBox: e.target.value })} />
          </Field>
          <Field label="Phone number">
            <input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Default receptionist name">
            <input className={inputCls} value={form.receptionistName} onChange={(e) => setForm({ ...form, receptionistName: e.target.value })} />
          </Field>
          <Field label="Default receptionist function">
            <input className={inputCls} value={form.receptionistFunction} onChange={(e) => setForm({ ...form, receptionistFunction: e.target.value })} />
          </Field>

          {isAdmin && (
            <>
              <div className="border-t border-gray-100 my-4 pt-4">
                <h2 className="text-sm font-semibold text-gray-700 mb-1">Console passwords</h2>
                <p className="text-xs text-gray-400 mb-3">
                  Whoever enters this password on the login screen goes straight to that console.
                  There is no separate reception password &mdash; reception access is granted through a
                  generated officer PIN, issued from the <span className="font-medium">Officers</span> page.
                </p>
              </div>
              <Field label="Admin password">
                <input className={inputCls} value={form.adminPassword || ''} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} />
              </Field>
              <Field label="Super admin password">
                <input className={inputCls} value={form.superadminPassword || ''} onChange={(e) => setForm({ ...form, superadminPassword: e.target.value })} />
              </Field>
            </>
          )}

          <Button type="submit">Save settings</Button>
          {saved && <span className="ml-3 text-sm text-rssb-teal">Saved.</span>}
        </form>
      </Card>

      {isAdmin && goTo && (
        <Card className="p-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-700">Manage officer &amp; reception PINs</h2>
            <p className="text-xs text-gray-400 mt-0.5">Create accounts, generate PINs, and control reception access on the Officers page.</p>
          </div>
          <Button variant="secondary" onClick={() => goTo('officers')}>Go to Officers</Button>
        </Card>
      )}
    </div>
  );
}
