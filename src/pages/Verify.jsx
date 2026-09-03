import { useEffect, useState } from 'react';
import { getReceptionById } from '../lib/db';
import { formatMoney, formatDateTime, numberToWords } from '../lib/utils';
import ProgressSteps from '../components/ProgressSteps';
import logo from '../assets/rssb-logo.png';

export default function Verify({ id }) {
  const [state, setState] = useState('loading'); // loading | found | not-found | error
  const [record, setRecord] = useState(null);

  useEffect(() => {
    let alive = true;
    getReceptionById(id)
      .then((r) => {
        if (!alive) return;
        if (r) { setRecord(r); setState('found'); } else { setState('not-found'); }
      })
      .catch(() => alive && setState('error'));
    return () => { alive = false; };
  }, [id]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f6f9] p-4">
      <div className="w-full max-w-md bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4 border-b border-gray-100 pb-4">
          <img src={logo} alt="RSSB" className="h-12 w-auto" />
          <div>
            <div className="font-display font-semibold text-rssb-blue-dark">Receipt Verification</div>
            <div className="text-xs text-gray-400">RSSB Pharmaceutical Invoices Verification Unit</div>
          </div>
        </div>

        {state === 'loading' && <p className="text-sm text-gray-500">Checking receipt&hellip;</p>}

        {state === 'not-found' && (
          <div className="text-sm">
            <div className="inline-flex items-center gap-2 text-rose-600 font-semibold mb-2">
              &#10060; Not a valid receipt
            </div>
            <p className="text-gray-500">No reception record matches this QR code. It may have been deleted, or the code is not genuine.</p>
          </div>
        )}

        {state === 'error' && (
          <p className="text-sm text-rose-600">Could not verify this receipt right now. Check your connection and try again.</p>
        )}

        {state === 'found' && record && (
          <div className="text-sm">
            <div className="inline-flex items-center gap-2 text-rssb-teal font-semibold mb-3">
              &#9989; Genuine RSSB receipt
            </div>
            <ProgressSteps status={record.status} />
            <dl className="space-y-1.5 mt-3">
              <Row label="Receipt No" value={record.receiptNo} />
              <Row label="Pharmacy" value={`${record.pharmacyName} (${record.pharmacyCode})`} />
              <Row label="District" value={record.district} />
              <Row label="Period of bill" value={`${record.periodMonth} ${record.periodYear}`} />
              <Row label="Vouchers" value={record.vouchers} />
              <Row label="Amount billed" value={`${formatMoney(record.amountBilled)} RWF`} />
              <Row label="In letters" value={`${numberToWords(record.amountBilled)} Rwandan Francs`} />
              <Row label="Received by" value={`${record.receivedByName}${record.receivedByFunction ? ' - ' + record.receivedByFunction : ''}`} />
              <Row label="Date & time received" value={formatDateTime(record.receivedAt)} />
              {record.updatedAt && <Row label="Last edited" value={formatDateTime(record.updatedAt)} />}
              <Row label="Status" value={record.status} />
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-3 border-b border-dotted border-gray-200 pb-1">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-800 text-right">{value}</dd>
    </div>
  );
}
