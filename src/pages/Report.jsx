import { useMemo, useState } from 'react';
import { Card, Button, inputCls } from '../components/UI';
import { formatMoney, toCSV, downloadFile, isSameDay, MONTHS } from '../lib/utils';
import { saveElementAsPdf } from '../lib/pdf';
import logo from '../assets/rssb-logo.png';

const HEADERS = [
  { key: 'no', label: 'No' },
  { key: 'pharmacyCode', label: 'Code Health Facility' },
  { key: 'pharmacyName', label: 'Health Facility' },
  { key: 'category', label: 'Category' },
  { key: 'district', label: 'District' },
  { key: 'periodLabel', label: 'Period' },
  { key: 'receiptNo', label: 'Receipt No' },
  { key: 'officerName', label: 'Assigned officer' },
  { key: 'status', label: 'Status' },
  { key: 'vouchers', label: 'Vouchers' },
  { key: 'amountBilled', label: 'Amount billed' },
  { key: 'receivedByName', label: 'Received by' },
];

export default function Report({ pharmacies, receptions, settings, officers = [] }) {
  const [mode, setMode] = useState('today');
  const [month, setMonth] = useState(MONTHS[new Date().getMonth()]);
  const [year, setYear] = useState(new Date().getFullYear());

  const officerName = (id) => officers.find((o) => o.id === id)?.name || '\u2014';

  const filtered = useMemo(() => {
    if (mode === 'today') return receptions.filter((r) => isSameDay(r.receivedAt));
    return receptions.filter((r) => r.periodMonth === month && r.periodYear === year);
  }, [receptions, mode, month, year]);

  const rows = useMemo(() => filtered
    .slice()
    .sort((a, b) => new Date(a.receivedAt) - new Date(b.receivedAt))
    .map((r, idx) => {
      const pharmacy = pharmacies.find((p) => p.code === r.pharmacyCode);
      return {
        no: idx + 1,
        pharmacyCode: r.pharmacyCode,
        pharmacyName: r.pharmacyName,
        category: pharmacy?.category || 'PHARM',
        district: r.district,
        periodLabel: `${r.periodMonth.slice(0, 3).toLowerCase()}/${String(r.periodYear).slice(2)}`,
        receiptNo: r.receiptNo,
        officerName: officerName(r.assignedOfficerId),
        status: r.status,
        vouchers: r.vouchers,
        amountBilled: r.amountBilled,
        receivedByName: r.receivedByName,
      };
    }), [filtered, pharmacies, officers]);

  const totalVouchers = rows.reduce((s, r) => s + Number(r.vouchers || 0), 0);
  const totalAmount = rows.reduce((s, r) => s + Number(r.amountBilled || 0), 0);

  function handleExportCSV() {
    const csv = toCSV(rows, HEADERS);
    const label = mode === 'today' ? new Date().toISOString().slice(0, 10) : `${month}-${year}`;
    downloadFile(`RSSB_Reception_Report_${label}.csv`, csv, 'text/csv');
  }

  function handleExportPDF() {
    const label = mode === 'today' ? new Date().toISOString().slice(0, 10) : `${month}-${year}`;
    saveElementAsPdf('printable-receipt', `RSSB_Reception_Report_${label}.pdf`);
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl">
      <header className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-3 no-print">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-medium text-rssb-blue-dark">Reception Report</h1>
          <p className="text-sm text-gray-500 mt-1">Pharmaceutical Invoices Verification Unit &mdash; RSSB</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <select className={`${inputCls} !w-auto`} value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="today">Today</option>
            <option value="period">By period</option>
          </select>
          {mode === 'period' && (
            <>
              <select className={`${inputCls} !w-auto`} value={month} onChange={(e) => setMonth(e.target.value)}>
                {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <input type="number" className={`${inputCls} !w-24`} value={year} onChange={(e) => setYear(Number(e.target.value))} />
            </>
          )}
          <Button variant="secondary" onClick={handleExportCSV}>Export CSV</Button>
          <Button variant="secondary" onClick={handleExportPDF}>Save as PDF</Button>
          <Button onClick={() => window.print()}>Print</Button>
        </div>
      </header>

      <div id="printable-receipt" className="bg-white">
        <div className="flex items-center gap-3 mb-4 border-b-2 border-rssb-gold pb-3">
          <img src={logo} alt="RSSB" className="h-12 w-auto" />
          <div>
            <div className="font-semibold text-base text-rssb-blue-dark">Pharmaceutical Invoices Verification Unit</div>
            <div className="text-xs text-gray-500">RECEPTION REPORT &mdash; {mode === 'today' ? 'Daily' : `${month} ${year}`} &middot; RSSB {settings.branch}</div>
          </div>
        </div>
        <Card className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-rssb-blue/5 text-rssb-blue-dark uppercase tracking-wide">
              <tr>
                {HEADERS.map((h) => (
                  <th key={h.key} className="text-left px-3 py-2 whitespace-nowrap">{h.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={r.no}>
                  {HEADERS.map((h) => (
                    <td key={h.key} className="px-3 py-1.5 whitespace-nowrap">
                      {h.key === 'amountBilled' ? formatMoney(r[h.key]) : r[h.key]}
                    </td>
                  ))}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={HEADERS.length} className="text-center py-8 text-gray-400">No records for this selection.</td></tr>
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="font-semibold bg-gray-50">
                  <td colSpan={9} className="px-3 py-2 text-right">TOTAL</td>
                  <td className="px-3 py-2">{totalVouchers}</td>
                  <td className="px-3 py-2">{formatMoney(totalAmount)}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </Card>
      </div>
    </div>
  );
}
