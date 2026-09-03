import { useMemo } from 'react';
import { Card, StatCard, Button, ProgressBar } from '../components/UI';
import { IconSun, IconMoney, IconCheck, IconAlert } from '../components/Icons';
import { formatMoney, isSameDay, MONTHS } from '../lib/utils';

export default function Dashboard({ pharmacies, receptions, period, setPeriod, goTo }) {
  const todays = useMemo(() => receptions.filter((r) => isSameDay(r.receivedAt)), [receptions]);

  const periodReceptions = useMemo(
    () => receptions.filter((r) => r.periodMonth === period.month && r.periodYear === period.year),
    [receptions, period]
  );

  const submittedCodesThisPeriod = new Set(periodReceptions.map((r) => r.pharmacyCode));
  const remaining = pharmacies.filter((p) => !submittedCodesThisPeriod.has(p.code));

  const totalVouchersToday = todays.reduce((s, r) => s + Number(r.vouchers || 0), 0);
  const totalAmountToday = todays.reduce((s, r) => s + Number(r.amountBilled || 0), 0);

  const totalVouchersPeriod = periodReceptions.reduce((s, r) => s + Number(r.vouchers || 0), 0);
  const totalAmountPeriod = periodReceptions.reduce((s, r) => s + Number(r.amountBilled || 0), 0);

  const byDistrict = useMemo(() => {
    const map = {};
    for (const p of pharmacies) {
      map[p.district] = map[p.district] || { total: 0, submitted: 0 };
      map[p.district].total++;
      if (submittedCodesThisPeriod.has(p.code)) map[p.district].submitted++;
    }
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [pharmacies, submittedCodesThisPeriod]);

  const pct = pharmacies.length ? Math.round((submittedCodesThisPeriod.size / pharmacies.length) * 100) : 0;

  return (
    <div className="p-4 md:p-8 max-w-6xl">
      <header className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-semibold text-rssb-blue-dark">Reception Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Pharmaceutical Invoices Verification Unit</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="rounded-md border border-gray-300 px-3 py-2 text-sm cursor-pointer"
            value={period.month}
            onChange={(e) => setPeriod((p) => ({ ...p, month: e.target.value }))}
          >
            {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <input
            type="number"
            className="w-24 rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={period.year}
            onChange={(e) => setPeriod((p) => ({ ...p, year: Number(e.target.value) }))}
          />
          <Button onClick={() => goTo('new')}>+ Receive Invoice</Button>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Submitted today" value={todays.length} sub={`${totalVouchersToday} vouchers`} accent="teal" icon={IconSun} />
        <StatCard label="Amount billed today" value={`${formatMoney(totalAmountToday)}`} sub="RWF" accent="gold" icon={IconMoney} />
        <StatCard
          label={`Submitted (${period.month})`}
          value={`${submittedCodesThisPeriod.size} / ${pharmacies.length}`}
          sub={`${pct}% of registered pharmacies`}
          accent="blue"
          icon={IconCheck}
        />
        <StatCard label="Remaining this period" value={remaining.length} sub="pharmacies not yet submitted" accent="red" icon={IconAlert} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm text-gray-700">Remaining pharmacies &mdash; {period.month} {period.year}</h2>
            <span className="text-xs text-gray-400">{remaining.length} left</span>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
            {remaining.length === 0 && (
              <p className="text-sm text-gray-400 py-6 text-center">All registered pharmacies have submitted for this period. \ud83c\udf89</p>
            )}
            {remaining.map((p) => (
              <div key={p.code} className="py-2 flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium text-gray-800">{p.name}</div>
                  <div className="text-xs text-gray-400">{p.code} &middot; {p.district}</div>
                </div>
                <Button variant="secondary" className="!py-1 !px-2 text-xs" onClick={() => goTo('new')}>Receive</Button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm text-gray-700">Coverage by district</h2>
            <span className="text-xs text-gray-400">{period.month} {period.year}</span>
          </div>
          <div className="max-h-80 overflow-y-auto space-y-3">
            {byDistrict.map(([district, stat]) => (
              <div key={district}>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>{district}</span>
                  <span className="font-medium">{stat.submitted}/{stat.total}</span>
                </div>
                <ProgressBar value={stat.submitted} max={stat.total} color="teal" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-4 mt-4">
        <h2 className="font-semibold text-sm text-gray-700 mb-3">Period totals &mdash; {period.month} {period.year}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-gray-400 text-xs">Total vouchers</div>
            <div className="font-display text-xl font-semibold text-rssb-blue">{totalVouchersPeriod}</div>
          </div>
          <div>
            <div className="text-gray-400 text-xs">Total amount billed</div>
            <div className="font-display text-xl font-semibold text-rssb-blue">{formatMoney(totalAmountPeriod)} RWF</div>
          </div>
          <div>
            <div className="text-gray-400 text-xs">Pharmacies submitted</div>
            <div className="font-display text-xl font-semibold text-rssb-blue">{submittedCodesThisPeriod.size}</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
