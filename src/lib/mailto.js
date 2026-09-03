import { formatMoney, formatDateTime } from './utils';

export function buildAckMailto({ record, settings, toEmail }) {
  const subject = `Acknowledgement of Invoice Reception - ${record.pharmacyName} (${record.periodMonth} ${record.periodYear})`;
  const body = [
    `Dear ${record.pharmacyName},`,
    '',
    `This is to confirm that RSSB ${settings.branch} has received your pharmaceutical invoice submission for verification, with the details below:`,
    '',
    `Receipt No: ${record.receiptNo}`,
    `Pharmacy Code: ${record.pharmacyCode}`,
    `District: ${record.district}`,
    `Period of Bill: ${record.periodMonth} ${record.periodYear}`,
    `Bill Number / Provider: ${record.billNumber || 'N/A'}`,
    `Number of Vouchers Submitted: ${record.vouchers}`,
    `Amount Billed (to be verified): ${formatMoney(record.amountBilled)} RWF`,
    `Date & Time of Reception: ${formatDateTime(record.receivedAt)}`,
    `Received by: ${record.receivedByName}${record.receivedByFunction ? ' - ' + record.receivedByFunction : ''}`,
    '',
    'Regards,',
    `Pharmaceutical Invoices Verification Unit`,
    `RSSB ${settings.branch}`,
  ].join('\n');

  const params = new URLSearchParams();
  params.set('subject', subject);
  params.set('body', body);
  const to = encodeURIComponent(toEmail || '');
  return `mailto:${to}?${params.toString().replace(/\+/g, '%20')}`;
}
