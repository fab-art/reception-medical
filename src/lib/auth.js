const SESSION_KEY = 'rssb:session';

// Officer.role is now the single source of truth for what a signed-in user
// can do (district_officer, zone_supervisor, hq_assistant, hq_reception,
// lead_medical_officer, manager, finance). Admin/super admin remain shared
// passwords since they are configuration/oversight roles, not individuals.
export function resolveLogin(credential, settings, officers) {
  const v = String(credential || '').trim();
  if (!v) return null;
  if (v === String(settings.superadminPassword)) return { role: 'superadmin' };
  if (v === String(settings.adminPassword)) return { role: 'admin' };
  const o = officers.find((x) => x.active !== false && String(x.pin) === v);
  if (o) return { role: o.role, officerId: o.id, officerName: o.name, district: o.district, zone: o.zone };
  return null;
}
export function getSession() { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; } }
export function setSession(s) { sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)); }
export function clearSession() { sessionStorage.removeItem(SESSION_KEY); }

export const ROLE_LABELS = {
  superadmin: 'Super Admin', admin: 'Admin',
  district_officer: 'Verification Officer', zone_supervisor: 'Zone Supervisor',
  hq_assistant: 'HQ Assistant', hq_reception: 'HQ Reception & Archives',
  lead_medical_officer: 'Lead Medical Officer', manager: 'Manager', finance: 'Finance',
};
