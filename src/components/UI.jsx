import { useState } from 'react';
import { IconCheck } from './Icons';

function IconCopy({ size = 14, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </svg>
  );
}

export function Card({ children, className = '', hover = false }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200/80 card-shadow ${hover ? 'transition-shadow hover:shadow-[var(--shadow-card-hover)]' : ''} ${className}`}>
      {children}
    </div>
  );
}

const STAT_ACCENTS = {
  blue: { text: 'text-rssb-blue', bg: 'bg-rssb-blue-light', ring: 'ring-rssb-blue/10' },
  teal: { text: 'text-rssb-teal', bg: 'bg-rssb-teal-light', ring: 'ring-rssb-teal/10' },
  gold: { text: 'text-amber-700', bg: 'bg-rssb-gold-light', ring: 'ring-amber-500/10' },
  red: { text: 'text-rose-700', bg: 'bg-status-danger-bg', ring: 'ring-rose-500/10' },
};

export function StatCard({ label, value, sub, accent = 'blue', icon: Icon, trend }) {
  const a = STAT_ACCENTS[accent] || STAT_ACCENTS.blue;
  return (
    <Card className="p-4" hover>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-1 truncate">{label}</div>
          <div className={`font-display text-2xl md:text-3xl font-semibold leading-tight ${a.text}`}>{value}</div>
          {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
        </div>
        {Icon && (
          <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${a.bg} ${a.text} ring-1 ${a.ring}`}>
            <Icon size={18} />
          </div>
        )}
      </div>
      {trend != null && (
        <div className={`mt-2 text-[11px] font-medium ${trend >= 0 ? 'text-rssb-teal' : 'text-rose-600'}`}>
          {trend >= 0 ? '\u2191' : '\u2193'} {Math.abs(trend)}% vs last period
        </div>
      )}
    </Card>
  );
}

const STATUS_STYLES = {
  submitted_to_hq: 'bg-status-info-bg text-status-info',
  reception_check: 'bg-status-warn-bg text-status-warn',
  returned_for_correction: 'bg-status-danger-bg text-status-danger',
  ready_for_assignment: 'bg-rssb-teal-light text-rssb-teal',
  assigned: 'bg-status-warn-bg text-status-warn',
  verification_ongoing: 'bg-rssb-blue-light text-rssb-blue',
  verified: 'bg-status-success-bg text-status-success',
  sent_to_finance: 'bg-rssb-blue-light text-rssb-blue',
  paid: 'bg-rssb-blue-light text-rssb-blue',
  default: 'bg-status-neutral-bg text-status-neutral',
};

export function StatusBadge({ status, label }) {
  const cls = STATUS_STYLES[status] || STATUS_STYLES.default;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${cls}`}>
      {label || status}
    </span>
  );
}

export function ProgressBar({ value = 0, max = 100, color = 'teal', height = 'h-2' }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const colors = { teal: 'bg-rssb-teal', blue: 'bg-rssb-blue', gold: 'bg-amber-500', red: 'bg-rose-500' };
  return (
    <div className={`w-full rounded-full bg-gray-100 overflow-hidden ${height}`}>
      <div className={`h-full rounded-full ${colors[color] || colors.teal} transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Modal({ open, onClose, children, wide }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center bg-black/40 backdrop-blur-[2px] p-3 overflow-y-auto">
      <div className={`bg-white rounded-xl shadow-xl w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} my-6 relative animate-fade-in`}>
        <button
          onClick={onClose}
          className="no-print absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-xl leading-none cursor-pointer"
          aria-label="Close"
        >
          &times;
        </button>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children, hint }) {
  return (
    <label className="block mb-3">
      <span className="block text-xs font-medium text-gray-600 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-gray-400 mt-0.5">{hint}</span>}
    </label>
  );
}

export const inputCls = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rssb-blue/40 focus:border-rssb-blue transition-shadow';

export function Button({ children, variant = 'primary', className = '', ...props }) {
  const variants = {
    primary: 'bg-rssb-blue text-white hover:bg-rssb-blue-dark shadow-sm',
    secondary: 'bg-white text-rssb-blue border border-rssb-blue/30 hover:bg-rssb-blue-light',
    ghost: 'text-gray-600 hover:bg-gray-100',
    danger: 'bg-rose-600 text-white hover:bg-rose-700',
    success: 'bg-rssb-teal text-white hover:bg-rssb-teal/90',
  };
  return (
    <button
      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

// A tappable, monospaced PIN chip with copy-to-clipboard feedback.
// Used anywhere a generated reception/officer PIN needs to be revealed and shared.
export function PinChip({ pin, size = 'md' }) {
  const [copied, setCopied] = useState(false);
  if (!pin) return <span className="text-xs text-gray-400 italic">no PIN set</span>;

  async function copy() {
    try {
      await navigator.clipboard.writeText(String(pin));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — silently ignore, chip still shows the PIN visually
    }
  }

  const sizes = { sm: 'text-xs px-2 py-1', md: 'text-sm px-3 py-1.5', lg: 'text-lg px-4 py-2.5' };

  return (
    <button
      type="button"
      onClick={copy}
      title="Click to copy"
      className={`font-mono-tight font-semibold rounded-md bg-rssb-blue-light text-rssb-blue-dark border border-rssb-blue/15 hover:border-rssb-blue/40 cursor-pointer transition-colors ${sizes[size]}`}
    >
      {pin}{' '}
      <span className="opacity-60 ml-1 inline-flex items-center gap-1 align-middle">
        {copied ? <><IconCheck size={12} /> copied</> : <IconCopy />}
      </span>
    </button>
  );
}
