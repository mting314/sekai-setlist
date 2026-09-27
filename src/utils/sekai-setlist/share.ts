// Shareable Sekai setlist URLs. The full builder state is lz-string-compressed into the URL
// hash, so a setlist can be shared/bookmarked with no backend.
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';

// The wire shape the builder reads/writes (setlist-items' SetlistPrediction minus guests, plus
// a user-entered title). `encore` = the song positions flagged as encore; `live` = the id of the
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
