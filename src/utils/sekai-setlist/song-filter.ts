// Song search/filter for the Sekai setlist builder. Songs are grouped by unit; a song with no
// owning unit is the "Other" bucket. Pure functions over the bundled catalog.
import { fuzzySearch, getSearchScore } from '~/utils/search';
import type { SekaiSong, SekaiUnitId } from '~/types/sekai';

export const NON_UNIT = 'other' as const;
export type UnitFilter = SekaiUnitId | typeof NON_UNIT;

// commissioned = written for Project Sekai; cover = a cover of an existing song.
export type SongKind = 'all' | 'commissioned' | 'cover';

export interface SongFilters {
  search: string;
  units: UnitFilter[]; // OR-ed; empty = all units
  kind: SongKind;
  yearFrom?: string;
  yearTo?: string;
}

export const EMPTY_SONG_FILTERS: SongFilters = { search: '', units: [], kind: 'all' };

const yearOf = (s: SekaiSong): string | undefined =>
  s.publishedAt ? new Date(s.publishedAt).getFullYear().toString() : undefined;

/** A song matches a unit filter value: a real unit id it carries, or 'other' when it has none. */
export function songMatchesUnit(song: SekaiSong, unit: UnitFilter): boolean {
  if (unit === NON_UNIT) return song.units.length === 0;
  return song.units.includes(unit);
}

export const songReleaseYears = (songs: SekaiSong[]): string[] =>
  [...new Set(songs.map(yearOf).filter((y): y is string => !!y))].toSorted();

const searchable = (song: SekaiSong) => ({
  id: song.id,
  name: song.title,
  englishName: song.englishName,
  phoneticName: song.pronunciation
});

/**
 * How a search matches the song's event nicknames: 2 = exactly ("saki1"), 1 = as a prefix of at
 * least three characters ("wl3" for "wl3-4"), 0 = not at all.
 */
function nicknameMatch(song: SekaiSong, search: string): 0 | 1 | 2 {
  const q = search.trim().toLowerCase();
  if (!q || !song.nicknames) return 0;
  if (song.nicknames.includes(q)) return 2;
  return q.length >= 3 && song.nicknames.some((n) => n.startsWith(q)) ? 1 : 0;
}

/** Event nickname, title, kana reading (also typed as romaji) or EN name. */
export const songMatchesSearch = (song: SekaiSong, search: string): boolean =>
  nicknameMatch(song, search) > 0 || fuzzySearch(searchable(song), search);

// An exact nickname beats an exact title (100); a nickname prefix ranks below title matches.
const NICKNAME_SCORE = [0, 70, 110] as const;
const searchScore = (song: SekaiSong, search: string) =>
  Math.max(NICKNAME_SCORE[nicknameMatch(song, search)], getSearchScore(searchable(song), search));

/** Best search matches first, as in the-sorter's song search. */
export const rankBySearch = (songs: SekaiSong[], search: string): SekaiSong[] =>
  search.trim() ? songs.toSorted((a, b) => searchScore(b, search) - searchScore(a, search)) : songs;

/** One song against the search / unit / kind / release-year filters. */
export function songMatchesFilters(song: SekaiSong, filters: SongFilters): boolean {
  if (!songMatchesSearch(song, filters.search)) return false;
  if (filters.units.length > 0 && !filters.units.some((u) => songMatchesUnit(song, u)))
    return false;
  if (filters.kind === 'commissioned' && !song.commissioned) return false;
  if (filters.kind === 'cover' && song.commissioned) return false;
  const year = yearOf(song);
  if (filters.yearFrom && (!year || year < filters.yearFrom)) return false;
  if (filters.yearTo && (!year || year > filters.yearTo)) return false;
  return true;
}

export const filterSongs = (songs: SekaiSong[], filters: SongFilters): SekaiSong[] =>
  songs.filter((song) => songMatchesFilters(song, filters));
