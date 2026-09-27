// Your setlist predictions, in localStorage (no backend), keyed by prediction id. Replaces the
// old named save slots, which are migrated the first time predictions are read.
import { fromSetlistState, parsePrediction } from './prediction';
import type { SetlistState } from './share';
import type { SekaiPrediction } from '~/types/sekai-prediction';

const KEY = 'sekai-setlist:predictions';
const LAST_KEY = 'sekai-setlist:last-prediction';
const SLOTS_KEY = 'sekai-setlist:slots';
const MIGRATED_KEY = 'sekai-setlist:slots-migrated';
/** Fired on window after this tab writes, so every usePredictions() on the page re-reads. */
export const PREDICTIONS_EVENT = 'sekai-setlist:predictions';

type Store = Record<string, SekaiPrediction>;

function readRaw(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    const obj = raw ? (JSON.parse(raw) as unknown) : {};
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return {};
    const out: Store = {};
    for (const v of Object.values(obj)) {
      const p = parsePrediction(v);
      if (p) out[p.id] = p;
    }
    return out;
  } catch {
    return {};
  }
}

function write(store: Store): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
    window.dispatchEvent(new Event(PREDICTIONS_EVENT));
  } catch {
    /* quota / private mode — ignore */
  }
}

interface LegacySlot {
  name?: unknown;
  savedAt?: unknown;
  state?: SetlistState;
}

/**
 * One-time import of the old `sekai-setlist:slots` save slots. The old key is left in place;
 * a flag stops it being imported twice. Returns how many slots were imported.
 */
export function migrateSlots(): number {
  try {
    if (localStorage.getItem(MIGRATED_KEY)) return 0;
    localStorage.setItem(MIGRATED_KEY, '1');
    const raw = localStorage.getItem(SLOTS_KEY);
    const slots = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(slots) || slots.length === 0) return 0;
    const store = readRaw();
    let n = 0;
    for (const slot of slots as LegacySlot[]) {
      if (!slot?.state || !Array.isArray(slot.state.songs)) continue;
      const at =
        typeof slot.savedAt === 'number' ? new Date(slot.savedAt).toISOString() : undefined;
      const p = fromSetlistState(slot.state, at);
      p.name = slot.state.title || (typeof slot.name === 'string' ? slot.name : '');
      store[p.id] = p;
      n++;
    }
    if (n) write(store);
    return n;
  } catch {
    return 0;
  }
}

function read(): Store {
  migrateSlots();
  return readRaw();
}

/** Newest first; only those for `live` when given. */
export const listPredictions = (live?: string): SekaiPrediction[] =>
  Object.values(read())
    .filter((p) => !live || p.live === live)
    .toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt));

export const getPrediction = (id: string): SekaiPrediction | undefined => read()[id];

/** Upsert by id, stamping updatedAt. Returns what was stored. */
export function savePrediction(p: SekaiPrediction, now = new Date().toISOString()) {
  const saved = { ...p, updatedAt: now };
  write({ ...read(), [p.id]: saved });
  return saved;
}

export function deletePrediction(id: string): void {
  const store = read();
  delete store[id];
  write(store);
  if (getLastPredictionId() === id) setLastPredictionId(undefined);
}

export function getLastPredictionId(): string | undefined {
  try {
    return localStorage.getItem(LAST_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

export function setLastPredictionId(id: string | undefined): void {
  try {
    if (id) localStorage.setItem(LAST_KEY, id);
    else localStorage.removeItem(LAST_KEY);
  } catch {
    /* ignore */
  }
}
