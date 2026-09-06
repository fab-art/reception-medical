import { useMemo, useState } from 'react';
import { Card, Field, inputCls } from '../components/UI';

export default function Facilities({ facilities = [] }) {
  const [q, setQ] = useState('');
  const [district, setDistrict] = useState('all');
  const districts = useMemo(() => [...new Set(facilities.map((f) => f.district))].sort(), [facilities]);

  const rows = useMemo(() => {
    let l = facilities;
    if (district !== 'all') l = l.filter((f) => f.district === district);
    if (q.trim()) { const s = q.toLowerCase(); l = l.filter((f) => f.name.toLowerCase().includes(s) || f.code.includes(s)); }
    return l.slice(0, 400);
  }, [facilities, q, district]);

  return (
    <div className="p-4 md:p-8 max-w-6xl">
      <header className="mb-6">
        <h1 className="font-display text-2xl md:text-3xl font-medium text-rssb-blue-dark">Facility master list</h1>
        <p className="text-sm text-gray-500 mt-1">{facilities.length} registered hospitals, clinics, dental and optical centers.</p>
      </header>
      <Card className="p-4 mb-4">
        <div className="grid md:grid-cols-3 gap-3">
          <Field label="Search"><input className={inputCls} placeholder="Facility name or code" value={q} onChange={(e) => setQ(e.target.value)} /></Field>
          <Field label="District">
            <select className={inputCls} value={district} onChange={(e) => setDistrict(e.target.value)}>
              <option value="all">All districts</option>
              {districts.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </Field>
        </div>
      </Card>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr><th className="text-left px-4 py-2">Code</th><th className="text-left px-4 py-2">Name</th><th className="text-left px-4 py-2">District</th><th className="text-left px-4 py-2">Category</th><th className="text-left px-4 py-2">Type</th><th className="text-left px-4 py-2">Assigned officer</th></tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((f) => (
              <tr key={f.code}>
                <td className="px-4 py-2 font-mono text-xs">{f.code}</td>
                <td className="px-4 py-2 font-medium">{f.name}</td>
                <td className="px-4 py-2">{f.district}</td>
                <td className="px-4 py-2">{f.category}</td>
                <td className="px-4 py-2 text-gray-500">{f.healthType}</td>
                <td className="px-4 py-2 text-gray-500">{f.staff || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {facilities.length > rows.length && <div className="px-4 py-3 text-xs text-gray-400 border-t">Showing {rows.length} of {facilities.length}. Narrow your search to see more.</div>}
      </Card>
    </div>
  );
}
