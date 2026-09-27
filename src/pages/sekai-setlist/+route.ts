import type { RouteSync } from 'vike/types';

export const route: RouteSync = (pageContext) => {
  return pageContext.urlPathname === '/sekai-setlist';
};
