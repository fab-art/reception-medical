import { useState } from 'react';
import logo from '../assets/rssb-logo.png';
import { clearSession } from '../lib/auth';
import { IconLogout } from './Icons';

function IconMenu({ open }) {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
    </svg>
  );
}

export default function RoleShell({ roleLabel, nav, view, setView, children }) {
  const [menuOpen, setMenuOpen] = useState(false);

  function logout() {
    clearSession();
    window.location.hash = '';
    window.location.reload();
  }

  return (
    <div className="min-h-full flex flex-col md:flex-row">
      <aside className="no-print bg-gradient-to-b from-rssb-blue to-rssb-blue-dark text-white md:w-64 md:min-h-screen flex md:flex-col md:sticky md:top-0">
        <div className="flex items-center justify-between px-4 py-3 md:py-5 md:px-5 border-b border-white/10 w-full">
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="RSSB" className="h-9 w-auto bg-white rounded-md p-0.5 shadow-sm" />
            <div>
              <div className="font-display text-sm leading-tight tracking-wide">RSSB</div>
              <div className="text-[10px] uppercase tracking-widest text-white/60">{roleLabel}</div>
            </div>
          </div>
          <button className="md:hidden text-white/80 cursor-pointer" onClick={() => setMenuOpen((v) => !v)} aria-label="Toggle menu">
            <IconMenu open={menuOpen} />
          </button>
        </div>
        <nav className={`${menuOpen ? 'flex' : 'hidden'} md:flex flex-col gap-1 px-3 py-3 w-full absolute md:static top-[64px] left-0 bg-rssb-blue-dark md:bg-transparent z-20 md:z-auto`}>
          {nav.map((n) => {
            const Icon = n.icon;
            return (
              <button
                key={n.id}
                onClick={() => { setView(n.id); setMenuOpen(false); }}
                className={`text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2.5 min-h-[44px] cursor-pointer
                  ${view === n.id ? 'bg-white text-rssb-blue-dark shadow-sm' : 'text-white/85 hover:bg-white/10'}`}
              >
                {Icon && <Icon size={17} className="shrink-0 opacity-90" />}
                {n.label}
              </button>
            );
          })}
          <button onClick={logout} className="text-left px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/10 flex items-center gap-2.5 mt-2 border-t border-white/10 pt-3 min-h-[44px] cursor-pointer">
            <IconLogout size={17} className="shrink-0" /> Log out
          </button>
        </nav>
        <div className="hidden md:block mt-auto px-5 py-4 text-[11px] text-white/45 border-t border-white/10">
          Pharmaceutical Invoices<br />Verification Unit
        </div>
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
