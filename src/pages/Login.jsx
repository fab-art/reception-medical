import { useState } from 'react';
import { Card, Button, Field, inputCls } from '../components/UI';
import { loginUser, setSession } from '../lib/auth';
import { findOfficerByPin } from '../lib/db';
import { syncNow } from '../lib/sync';
import logo from '../assets/rssb-logo.png';

const ROLE_TILES = [
  { role: 'reception', label: 'Reception Desk', desc: 'Receive invoices, print receipts, daily reports', icon: '\u2261' },
  { role: 'verification', label: 'Verification Officer', desc: 'View assigned work, submit verification', icon: '\u2713' },
  { role: 'admin', label: 'Admin', desc: 'Officers, assignments, pharmacies, KPIs', icon: '\u2699' },
  { role: 'superadmin', label: 'Super Admin', desc: 'Overall performance & payment tracking', icon: '\u2605' },
];

export default function Login({ onLogin }) {
  const [role, setRole] = useState(null);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f6f9] p-4">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-8">
          <img src={logo} alt="RSSB" className="h-16 w-auto mx-auto mb-3 bg-white rounded-md p-1 shadow-sm" />
          <h1 className="font-display text-2xl font-semibold text-rssb-blue-dark">RSSB Pharmaceutical Invoices Verification Unit</h1>
          <p className="text-sm text-gray-500 mt-1">Select your role to sign in</p>
        </div>

        {!role && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {ROLE_TILES.map((t) => (
              <button
                key={t.role}
                onClick={() => setRole(t.role)}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 text-left hover:border-rssb-blue hover:shadow-md transition-all"
              >
                <div className="w-9 h-9 rounded-lg bg-rssb-blue/10 text-rssb-blue flex items-center justify-center text-lg mb-3">{t.icon}</div>
                <div className="font-semibold text-sm text-gray-800">{t.label}</div>
                <div className="text-xs text-gray-400 mt-1">{t.desc}</div>
              </button>
            ))}
          </div>
        )}

        {role === 'verification' && (
          <PinLoginCard onBack={() => setRole(null)} onLogin={onLogin} />
        )}

        {(role === 'reception' || role === 'admin' || role === 'superadmin') && (
          <CredentialLoginCard role={role} onBack={() => setRole(null)} onLogin={onLogin} />
        )}
      </div>
    </div>
  );
}

function CredentialLoginCard({ role, onBack, onLogin }) {
  const label = { reception: 'Reception Desk', admin: 'Admin', superadmin: 'Super Admin' }[role];
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setChecking(true);
    setError('');
    const user = await loginUser(username, password, role);
    setChecking(false);
    if (!user) return setError('Invalid username or password for this role.');
    const session = { role: user.role, name: user.name, id: user.id, username: user.username };
    setSession(session);
    onLogin(session);
  }

  return (
    <Card className="p-6 max-w-sm mx-auto">
      <button onClick={onBack} className="text-xs text-rssb-blue underline mb-3">&larr; Back to role selection</button>
      <h2 className="font-display font-semibold text-rssb-blue-dark mb-4">{label} Login</h2>
      <form onSubmit={submit}>
        <Field label="Username">
          <input autoFocus className={inputCls} value={username} onChange={(e) => setUsername(e.target.value)} required />
        </Field>
        <Field label="Password">
          <input type="password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        {error && <p className="text-xs text-rose-600 mb-2">{error}</p>}
        <Button type="submit" className="w-full" disabled={checking}>{checking ? 'Checking...' : 'Sign in'}</Button>
      </form>
    </Card>
  );
}

function PinLoginCard({ onBack, onLogin }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setChecking(true);
    setError('');
    await syncNow();
    const found = await findOfficerByPin(pin);
    setChecking(false);
    if (!found) return setError('PIN not recognized. Check with the admin.');
    const session = { role: 'verification', name: found.name, id: found.id, officerRole: found.role };
    setSession(session);
    onLogin(session);
  }

  return (
    <Card className="p-6 max-w-sm mx-auto text-center">
      <button onClick={onBack} className="text-xs text-rssb-blue underline mb-3 block text-left">&larr; Back to role selection</button>
      <h2 className="font-display font-semibold text-rssb-blue-dark mb-1">Verification Officer</h2>
      <p className="text-xs text-gray-500 mb-4">Enter your PIN to see your assigned work.</p>
      <form onSubmit={submit}>
        <input
          type="password"
          inputMode="numeric"
          autoFocus
          className={`${inputCls} text-center text-lg tracking-[0.4em]`}
          placeholder="PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          maxLength={8}
        />
        {error && <p className="text-xs text-rose-600 mt-2">{error}</p>}
        <Button type="submit" className="w-full mt-4" disabled={checking || !pin}>
          {checking ? 'Checking...' : 'Enter'}
        </Button>
      </form>
    </Card>
  );
}
