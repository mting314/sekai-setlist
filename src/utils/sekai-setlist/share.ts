// Shareable Sekai setlist URLs. The full builder state is lz-string-compressed into the URL
// hash, so a setlist can be shared/bookmarked with no backend.
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { fromSetlistState, itemId, newPrediction } from './prediction';
import type { PredictionItem, SekaiPrediction } from '~/types/sekai-prediction';

// The flat setlist that scoring and legacy `#s=` links use (see toSetlistState), plus a
// user-entered title. `encore` = the song positions flagged as encore; `live` = the id of the
// lives.json live this setlist is a prediction for.
export interface SetlistState {
  title: string;
  songs: string[];
  encore: number[];
  ordered: boolean;
  live?: string;
}

export const EMPTY_STATE: SetlistState = { title: '', songs: [], encore: [], ordered: true };

/** Encode state into a hash fragment string (no leading '#'). */
export function encodeState(state: SetlistState): string {
  return 's=' + compressToEncodedURIComponent(JSON.stringify(state));
}

/** Full shareable URL for the current state (uses the running page's origin+path). */
export function shareUrl(state: SetlistState): string {
  const base = typeof window !== 'undefined' ? window.location.href.split('#')[0] : '';
  return `${base}#${encodeState(state)}`;
}

/** Parse a state from a hash fragment (with or without leading '#'). Undefined if absent/invalid. */
export function decodeHash(hash: string): SetlistState | undefined {
  const h = hash.replace(/^#/, '');
  const m = /(?:^|&)s=([^&]+)/.exec(h);
  if (!m) return undefined;
  try {
    const json = decompressFromEncodedURIComponent(m[1]);
    if (!json) return undefined;
    const obj = JSON.parse(json) as Partial<SetlistState>;
    if (!Array.isArray(obj.songs)) return undefined;
    return {
      title: typeof obj.title === 'string' ? obj.title : '',
      songs: obj.songs.map(String),
      encore: Array.isArray(obj.encore) ? obj.encore.filter((n) => Number.isInteger(n)) : [],
      ordered: obj.ordered !== false,
      ...(typeof obj.live === 'string' && obj.live ? { live: obj.live } : {})
    };
  } catch {
    return undefined;
  }
}

// --- v2: whole predictions (#p=) ---

// Compact wire rows: [type code, value, remarks]. Value is the song id, custom song name, MC
// title or divider title.
const CODES = { song: 's', custom: 'c', mc: 'm', encore: 'e', intermission: 'i' } as const;
type Code = (typeof CODES)[keyof typeof CODES];
const TYPES = Object.fromEntries(Object.entries(CODES).map(([t, c]) => [c, t])) as Record<
  Code,
  PredictionItem['type']
>;
type WireItem = [Code, string?, string?];
interface WireV2 {
  v: 2;
  n: string;
  l?: string;
  c?: { n: string; d?: string; v?: string };
  i: WireItem[];
}

/** Share links at or over this length may be cut off by chat apps; the builder warns. */
export const MAX_SHARE_URL_LENGTH = 2000;

function toWire(item: PredictionItem): WireItem {
  const code = CODES[item.type];
  switch (item.type) {
    case 'song':
      return item.remarks ? [code, item.songId, item.remarks] : [code, item.songId];
    case 'custom':
      return item.remarks ? [code, item.name, item.remarks] : [code, item.name];
    case 'mc':
      return [code, item.title];
    default:
      return item.title ? [code, item.title] : [code];
  }
}

function fromWire(w: unknown): PredictionItem | undefined {
  if (!Array.isArray(w)) return undefined;
  const [code, value, remarks] = w as unknown[];
  const type = TYPES[code as Code];
  const v = typeof value === 'string' && value ? value : undefined;
  const r = typeof remarks === 'string' && remarks ? { remarks } : {};
  const id = itemId();
  switch (type) {
    case 'song':
      return v ? { id, type, songId: v, ...r } : undefined;
    case 'custom':
      return v ? { id, type, name: v, ...r } : undefined;
    case 'mc':
      return { id, type, title: v ?? 'MC' };
    case 'encore':
    case 'intermission':
      return { id, type, ...(v ? { title: v } : {}) };
    default:
      return undefined;
  }
}

/** Hash fragment (no leading '#') carrying a prediction. */
export function encodePrediction(p: SekaiPrediction): string {
  const wire: WireV2 = {
    v: 2,
    n: p.name,
    ...(p.live ? { l: p.live } : {}),
    ...(p.custom
      ? {
          c: {
            n: p.custom.name,
            ...(p.custom.date ? { d: p.custom.date } : {}),
            ...(p.custom.venue ? { v: p.custom.venue } : {})
          }
        }
      : {}),
    i: p.items.map(toWire)
  };
  return 'p=' + compressToEncodedURIComponent(JSON.stringify(wire));
}

export interface DecodedShare {
  prediction: SekaiPrediction; // a fresh id, so importing never overwrites a saved prediction
  /** False only for a legacy #s= link built in the old "any order" mode (scored as a bag). */
  ordered: boolean;
}

/** Read a prediction from a #p= (or legacy #s=) hash, with or without '#'. */
export function decodeShare(hash: string): DecodedShare | undefined {
  const h = hash.replace(/^#/, '');
  const m = /(?:^|&)p=([^&]+)/.exec(h);
  if (!m) {
    const legacy = decodeHash(h);
    return legacy && { prediction: fromSetlistState(legacy), ordered: legacy.ordered };
  }
  try {
    const json = decompressFromEncodedURIComponent(m[1]);
    if (!json) return undefined;
    const w = JSON.parse(json) as Partial<WireV2>;
    if (!Array.isArray(w.i)) return undefined;
    const c = w.c && typeof w.c.n === 'string' && w.c.n ? w.c : undefined;
    return {
      prediction: newPrediction({
        name: typeof w.n === 'string' ? w.n : '',
        live: typeof w.l === 'string' && w.l ? w.l : undefined,
        custom: c && {
          name: c.n,
          ...(typeof c.d === 'string' && c.d ? { date: c.d } : {}),
          ...(typeof c.v === 'string' && c.v ? { venue: c.v } : {})
        },
        items: w.i.map(fromWire).filter((i): i is PredictionItem => !!i)
      }),
      ordered: true
    };
  } catch {
    return undefined;
  }
}
