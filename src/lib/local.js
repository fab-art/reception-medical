import { get, set } from 'idb-keyval';

const KEYS = {
  pharmacies: 'rssb:pharmacies',
  receptions: 'rssb:receptions',
  officers: 'rssb:officers',
  settings: 'rssb:settings',
  queue: 'rssb:queue',
};

export async function loadLocal(key, fallback) {
  const v = await get(KEYS[key]);
  return v === undefined || v === null ? fallback : v;
}

export async function saveLocal(key, value) {
  await set(KEYS[key], value);
  return value;
}
