import { v4 as uuid } from 'uuid';
import { supabase } from './supabase';
import { loadLocal, saveLocal } from './local';
import {
  pharmacyFromRow, pharmacyToRow,
  receptionFromRow, receptionInsertRow, receptionUpdateRow, receptionStatusExtraRow,
  officerFromRow, settingsFromRow, settingsToRow,
} from './mapping';
import seedPharmacies from '../data/pharmacies-seed.json';

const listeners = new Set();
export function onSyncEvent(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function emit(evt) {
  listeners.forEach((fn) => {
    try { fn(evt); } catch { /* ignore listener errors */ }
  });
}

export function isOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

// Queue a write for the shared DB and, if we're online, try to flush right away
// so it reaches Supabase (and other devices) as fast as possible.
export async function enqueue(item) {
  const queue = await loadLocal('queue', []);
  queue.push({ ...item, queueId: uuid(), createdAt: new Date().toISOString() });
  await saveLocal('queue', queue);
  if (isOnline()) syncNow().catch(() => {});
}

let syncing = false;

// Pushes everything queued, then pulls fresh shared data back into the local cache.
// Called on app load, on the browser's `online` event, and right after every write.
export async function syncNow() {
  if (syncing || !isOnline()) return;
  syncing = true;
  try {
    const queue = await loadLocal('queue', []);
    if (queue.length > 0) {
      const remaining = [];
      let pushed = 0;
      for (const item of queue) {
        try {
          await applyItem(item);
          pushed++;
        } catch {
          remaining.push(item);
        }
      }
      await saveLocal('queue', remaining);
      if (pushed > 0) await markReceptionsSynced();
      if (pushed > 0) emit({ type: 'synced', count: pushed, remaining: remaining.length });
      if (remaining.length > 0) emit({ type: 'pending', remaining: remaining.length });
    }
    await pullRemote();
  } catch (err) {
    emit({ type: 'error', message: err.message || 'Sync failed' });
  } finally {
    syncing = false;
  }
}

async function applyItem(item) {
  switch (item.kind) {
    case 'seedPharmacies': {
      const rows = item.payload.map(pharmacyToRow);
      const { error } = await supabase.from('pharmacies').upsert(rows, { onConflict: 'code' });
      if (error) throw error;
      break;
    }
    case 'upsertPharmacy': {
      const { error } = await supabase.from('pharmacies').upsert(pharmacyToRow(item.payload), { onConflict: 'code' });
      if (error) throw error;
      break;
    }
    case 'addReception': {
      const { error } = await supabase.from('receptions').insert(receptionInsertRow(item.payload));
      if (error && error.code !== '23505') throw error; // 23505 = already exists (already synced earlier)
      break;
    }
    case 'updateReception': {
      const row = receptionUpdateRow(item.payload.patch);
      row.updated_at = new Date().toISOString();
      row.edited_by = item.payload.editedBy || null;
      const { error } = await supabase.from('receptions').update(row).eq('id', item.payload.id);
      if (error) throw error;
      break;
    }
    case 'deleteReception': {
      const { error } = await supabase.from('receptions').delete().eq('id', item.payload.id);
      if (error) throw error;
      break;
    }
    case 'assignReception': {
      const { error } = await supabase.from('receptions').update({
        assigned_officer_id: item.payload.officerId,
        assigned_at: new Date().toISOString(),
        status: item.payload.officerId ? 'assigned' : 'received',
      }).eq('id', item.payload.id);
      if (error) throw error;
      break;
    }
    case 'setReceptionStatus': {
      const extraRow = receptionStatusExtraRow(item.payload.extra || {});
      const { error } = await supabase.from('receptions').update({ status: item.payload.status, ...extraRow }).eq('id', item.payload.id);
      if (error) throw error;
      break;
    }
    case 'addOfficer': {
      const { error } = await supabase.from('officers').insert({
        id: item.payload.id, name: item.payload.name, role: item.payload.role || '', pin: item.payload.pin || null,
        is_receptionist: !!item.payload.isReceptionist,
      });
      if (error && error.code !== '23505') throw error;
      break;
    }
    case 'updateOfficer': {
      const patch = item.payload.patch;
      const row = {};
      if ('name' in patch) row.name = patch.name;
      if ('role' in patch) row.role = patch.role;
      if ('pin' in patch) row.pin = patch.pin;
      if ('isReceptionist' in patch) row.is_receptionist = patch.isReceptionist;
      const { error } = await supabase.from('officers').update(row).eq('id', item.payload.id);
      if (error) throw error;
      break;
    }
    case 'removeOfficer': {
      const { error } = await supabase.from('officers').update({ active: false }).eq('id', item.payload.id);
      if (error) throw error;
      break;
    }
    case 'saveSettings': {
      const { error } = await supabase.from('settings').upsert(settingsToRow(item.payload), { onConflict: 'id' });
      if (error) throw error;
      break;
    }
    default:
      break;
  }
}

async function markReceptionsSynced() {
  const list = await loadLocal('receptions', []);
  await saveLocal('receptions', list.map((r) => ({ ...r, synced: true })));
}

async function pullRemote() {
  const [pharm, rec, off, set] = await Promise.all([
    supabase.from('pharmacies').select('*'),
    supabase.from('receptions').select('*'),
    supabase.from('officers').select('*').eq('active', true),
    supabase.from('settings').select('*').eq('id', 1).maybeSingle(),
  ]);

  if (!pharm.error && pharm.data) {
    if (pharm.data.length === 0) {
      // Nothing shared yet anywhere — seed both the shared DB and the local cache.
      await saveLocal('pharmacies', seedPharmacies);
      await enqueue({ kind: 'seedPharmacies', payload: seedPharmacies });
    } else {
      await saveLocal('pharmacies', pharm.data.map(pharmacyFromRow));
    }
  }

  if (!rec.error && rec.data) {
    const remote = rec.data.map(receptionFromRow).map((r) => ({ ...r, synced: true }));
    const localUnsynced = (await loadLocal('receptions', [])).filter((r) => !r.synced);
    const merged = [...localUnsynced, ...remote.filter((r) => !localUnsynced.some((l) => l.id === r.id))];
    await saveLocal('receptions', merged);
  }

  if (!off.error && off.data) {
    await saveLocal('officers', off.data.map(officerFromRow));
  }

  if (!set.error && set.data) {
    await saveLocal('settings', settingsFromRow(set.data));
  }

  emit({ type: 'pulled' });
}
