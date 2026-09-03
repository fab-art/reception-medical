import { useMemo, useState } from 'react';
import Papa from 'papaparse';
import { Card, Button, Modal, Field, inputCls } from '../components/UI';
import { upsertPharmacy, importPharmacies } from '../lib/db';

const EMPTY = { code: '', name: '', category: 'PHARM', district: '', province: '', phone: '', poBox: '', email: '' };

export default function PharmacyList({ pharmacies, setPharmacies }) {
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importPreview, setImportPreview] = useState([]);
  const [importError, setImportError] = useState('');
  const [importing, setImporting] = useState(false);

  const filtered = useMemo(() => {
    if (!query.trim()) return pharmacies;
    const q = query.toLowerCase();
    return pharmacies.filter((p) => (p.name || '').toLowerCase().includes(q) || (p.code || '').includes(q) || (p.district || '').toLowerCase().includes(q));
  }, [pharmacies, query]);

  async function handleSave(e) {
    e.preventDefault();
    if (!editing.code || !editing.name || !editing.district) return;
    await upsertPharmacy(editing);
    await setPharmacies();
    setEditing(null);
  }

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data.map((row) => normalizeRow(row)).filter((r) => r.code && r.name);
        if (rows.length === 0) {
          setImportError('No valid rows found. Make sure the file has columns: code, name, district, province, phone, poBox, email, category.');
          return;
        }
        setImportPreview(rows);
      },
      error: (err) => setImportError(err.message),
    });
    e.target.value = '';
  }

  function normalizeRow(row) {
    const get = (...keys) => {
      for (const k of keys) {
        const found = Object.keys(row).find((rk) => rk.trim().toLowerCase() === k);
        if (found && row[found]) return String(row[found]).trim();
      }
      return '';
    };
    return {
      code: get('code', 'pharmacy code', 'pharmacycode'),
      name: get('name', 'pharmacy name', 'pharmacyname'),
      category: get('category') || 'PHARM',
      district: get('district'),
      province: get('province'),
      phone: get('phone', 'phone number'),
      poBox: get('pobox', 'po box'),
      email: get('email'),
    };
  }

  async function confirmImport() {
    setImporting(true);
    await importPharmacies(importPreview);
    await setPharmacies();
    setImporting(false);
    setImportOpen(false);
    setImportPreview([]);
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <header className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-medium text-rssb-blue-dark">Facility Master List</h1>
          <p className="text-sm text-gray-500 mt-1">{pharmacies.length} registered pharmacies served by this branch.</p>
        </div>
        <div className="flex gap-2">
          <input className={`${inputCls} !w-56`} placeholder="Search name, code, district" value={query} onChange={(e) => setQuery(e.target.value)} />
          <Button variant="secondary" onClick={() => setImportOpen(true)}>Bulk import</Button>
          <Button onClick={() => setEditing({ ...EMPTY })}>+ Add pharmacy</Button>
        </div>
      </header>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-2.5">Code</th>
              <th className="text-left px-4 py-2.5">Name</th>
              <th className="text-left px-4 py-2.5">District</th>
              <th className="text-left px-4 py-2.5">Province</th>
              <th className="text-left px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((p) => (
              <tr key={p.code} className="hover:bg-gray-50">
                <td className="px-4 py-2 font-mono text-xs text-gray-500">{p.code}</td>
                <td className="px-4 py-2 font-medium text-gray-800">{p.name}</td>
                <td className="px-4 py-2 text-gray-600">{p.district}</td>
                <td className="px-4 py-2 text-gray-600">{p.province}</td>
                <td className="px-4 py-2 text-right">
                  <button className="text-xs text-rssb-blue underline" onClick={() => setEditing({ ...EMPTY, ...p })}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={!!editing} onClose={() => setEditing(null)}>
        {editing && (
          <form onSubmit={handleSave} className="p-5">
            <h3 className="font-semibold text-rssb-blue-dark mb-4">{pharmacies.some(p => p.code === editing.code) ? 'Edit pharmacy' : 'Add pharmacy'}</h3>
            <Field label="Facility code">
              <input className={inputCls} value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value })} required />
            </Field>
            <Field label="Facility name">
              <input className={inputCls} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required />
            </Field>
            <Field label="District">
              <input className={inputCls} value={editing.district} onChange={(e) => setEditing({ ...editing, district: e.target.value })} required />
            </Field>
            <Field label="Province">
              <input className={inputCls} value={editing.province} onChange={(e) => setEditing({ ...editing, province: e.target.value })} />
            </Field>
            <Field label="Phone">
              <input className={inputCls} value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
            </Field>
            <Field label="Po Box">
              <input className={inputCls} value={editing.poBox} onChange={(e) => setEditing({ ...editing, poBox: e.target.value })} />
            </Field>
            <Field label="Email" hint="Used as the default acknowledgement email for this pharmacy.">
              <input type="email" className={inputCls} value={editing.email || ''} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
            </Field>
            <Button type="submit">Save pharmacy</Button>
          </form>
        )}
      </Modal>

      <Modal open={importOpen} onClose={() => { setImportOpen(false); setImportPreview([]); setImportError(''); }} wide>
        <div className="p-5">
          <h3 className="font-semibold text-rssb-blue-dark mb-1">Bulk import pharmacies</h3>
          <p className="text-xs text-gray-500 mb-4">
            Upload a CSV with columns: <span className="font-mono">code, name, district, province, phone, poBox, email</span>.
            Existing pharmacies with a matching code are updated; new codes are added.
          </p>
          <input type="file" accept=".csv" onChange={handleFile} className="text-sm mb-3" />
          {importError && <p className="text-xs text-rose-600 mb-3">{importError}</p>}
          {importPreview.length > 0 && (
            <>
              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md mb-3">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500 uppercase sticky top-0">
                    <tr>
                      <th className="text-left px-2 py-1.5">Code</th>
                      <th className="text-left px-2 py-1.5">Name</th>
                      <th className="text-left px-2 py-1.5">District</th>
                      <th className="text-left px-2 py-1.5">Province</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {importPreview.map((p, i) => (
                      <tr key={i}>
                        <td className="px-2 py-1 font-mono">{p.code}</td>
                        <td className="px-2 py-1">{p.name}</td>
                        <td className="px-2 py-1">{p.district}</td>
                        <td className="px-2 py-1">{p.province}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-2">
                <Button onClick={confirmImport} disabled={importing}>
                  {importing ? 'Importing...' : `Import ${importPreview.length} pharmacies`}
                </Button>
                <Button variant="ghost" onClick={() => setImportPreview([])}>Clear</Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
