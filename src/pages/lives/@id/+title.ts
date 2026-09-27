import type { PageContext } from 'vike/types';
import { getSekaiLive } from '~/utils/sekai-setlist/live-data';

export const title = (pageContext: PageContext) =>
  `${getSekaiLive(pageContext.routeParams.id)?.name ?? 'Live'} · Project Sekai Setlists`;
