import QRCode from 'qrcode';

// Builds the public verification URL encoded in the receipt's QR code.
// Scanning it opens this same app on the #/verify/:id route, which looks the
// record up live from Supabase and displays its details (feature 4).
export function verifyUrl(receptionId) {
  const base = window.location.origin + window.location.pathname.replace(/index\.html$/, '');
  return `${base}#/verify/${receptionId}`;
}

export async function makeQrDataUrl(receptionId) {
  const url = verifyUrl(receptionId);
  return QRCode.toDataURL(url, { margin: 1, width: 160, color: { dark: '#0b3d78', light: '#ffffff' } });
}
