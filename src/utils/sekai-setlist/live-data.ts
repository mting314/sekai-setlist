// Past and upcoming lives (data/sekai/lives.json). Kept out of catalog.ts so pages that only
// need songs don't bundle every setlist.
import livesData from '../../../data/sekai/lives.json';
import type { SekaiLive } from '~/types/sekai';

export const sekaiLives = livesData as unknown as SekaiLive[];
const liveById = new Map(sekaiLives.map((l) => [l.id, l]));

export const getSekaiLive = (id: string | undefined) => (id ? liveById.get(id) : undefined);

export const sekaiLiveName = (live: SekaiLive, lang: string) =>
  lang.startsWith('ja') && live.nameJa ? live.nameJa : live.name;
