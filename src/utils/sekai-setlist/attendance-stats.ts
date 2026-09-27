// Stats over your attendance log: lives and shows attended, songs heard (catalog songs in the
// setlists of attended shows) and how often, per unit, and what you haven't heard yet — all
// filtered by how you attended (in person / viewing / stream).
import { liveShows, showPerformance } from './shows';
import type { Attendance, ShowAttendance } from './attendance';
import type {
  AttendanceHow,
  SekaiLive,
  SekaiLivePerformance,
  SekaiLiveShow,
  SekaiSong
} from '~/types/sekai';

export interface AttendedShow {
  live: SekaiLive;
  show: SekaiLiveShow;
  entry: ShowAttendance;
  perf?: SekaiLivePerformance; // undefined = setlist not recorded
}

const showDate = (s: AttendedShow) => s.show.date ?? s.live.startDate ?? '';

/**
 * Every logged show, newest first. Show ids no longer in shows.json are kept (labelled by id)
 * so re-curating a live never silently drops someone's log.
 */
export function attendedShows(
  a: Attendance,
  lives: SekaiLive[],
  showsOf: (live: SekaiLive) => SekaiLiveShow[] = liveShows
): AttendedShow[] {
  const out: AttendedShow[] = [];
  for (const live of lives) {
    const byShow = a.shows[live.id];
    if (!byShow) continue;
    const shows = showsOf(live);
    shows.forEach((show) => {
      const entry = byShow[show.id];
      if (entry) out.push({ live, show, entry, perf: showPerformance(live, show) });
    });
    for (const [id, entry] of Object.entries(byShow))
      if (!shows.some((s) => s.id === id)) out.push({ live, show: { id, label: id }, entry });
  }
  return out.toSorted(
    (x, y) => showDate(y).localeCompare(showDate(x)) || x.show.id.localeCompare(y.show.id)
  );
}

export interface AttendanceStats {
  shows: AttendedShow[]; // those counted under the how filter
  lives: number;
  songsHeard: Map<string, number>; // catalog song id → times heard
  unrecorded: number; // counted shows whose setlist isn't in the data
  byUnit: Record<string, number>; // distinct songs heard per unit ('other' = no unit)
}

export function attendanceStats(
  all: AttendedShow[],
  hows: readonly AttendanceHow[],
  getSong: (id: string) => SekaiSong | undefined
): AttendanceStats {
  const shows = all.filter((s) => hows.includes(s.entry.how));
  const songsHeard = new Map<string, number>();
  for (const s of shows)
    for (const song of s.perf?.songs ?? [])
      if (song.songId) songsHeard.set(song.songId, (songsHeard.get(song.songId) ?? 0) + 1);

  const byUnit: Record<string, number> = {};
  for (const id of songsHeard.keys()) {
    const units = getSong(id)?.units ?? [];
    for (const u of units.length ? units : ['other']) byUnit[u] = (byUnit[u] ?? 0) + 1;
  }

  return {
    shows,
    lives: new Set(shows.map((s) => s.live.id)).size,
    songsHeard,
    unrecorded: shows.filter((s) => !s.perf).length,
    byUnit
  };
}

/** How many times you heard one song, per way of attending. */
export function timesHeard(all: AttendedShow[], songId: string): Record<AttendanceHow, number> {
  const out: Record<AttendanceHow, number> = { in_person: 0, viewing: 0, stream: 0 };
  for (const s of all)
    for (const song of s.perf?.songs ?? []) if (song.songId === songId) out[s.entry.how]++;
  return out;
}
