// Generic camelCase <-> snake_case object key conversion used to map between
// the app's JS record shape and Supabase/Postgres column names, so we don't
// need a hand-written mapping function per table (that's what drifted out of
// sync between db.js / sync.js / mapping.js / schema.sql previously).

export function toSnake(obj) {
  if (obj === null || obj === undefined) return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const snake = k.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase());
    out[snake] = v;
  }
  return out;
}

export function toCamel(obj) {
  if (obj === null || obj === undefined) return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const camel = k.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
    out[camel] = v;
  }
  return out;
}

export function listToCamel(rows) { return (rows || []).map(toCamel); }
export function listToSnake(rows) { return (rows || []).map(toSnake); }
