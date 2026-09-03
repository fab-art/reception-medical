export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function currentPeriod() {
  const now = new Date();
  return { month: MONTHS[now.getMonth()], year: now.getFullYear() };
}

export function formatMoney(n) {
  const num = Number(n) || 0;
  return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export function formatDateTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Convert a number to English words (simplified, good enough for amounts in RWF)
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function chunkToWords(n) {
  let str = '';
  if (n >= 100) {
    str += ONES[Math.floor(n / 100)] + ' Hundred ';
    n %= 100;
  }
  if (n >= 20) {
    str += TENS[Math.floor(n / 10)] + ' ';
    n %= 10;
  }
  if (n > 0) str += ONES[n] + ' ';
  return str.trim();
}

export function numberToWords(num) {
  num = Math.round(Number(num) || 0);
  if (num === 0) return 'Zero';
  const units = ['', 'Thousand', 'Million', 'Billion'];
  let unitIndex = 0;
  let result = '';
  if (num < 0) { result = 'Negative '; num = Math.abs(num); }
  const parts = [];
  while (num > 0) {
    const chunk = num % 1000;
    if (chunk > 0) {
      parts.unshift(chunkToWords(chunk) + (units[unitIndex] ? ' ' + units[unitIndex] : ''));
    }
    num = Math.floor(num / 1000);
    unitIndex++;
  }
  return result + parts.join(' ').trim();
}

// Generates a random numeric PIN (default 4 digits) that does not collide with
// any PIN already in use. Used to auto-issue reception / officer login PINs
// instead of relying on an admin to type one in by hand.
export function generatePin(existingOfficers = [], length = 4) {
  const taken = new Set(existingOfficers.map((o) => String(o.pin || '')));
  const min = 10 ** (length - 1);
  const max = 10 ** length;
  let pin;
  let attempts = 0;
  do {
    pin = String(Math.floor(min + Math.random() * (max - min)));
    attempts++;
  } while (taken.has(pin) && attempts < 50);
  return pin;
}

export function generateReceiptNo(seq) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `RCT-${y}${m}${d}-${String(seq).padStart(4, '0')}`;
}

export function isSameDay(dateStr, ref = new Date()) {
  const d = new Date(dateStr);
  return d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate();
}

export function toCSV(rows, headers) {
  const escape = (v) => {
    const s = String(v ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const lines = [headers.map(h => escape(h.label)).join(',')];
  for (const row of rows) {
    lines.push(headers.map(h => escape(row[h.key])).join(','));
  }
  return lines.join('\n');
}

export function downloadFile(filename, content, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
