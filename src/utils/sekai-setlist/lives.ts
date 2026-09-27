// Past-live browsing for the Sekai setlist builder: filter lives by series and by the same
// song filters as the song picker (search, unit, commissioned/cover), count how often songs were
// performed, and turn a past setlist into builder state. Pure functions over data/sekai/lives.json.
import { songMatchesFilters, type SongFilters } from './song-filter';
import type { SetlistState } from './share';
import type {
  SekaiLive,
  SekaiLivePerformance,
  SekaiLiveSeries,
  SekaiLiveSong,
  SekaiSong
} from '~/types/sekai';

export const LIVE_SERIES: SekaiLiveSeries[] = [
  'colorful_live',
  'thanks_festival',
  'sekai_symphony',
  'connect_live',
  'fan_meeting'
];

export interface LiveFilters extends Omit<SongFilters, 'yearFrom' | 'yearTo'> {
  series: SekaiLiveSeries[]; // OR-ed; empty = every series
}

export const EMPTY_LIVE_FILTERS: LiveFilters = { search: '', units: [], kind: 'all', series: [] };

type GetSong = (id: string) => SekaiSong | undefined;

export const hasSongFilters = (f: LiveFilters) =>
  f.search.trim() !== '' || f.units.length > 0 || f.kind !== 'all';

/**
 * A setlist entry against the song filters. Entries outside the catalog (collab songs, BGM)
 * only match a plain title search — they have no unit or commissioned flag to test.
 */
export function liveSongMatches(item: SekaiLiveSong, f: LiveFilters, getSong: GetSong): boolean {
  if (!hasSongFilters(f)) return true;
  const song = item.songId ? getSong(item.songId) : undefined;
  if (song) return songMatchesFilters(song, f);
  if (f.units.length > 0 || f.kind !== 'all') return false;
  return item.title.toLowerCase().includes(f.search.trim().toLowerCase());
}

export interface LiveMatch {
  live: SekaiLive;
  matches: number; // setlist entries matching the song filters (every entry when none are set)
}

/** Lives in the selected series, newest first; with song filters set, only lives with a match. */
export function filterLives(lives: SekaiLive[], f: LiveFilters, getSong: GetSong): LiveMatch[] {
  const active = hasSongFilters(f);
  return lives
    .filter((l) => f.series.length === 0 || f.series.includes(l.series))
    .map((live) => ({
      live,
      matches: live.performances.reduce(
        (n, p) => n + p.songs.filter((s) => liveSongMatches(s, f, getSong)).length,
        0
      )
    }))
    .filter((m) => !active || m.matches > 0)
    .toSorted((a, b) => (b.live.startDate ?? '').localeCompare(a.live.startDate ?? ''));
}

export interface SongStat {
  songId: string;
  lives: string[]; // live ids, newest first
  performances: number; // setlists (days / shows / legs) it appeared in
}

/**
 * How often each catalog song was performed across the given lives, most-played first. A song
 * counts once per setlist and once per live, so a reprise in the encore doesn't double-count.
 */
export function songStats(lives: SekaiLive[], f: LiveFilters, getSong: GetSong): SongStat[] {
  const stats = new Map<string, SongStat>();
  const newestFirst = lives.toSorted((a, b) =>
    (b.startDate ?? '').localeCompare(a.startDate ?? '')
  );
  for (const live of newestFirst) {
    if (f.series.length > 0 && !f.series.includes(live.series)) continue;
    for (const perf of live.performances) {
      const inPerf = new Set(
        perf.songs.filter((s) => s.songId && liveSongMatches(s, f, getSong)).map((s) => s.songId!)
      );
      for (const id of inPerf) {
        const st = stats.get(id) ?? { songId: id, lives: [], performances: 0 };
        st.performances++;
        if (!st.lives.includes(live.id)) st.lives.push(live.id);
        stats.set(id, st);
      }
    }
  }
  return [...stats.values()].toSorted(
    (a, b) =>
      b.lives.length - a.lives.length ||
      b.performances - a.performances ||
      Number(a.songId) - Number(b.songId)
  );
}

/** Index of the first encore song, if the setlist has an "Encore" divider. */
export const encoreStart = (perf: SekaiLivePerformance): number | undefined =>
  perf.markers.find((m) => /encore/i.test(m.label))?.at;

/** Builder state for a past setlist: catalog songs in order, encore kept, other entries dropped. */
export function performanceToState(live: SekaiLive, perf: SekaiLivePerformance): SetlistState {
  const start = encoreStart(perf);
  const songs: string[] = [];
  const encore: number[] = [];
  perf.songs.forEach((s, i) => {
    if (!s.songId) return;
    if (start !== undefined && i >= start) encore.push(songs.length);
    songs.push(s.songId);
  });
  return {
    title: perf.name ? `${live.name} (${perf.name})` : live.name,
    songs,
    encore,
    ordered: true
  };
}
