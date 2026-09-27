// The shows of a live: what attendance is logged against. A setlist (performance) can cover
// several shows (CL1's one setlist over three days), and a show can have no recorded setlist
// (CL4 Tokyo). Curated per live in data/sekai/shows.json; otherwise one show per setlist.
import showsData from '../../../data/sekai/shows.json';
import type { SekaiLive, SekaiLivePerformance, SekaiLiveShow } from '~/types/sekai';

const curatedShows = showsData as Record<string, SekaiLiveShow[]>;

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

// "October 16, 2021" is one day; "January 28-30, 2022" or "… (Yokohama) / … (Osaka)" aren't.
const isSingleDay = (live: SekaiLive) => !/[-–/]|\band\b/.test(live.date);

/** One show per setlist ('main' for an unnamed or missing setlist). */
export function defaultShows(live: SekaiLive): SekaiLiveShow[] {
  const date = isSingleDay(live) ? live.startDate : undefined;
  const withDate = date ? { date } : {};
  if (live.performances.length === 0) return [{ id: 'main', label: live.date, ...withDate }];
  const used = new Set<string>();
  return live.performances.map((p, i) => {
    let id = slugify(p.name) || 'main';
    if (used.has(id)) id = `${id}-${i + 1}`;
    used.add(id);
    return { id, label: p.name || live.date, performance: p.name, ...withDate };
  });
}

/** The live's shows: curated when present, else derived from its setlists. */
export function liveShows(
  live: SekaiLive,
  curated: Record<string, SekaiLiveShow[]> = curatedShows
): SekaiLiveShow[] {
  return curated[live.id] ?? defaultShows(live);
}

/** The setlist a show used, if recorded. */
export function showPerformance(
  live: SekaiLive,
  show: SekaiLiveShow
): SekaiLivePerformance | undefined {
  if (show.performance === undefined) return undefined;
  return live.performances.find((p) => p.name === show.performance);
}

export { curatedShows };
