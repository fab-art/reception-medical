import { get, set } from 'idb-keyval';

// IMPORTANT: keys here must cover every key used via loadLocal/saveLocal in db.js
// and sync.js. A missing entry used to fall back to `undefined`, which made every
// unmatched store collide on the same IndexedDB key and silently corrupt data.
const KEYS = {
  facilities: 'rssb:facilities',
  invoices: 'rssb:invoices',
  officers: 'rssb:officers',
  settings: 'rssb:settings',
  events: 'rssb:invoice_events',
  queue: 'rssb:queue',
};

export async function loadLocal(key, fallback) {
  const storageKey = KEYS[key];
  if (!storageKey) throw new Error(`local.js: unknown storage key "${key}"`);
  const v = await get(storageKey);
  return v === undefined || v === null ? fallback : v;
}

export async function saveLocal(key, value) {
  const storageKey = KEYS[key];
  if (!storageKey) throw new Error(`local.js: unknown storage key "${key}"`);
  await set(storageKey, value);
  return value;
}
