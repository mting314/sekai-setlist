import type { PageContext } from 'vike/types';
import { getSekaiSong } from '~/utils/sekai-setlist/catalog';

export const title = (pageContext: PageContext) => {
  const song = getSekaiSong(pageContext.routeParams.id ?? '');
  return `${song ? (song.englishName ?? song.title) : 'Song'} · Project Sekai Setlists`;
};
