// Past and upcoming lives (data/sekai/lives.json). Kept out of catalog.ts so pages that only
// need songs don't bundle every setlist.
import livesData from '../../../data/sekai/lives.json';
import type { SekaiLive } from '~/types/sekai';

export const sekaiLives = livesData as unknown as SekaiLive[];
const liveById = new Map(sekaiLives.map((l) => [l.id, l]));

export const getSekaiLive = (id: string | undefined) => (id ? liveById.get(id) : undefined);

export const sekaiLiveName = (live: SekaiLive, lang: string) =>
  lang.startsWith('ja') && live.nameJa ? live.nameJa : live.name;

const byStart = (dir: 1 | -1) => (a: SekaiLive, b: SekaiLive) =>
  dir * (a.startDate ?? '').localeCompare(b.startDate ?? '');

/** Announced lives with no published setlist yet, soonest first. */
export const awaitingLives = sekaiLives
  .filter((l) => l.performances.length === 0)
  .toSorted(byStart(1));

/** Lives with a setlist, newest first. */
export const livesWithSetlists = sekaiLives
  .filter((l) => l.performances.length > 0)
  .toSorted(byStart(-1));
