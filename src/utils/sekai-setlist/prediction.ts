// Pure helpers for SekaiPrediction: creation, validation, row numbering, and conversion to and
// from the SetlistState that scoring and legacy (#s=) links use.
import { sekaiSongName } from './catalog';
import { getSekaiLive, sekaiLiveName } from './live-data';
import type { SetlistState } from './share';
import type {
  CustomEvent,
  PredictionItem,
  PredictionItemType,
  SekaiPrediction
} from '~/types/sekai-prediction';
import { isSongRow } from '~/types/sekai-prediction';

const rand = () => Math.random().toString(36).slice(2, 10);

export const itemId = () => `i-${Date.now().toString(36)}-${rand()}`;
export const predictionId = () => `p-${Date.now().toString(36)}-${rand()}`;

export function newPrediction(
  init: { name?: string; live?: string; custom?: CustomEvent; items?: PredictionItem[] } = {},
  now = new Date().toISOString()
): SekaiPrediction {
  return {
    id: predictionId(),
    name: init.name ?? '',
    ...(init.live ? { live: init.live } : {}),
    ...(init.custom ? { custom: init.custom } : {}),
    items: init.items ?? [],
    createdAt: now,
    updatedAt: now
  };
}

/** Song rows (catalog and custom). */
export const songCount = (p: SekaiPrediction) => p.items.filter(isSongRow).length;

// --- validation (storage, imported JSON) ---

const str = (x: unknown): string | undefined => (typeof x === 'string' && x ? x : undefined);
const ITEM_TYPES = new Set<PredictionItemType>(['song', 'custom', 'mc', 'encore', 'intermission']);

/** Validate an untrusted row, giving it a fresh id if it has none. Undefined if unusable. */
export function parseItem(x: unknown): PredictionItem | undefined {
  if (!x || typeof x !== 'object') return undefined;
  const o = x as Record<string, unknown>;
  const type = o.type as PredictionItemType;
  if (!ITEM_TYPES.has(type)) return undefined;
  const id = str(o.id) ?? itemId();
  const remarks = str(o.remarks);
  const withRemarks = remarks ? { remarks } : {};
  switch (type) {
    case 'song': {
      const songId = typeof o.songId === 'number' ? String(o.songId) : str(o.songId);
      return songId ? { id, type, songId, ...withRemarks } : undefined;
    }
    case 'custom': {
      const name = str(o.name);
      return name ? { id, type, name, ...withRemarks } : undefined;
    }
    case 'mc':
      return { id, type, title: str(o.title) ?? 'MC' };
    default: {
      const title = str(o.title);
      return { id, type, ...(title ? { title } : {}) };
    }
  }
}

export function parsePrediction(x: unknown): SekaiPrediction | undefined {
  if (!x || typeof x !== 'object') return undefined;
  const o = x as Record<string, unknown>;
  if (!Array.isArray(o.items)) return undefined;
  const c = o.custom as Record<string, unknown> | undefined;
  const customName = c && typeof c === 'object' ? str(c.name) : undefined;
  const now = new Date().toISOString();
  const live = str(o.live);
  return {
    id: str(o.id) ?? predictionId(),
    name: typeof o.name === 'string' ? o.name : '',
    ...(live ? { live } : {}),
    ...(customName
      ? {
          custom: {
            name: customName,
            ...(str(c?.date) ? { date: str(c?.date) } : {}),
            ...(str(c?.venue) ? { venue: str(c?.venue) } : {})
          }
        }
      : {}),
    items: o.items.map(parseItem).filter((i): i is PredictionItem => !!i),
    createdAt: str(o.createdAt) ?? now,
    updatedAt: str(o.updatedAt) ?? str(o.createdAt) ?? now
  };
}

// --- numbering ---

const CIRCLED = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';
const circled = (n: number) => (n <= CIRCLED.length ? CIRCLED[n - 1] : `(${n})`);
const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Row labels, index-aligned with `items`: M01, M02… for songs before the first encore divider,
 * EN01… after it, MC①② for MCs, and undefined for dividers.
 */
export function numberItems(items: PredictionItem[]): (string | undefined)[] {
  let main = 0;
  let encore = 0;
  let mc = 0;
  let inEncore = false;
  return items.map((item) => {
    switch (item.type) {
      case 'encore':
        inEncore = true;
        return undefined;
      case 'intermission':
        return undefined;
      case 'mc':
        return `MC${circled(++mc)}`;
      default:
        return inEncore ? `EN${pad(++encore)}` : `M${pad(++main)}`;
    }
  });
}

// --- SetlistState conversion ---

/** Scoring shape: catalog songs in order, encore = songs after the first encore divider. */
export function toSetlistState(p: SekaiPrediction): SetlistState {
  const songs: string[] = [];
  const encore: number[] = [];
  let inEncore = false;
  for (const item of p.items) {
    if (item.type === 'encore') inEncore = true;
    if (item.type !== 'song') continue;
    if (inEncore) encore.push(songs.length);
    songs.push(item.songId);
  }
  return { title: p.name, songs, encore, ordered: true, ...(p.live ? { live: p.live } : {}) };
}

/** Rows for a SetlistState, with an encore divider before its first encore song. */
export function stateToItems(state: SetlistState): PredictionItem[] {
  const firstEncore = state.encore.length ? Math.min(...state.encore) : -1;
  return state.songs.flatMap((songId, i): PredictionItem[] => {
    const song: PredictionItem = { id: itemId(), type: 'song', songId };
    return i === firstEncore ? [{ id: itemId(), type: 'encore' }, song] : [song];
  });
}

export function fromSetlistState(state: SetlistState, now?: string): SekaiPrediction {
  return newPrediction(
    { name: state.title, live: state.live, items: stateToItems(state) },
    now ?? new Date().toISOString()
  );
}

// --- text export ---

export const DIVIDER_TITLES: Record<'encore' | 'intermission', string> = {
  encore: 'ENCORE',
  intermission: 'INTERMISSION'
};

/** The event a prediction is for, as display text. */
export function predictionEventName(p: SekaiPrediction, lang: string): string | undefined {
  const live = getSekaiLive(p.live);
  return live ? sekaiLiveName(live, lang) : p.custom?.name;
}

/** A row's display text: song title, custom song name, MC title, or `━━ ENCORE ━━`. */
export function itemName(item: PredictionItem, lang: string): string {
  switch (item.type) {
    case 'song':
      return sekaiSongName(item.songId, lang);
    case 'custom':
      return item.name;
    case 'mc':
      return item.title;
    default:
      return `━━ ${item.title || DIVIDER_TITLES[item.type]} ━━`;
  }
}

/** Plain-text setlist for sharing: title, event, then one numbered row per line. */
export function exportText(p: SekaiPrediction, lang: string): string {
  const labels = numberItems(p.items);
  const lines = p.items.map((item, i) => {
    const name = itemName(item, lang);
    if (!labels[i]) return name;
    const remarks = isSongRow(item) && item.remarks ? ` (${item.remarks})` : '';
    return `${labels[i]} ${name}${remarks}`;
  });
  const header = [p.name, predictionEventName(p, lang)].filter(
    (s, i, all): s is string => !!s && all.indexOf(s) === i
  );
  return [...header, ...(header.length ? [''] : []), ...lines].join('\n');
}
