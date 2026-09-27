// Turns a pasted, one-song-per-line setlist into builder state, so a prediction can be marked
// against a live that isn't in lives.json yet. Titles resolve against the JP title, EN title and
// kana reading, ignoring case, width, spacing and punctuation.
import type { SetlistState } from './share';
import type { SekaiSong } from '~/types/sekai';

export const normalizeTitle = (s: string) =>
  s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]/gu, '');

// "1.", "01)", "M01", "EN1:" and similar numbering in front of a title.
const NUMBERING = /^(?:(en|encore)\s*)?(?:m\s*)?\d{1,3}\s*[.):：、-]?\s+/i;
const ENCORE_LINE = /^[-—=\s]*(?:encore|en|アンコール)[-—=\s]*$/i;
// A trailing "(Short ver.)" / "［MC］" style note.
const TRAILING_NOTE = /\s*[(（[［][^)）\]］]*[)）\]］]\s*$/;

export interface ParsedSetlist {
  state: SetlistState;
  unresolved: string[]; // lines that didn't match a catalog song (dropped from state)
}

export function buildTitleIndex(songs: SekaiSong[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const s of songs) {
    for (const name of [s.title, s.englishName, s.pronunciation]) {
      const key = name && normalizeTitle(name);
      if (key && !index.has(key)) index.set(key, s.id);
    }
  }
  return index;
}

export function parseSetlistText(text: string, index: Map<string, string>): ParsedSetlist {
  const songs: string[] = [];
  const encore: number[] = [];
  const unresolved: string[] = [];
  let inEncore = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (ENCORE_LINE.test(line)) {
      inEncore = true;
      continue;
    }
    const numbered = NUMBERING.exec(line);
    if (numbered?.[1]) inEncore = true;
    const title = numbered ? line.slice(numbered[0].length) : line;
    // Fall back to the whole line for titles that start with a number (e.g. "1000年生きてる").
    const id = [title, title.replace(TRAILING_NOTE, ''), line]
      .map((t) => index.get(normalizeTitle(t)))
      .find(Boolean);
    if (!id) {
      unresolved.push(line);
      continue;
    }
    if (inEncore) encore.push(songs.length);
    songs.push(id);
  }
  return { state: { title: '', songs, encore, ordered: true }, unresolved };
}
