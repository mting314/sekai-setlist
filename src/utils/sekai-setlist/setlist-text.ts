// Turns a pasted, one-song-per-line setlist into builder state, so a prediction can be marked
// against a live that isn't in lives.json yet. Titles resolve against the JP title, EN title and
// kana reading, ignoring case, width, spacing and punctuation.
import { itemId, songItem } from './prediction';
import type { SetlistState } from './share';
import type { SekaiSong } from '~/types/sekai';
import type { PredictionItem } from '~/types/sekai-prediction';

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

// "MC", "MC①", "MC(11)", optionally followed by a title.
const MC_LINE = /^MC\s*(?:[①-⑳]|\(\d+\))?(?:\s+(.*))?$/i;
// A decorated divider such as "━━ ENCORE ━━", "--- Intermission ---" or "== Day 2 ==".
const DIVIDER_LINE = /^[━─—=-]{2,}\s*(.*?)\s*[━─—=-]*$/;
const ENCORE_LABEL = /^(?:encore|en|アンコール)$/i;
const INTERMISSION_LABEL = /^(?:intermission|幕間)$/i;

/**
 * Builder rows from a pasted setlist, keeping what parseSetlistText drops: songs keep their
 * catalog ids (a trailing "(Short ver.)" becomes remarks, "(VIRTUAL SINGER ver.)" the version),
 * unmatched lines become custom songs,
 * and MC / encore / intermission lines become their own rows. Reads exportText's output back.
 */
export function parseSetlistItems(text: string, index: Map<string, string>): PredictionItem[] {
  const items: PredictionItem[] = [];
  let inEncore = false;
  const encoreRow = () => {
    inEncore = true;
    items.push({ id: itemId(), type: 'encore' });
  };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const divider = DIVIDER_LINE.exec(line);
    if (ENCORE_LINE.test(line) || (divider && ENCORE_LABEL.test(divider[1]))) {
      encoreRow();
      continue;
    }
    if (divider) {
      const title = divider[1];
      items.push(
        !title || INTERMISSION_LABEL.test(title)
          ? { id: itemId(), type: 'intermission' }
          : { id: itemId(), type: 'intermission', title }
      );
      continue;
    }
    const mc = MC_LINE.exec(line);
    if (mc) {
      items.push({ id: itemId(), type: 'mc', title: mc[1]?.trim() || 'MC' });
      continue;
    }
    const numbered = NUMBERING.exec(line);
    if (numbered?.[1] && !inEncore) encoreRow();
    const title = numbered ? line.slice(numbered[0].length) : line;
    const note = TRAILING_NOTE.exec(title)?.[0];
    const bare = note ? title.slice(0, -note.length) : title;
    const remarks = note?.replace(/^\s*[(（[［]\s*|\s*[)）\]］]\s*$/g, '');
    const whole = index.get(normalizeTitle(title)) ?? index.get(normalizeTitle(line));
    const songId = whole ?? index.get(normalizeTitle(bare));
    if (whole) items.push({ id: itemId(), type: 'song', songId: whole });
    else if (songId) items.push(songItem(itemId(), songId, remarks));
    else
      items.push({
        id: itemId(),
        type: 'custom',
        name: bare || title,
        ...(remarks ? { remarks } : {})
      });
  }
  return items;
}
