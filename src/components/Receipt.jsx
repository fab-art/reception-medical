import { useEffect, useState } from 'react';
import { formatMoney, formatDateTime, numberToWords } from '../lib/utils';
import { makeQrDataUrl } from '../lib/qr';
import logo from '../assets/rssb-logo.png';

export default function Receipt({ record, settings }) {
  const [qr, setQr] = useState('');

  useEffect(() => {
    let alive = true;
    if (record?.id) {
      makeQrDataUrl(record.id).then((url) => { if (alive) setQr(url); }).catch(() => {});
    }
    return () => { alive = false; };
  }, [record?.id]);

  if (!record) return null;

  return (
    <div id="printable-receipt" className="bg-white text-[#111] p-6 border-2 border-rssb-blue max-w-[720px] mx-auto font-body text-sm">
      <div className="flex items-start justify-between border-b-2 border-rssb-gold pb-3 mb-3">
        <div className="flex items-center gap-3">
          <img src={logo} alt="RSSB" className="h-14 w-auto" />
          <div className="text-[10px] leading-tight text-rssb-blue-dark font-semibold uppercase">
            Rwanda Social Security Board<br />
            <span className="font-normal normal-case text-gray-500">Our Health, Our Future</span>
          </div>
        </div>
        <div className="text-right text-[10px] text-gray-500">
          Receipt No.<br /><span className="font-semibold text-[12px] text-black">{record.receiptNo}</span>
          {record.updatedAt && (
            <div className="mt-1 text-[9px] text-amber-600 font-semibold">Edited {formatDateTime(record.updatedAt)}</div>
          )}
        </div>
      </div>

      <h1 className="text-center font-bold underline text-base mb-4 tracking-wide text-rssb-blue-dark">
        ACKNOWLEDGEMENT RECEIPT OF INVOICES
      </h1>

      <div className="grid grid-cols-2 gap-x-6 mb-3 text-[13px]">
        <div className="space-y-1">
          <Row label="RSSB BRANCH" value={settings.branch} bold />
          <Row label="PROVINCE" value={settings.province} bold />
          <Row label="ADMINISTRATIVE DISTRICT" value={settings.district} bold />
        </div>
        <div className="space-y-1">
          <Row label="Po Box" value={settings.poBox} />
          <Row label="Phone Number" value={settings.phone} />
        </div>
      </div>

      <div className="space-y-1 mb-3 text-[13px]">
        <Row label="NAME OF PHARMACY" value={record.pharmacyName} bold />
        <Row label="PHARMACY CODE" value={record.pharmacyCode} bold />
        <Row label="DISTRICT" value={record.district} bold />
        <Row label="PERIOD OF BILL" value={`${record.periodMonth} ${record.periodYear}`} bold />
      </div>

      <div className="mb-3 text-[13px] border-t border-b border-gray-400 py-2 space-y-1">
        <div className="font-bold">AMOUNT BILLED:</div>
        <Row label="IN NUMBERS" value={`${formatMoney(record.amountBilled)} RWF`} bold />
        <Row label="IN LETTERS" value={`${numberToWords(record.amountBilled)} Rwandan Francs`} />
        <Row label="NUMBER OF VOUCHERS" value={record.vouchers} bold />
      </div>

      <div className="grid grid-cols-2 gap-6 mt-4 text-[13px]">
        <div>
          <div className="font-bold underline mb-1 text-rssb-blue-dark">FOR SUBMISSION</div>
          <Row label="NAMES" value={record.submittedByName} />
          <Row label="Function" value={record.submittedByFunction} />
          <Row label="Date" value={formatDateTime(record.receivedAt)} />
          <Row label="Signature" value="" />
        </div>
        <div>
          <div className="font-bold underline mb-1 text-rssb-blue-dark">VISA FOR THE RECEPTION</div>
          <Row label="NAMES" value={record.receivedByName} />
          <Row label="Function" value={record.receivedByFunction} />
          <Row label="Date" value={formatDateTime(record.receivedAt)} />
          <Row label="Signature" value="" />
        </div>
      </div>

      <div className="mt-5 pt-3 border-t border-gray-300 flex items-end justify-between">
        <div className="text-[9px] text-gray-400">
          RSSB {settings.branch} &middot; Pharmaceutical Invoices Verification Unit
        </div>
        {qr && (
          <div className="flex flex-col items-center">
            <img src={qr} alt="Scan to verify" className="w-16 h-16" />
            <span className="text-[8px] text-gray-400 mt-0.5">Scan to verify</span>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div className="flex gap-1">
      <span className={bold ? 'font-semibold' : ''}>{label}:</span>
      <span className="flex-1 border-b border-dotted border-gray-500 px-1">{value ?? ''}</span>
    </div>
  );
}
