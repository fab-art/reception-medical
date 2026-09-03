import { formatMoney, formatDateTime } from './utils';

export function buildAckEmail({ record, settings }) {
  const subject = `Acknowledgement of Invoice Reception - ${record.pharmacyName} (${record.periodMonth} ${record.periodYear})`;

  const rows = [
    ['Receipt No', record.receiptNo],
    ['Pharmacy Code', record.pharmacyCode],
    ['District', record.district],
    ['Period of Bill', `${record.periodMonth} ${record.periodYear}`],
    ['Bill Number / Provider', record.billNumber || 'N/A'],
    ['Number of Vouchers Submitted', record.vouchers],
    ['Amount Billed (to be verified)', `${formatMoney(record.amountBilled)} RWF`],
    ['Date & Time of Reception', formatDateTime(record.receivedAt)],
    ['Received by', `${record.receivedByName}${record.receivedByFunction ? ' - ' + record.receivedByFunction : ''}`],
  ];

  const text = [
    `Dear ${record.pharmacyName},`,
    '',
    `This is to confirm that RSSB ${settings.branch} has received your pharmaceutical invoice submission for verification, with the details below:`,
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    'Regards,',
    'Pharmaceutical Invoices Verification Unit',
    `RSSB ${settings.branch}`,
  ].join('\n');

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#10233f;max-width:520px">
      <p>Dear <strong>${record.pharmacyName}</strong>,</p>
      <p>This is to confirm that RSSB ${settings.branch} has received your pharmaceutical invoice submission for verification, with the details below:</p>
      <table style="border-collapse:collapse;width:100%;font-size:13px">
        ${rows.map(([label, value]) => `
          <tr>
            <td style="padding:4px 8px 4px 0;color:#5b6b82;white-space:nowrap">${label}</td>
            <td style="padding:4px 0;font-weight:600">${value}</td>
          </tr>`).join('')}
      </table>
      <p style="margin-top:16px">Regards,<br/>Pharmaceutical Invoices Verification Unit<br/>RSSB ${settings.branch}</p>
    </div>
  `;

  return { subject, text, html };
}

// Calls the /api/send-email Vercel function (Resend). Throws on failure so callers can show an error.
export async function sendAckEmail({ record, settings, toEmail }) {
  const { subject, text, html } = buildAckEmail({ record, settings });
  const res = await fetch('/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: toEmail, subject, text, html }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to send email.');
  return data;
}
