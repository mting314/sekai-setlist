import type { PageContext } from 'vike/types';
import { getSekaiUnit } from '~/utils/sekai-setlist/catalog';

export const title = (pageContext: PageContext) =>
  `${getSekaiUnit(pageContext.routeParams.id ?? '')?.name ?? 'Unit'} · Project Sekai Setlists`;
