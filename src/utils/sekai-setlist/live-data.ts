// Past and upcoming lives (data/sekai/lives.json). Kept out of catalog.ts so pages that only
// need songs don't bundle every setlist.
import livesData from '../../../data/sekai/lives.json';
import liveImagesData from '../../../data/sekai/live-images.json';
import type { SekaiLive } from '~/types/sekai';

const liveImages = liveImagesData as Record<string, string>;

export const sekaiLives = (livesData as unknown as SekaiLive[]).map((l) => ({
  ...l,
  image: l.image ?? liveImages[l.id]
}));
const liveById = new Map(sekaiLives.map((l) => [l.id, l]));

export const getSekaiLive = (id: string | undefined) => (id ? liveById.get(id) : undefined);

export const getLiveImage = (liveOrId: SekaiLive | string | undefined): string | undefined => {
  if (!liveOrId) return undefined;
  if (typeof liveOrId === 'string') {
    return liveImages[liveOrId] ?? liveById.get(liveOrId)?.image;
  }
  return liveOrId.image ?? liveImages[liveOrId.id];
};

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

/** Catalog songs performed at any recorded live. */
export const performedSongIds = new Set(
  sekaiLives.flatMap((l) => l.performances.flatMap((p) => p.songs.flatMap((s) => s.songId ?? [])))
);
