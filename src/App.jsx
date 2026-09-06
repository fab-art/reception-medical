import { useEffect, useMemo, useState } from 'react';
import { getSession } from './lib/auth';
import { ROLE_LABELS } from './lib/auth';
import { initializeStore, getInvoices, getOfficers, getFacilities, getSettings, syncNow } from './lib/db';
import { ToastProvider } from './lib/toast';
import RoleShell from './components/RoleShell';
import { IconHome, IconList, IconReport, IconUsers, IconPharmacy, IconSettings, IconPlus } from './components/Icons';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import InvoiceQueue from './pages/InvoiceQueue';
import InvoiceWorkspace from './pages/InvoiceWorkspace';
import NewSubmission from './pages/NewSubmission';
import Reports from './pages/Reports';
import Officers from './pages/Officers';
import Facilities from './pages/Facilities';
import Settings from './pages/Settings';

const NAV_BY_ROLE = {
  district_officer: [
    { id: 'dashboard', label: 'My Dashboard', icon: IconHome },
    { id: 'new', label: 'New Submission', icon: IconPlus },
    { id: 'queue', label: 'My Invoices', icon: IconList },
    { id: 'reports', label: 'My Reports', icon: IconReport },
  ],
  hq_assistant: [
    { id: 'dashboard', label: 'My Dashboard', icon: IconHome },
    { id: 'queue', label: 'Assigned to Me', icon: IconList },
    { id: 'reports', label: 'Reports', icon: IconReport },
  ],
  zone_supervisor: [
    { id: 'dashboard', label: 'Zone Overview', icon: IconHome },
    { id: 'queue', label: 'Zone Invoices', icon: IconList },
    { id: 'reports', label: 'Zone Report', icon: IconReport },
  ],
  hq_reception: [
    { id: 'dashboard', label: 'Dashboard', icon: IconHome },
    { id: 'queue', label: 'Transit & Archive', icon: IconList },
    { id: 'reports', label: 'Reports', icon: IconReport },
  ],
  lead_medical_officer: [
    { id: 'dashboard', label: 'Dashboard', icon: IconHome },
    { id: 'queue', label: 'For Review', icon: IconList },
    { id: 'reports', label: 'Reports', icon: IconReport },
  ],
  manager: [
    { id: 'dashboard', label: 'Dashboard', icon: IconHome },
    { id: 'queue', label: 'For Sign-off', icon: IconList },
    { id: 'reports', label: 'Reports', icon: IconReport },
  ],
  finance: [
    { id: 'dashboard', label: 'Dashboard', icon: IconHome },
    { id: 'queue', label: 'Payments Queue', icon: IconList },
    { id: 'reports', label: 'Payments Report', icon: IconReport },
  ],
  admin: [
    { id: 'dashboard', label: 'Dashboard', icon: IconHome },
    { id: 'queue', label: 'All Invoices', icon: IconList },
    { id: 'officers', label: 'Officers & Staff', icon: IconUsers },
    { id: 'facilities', label: 'Facilities', icon: IconPharmacy },
    { id: 'reports', label: 'Reports', icon: IconReport },
    { id: 'settings', label: 'Settings', icon: IconSettings },
  ],
  superadmin: [
    { id: 'dashboard', label: 'Dashboard', icon: IconHome },
    { id: 'queue', label: 'All Invoices', icon: IconList },
    { id: 'officers', label: 'Officers & Staff', icon: IconUsers },
    { id: 'facilities', label: 'Facilities', icon: IconPharmacy },
    { id: 'reports', label: 'Reports', icon: IconReport },
    { id: 'settings', label: 'Settings', icon: IconSettings },
  ],
};

const QUEUE_TITLES = {
  district_officer: ['My invoices', 'Everything submitted for your district'],
  hq_assistant: ['Assigned to me', 'Invoices handed to you to help with overload'],
  zone_supervisor: ['Zone invoices', 'Every officer under your zone'],
  hq_reception: ['Transit & archive', 'Invoices in transit or newly arrived at HQ'],
  lead_medical_officer: ['For review', 'Invoices ready for your medical review'],
  manager: ['For sign-off', 'Invoices approved by the Lead, awaiting your signature'],
  finance: ['Payments queue', 'Signed invoices ready for payslip and payment'],
  admin: ['All invoices', 'Every invoice in the system'],
  superadmin: ['All invoices', 'Every invoice in the system'],
};

function AppShell({ session }) {
  const [view, setView] = useState('dashboard');
  const [openInvoice, setOpenInvoice] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const [invoices, officers, facilities, settings] = await Promise.all([getInvoices(), getOfficers(), getFacilities(), getSettings()]);
    setData({ invoices, officers, facilities, settings });
    if (openInvoice) setOpenInvoice(invoices.find((r) => r.id === openInvoice.id) || null);
  }

  useEffect(() => {
    (async () => {
      await initializeStore();
      await refresh();
      setLoading(false);
      syncNow().catch(() => {});
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nav = NAV_BY_ROLE[session.role] || [];

  if (loading || !data) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">Loading workflow data…</div>;
  }

  const [queueTitle, queueSubtitle] = QUEUE_TITLES[session.role] || ['Invoices', ''];

  return (
    <RoleShell roleLabel={ROLE_LABELS[session.role] || session.role} nav={nav} view={view} setView={setView}>
      {openInvoice ? (
        <InvoiceWorkspace record={openInvoice} session={session} officers={data.officers} onClose={() => setOpenInvoice(null)} onChanged={refresh} />
      ) : view === 'dashboard' ? (
        <Dashboard invoices={data.invoices} officers={data.officers} facilities={data.facilities} session={session} />
      ) : view === 'queue' ? (
        <InvoiceQueue invoices={data.invoices} officers={data.officers} session={session} open={setOpenInvoice} title={queueTitle} subtitle={queueSubtitle} />
      ) : view === 'new' ? (
        <NewSubmission facilities={data.facilities} session={session} onDone={refresh} />
      ) : view === 'reports' ? (
        <Reports invoices={data.invoices} officers={data.officers} session={session} />
      ) : view === 'officers' ? (
        <Officers officers={data.officers} invoices={data.invoices} onChanged={refresh} />
      ) : view === 'facilities' ? (
        <Facilities facilities={data.facilities} />
      ) : view === 'settings' ? (
        <Settings settings={data.settings} onChanged={refresh} />
      ) : null}
    </RoleShell>
  );
}

export default function App() {
  const session = useMemo(() => getSession(), []);
  if (!session) return <Landing />;
  return (
    <ToastProvider>
      <AppShell session={session} />
    </ToastProvider>
  );
}
