import { useState } from 'react';
import { Button, Field, inputCls } from '../components/UI';
import { resolveLogin, setSession } from '../lib/auth';
import { getOfficers, getSettings } from '../lib/db';
import { supabaseConfigured } from '../lib/supabase';
import logo from '../assets/rssb-logo.png';

export default function Landing() {
  const [v, setV] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    const [s, o] = await Promise.all([getSettings(), getOfficers()]);
    const session = resolveLogin(v, s, o);
    if (!session) setErr('That password or PIN was not recognized.');
    else { setSession(session); location.reload(); }
    setBusy(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#eef1f6] to-rssb-blue-light p-4">
      <div className="w-full max-w-md">
        {!supabaseConfigured && (
          <div className="mb-4 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
            Running in local-only mode: Supabase isn't connected. Data entered now stays on this device only. See DEPLOY.md.
          </div>
        )}
        <div className="text-center mb-8">
          <img src={logo} className="h-16 mx-auto mb-3" alt="RSSB" />
          <h1 className="font-display text-2xl font-medium text-rssb-blue-dark">Medical Invoice Workflow System</h1>
          <p className="text-sm text-gray-500 mt-1">District submission → verification → reconciliation → HQ → finance</p>
        </div>
        <form onSubmit={submit} className="bg-white p-6 rounded-2xl shadow-lg border">
          <Field label="Password or PIN">
            <input autoFocus type="password" className={`${inputCls} text-center text-lg tracking-widest`} value={v} onChange={(e) => setV(e.target.value)} placeholder="Enter password or PIN" />
          </Field>
          {err && <div className="text-sm text-rose-600 bg-rose-50 p-2 rounded mb-3">{err}</div>}
          <Button className="w-full" disabled={busy || !v}>{busy ? 'Signing in…' : 'Continue'}</Button>
        </form>
        <div className="mt-5 text-xs text-gray-400 text-center">Forgot your password or PIN? Contact your system administrator.</div>
      </div>
    </div>
  );
}
