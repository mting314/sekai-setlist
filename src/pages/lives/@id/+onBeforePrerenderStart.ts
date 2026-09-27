import { sekaiLives } from '~/utils/sekai-setlist/live-data';

// Static hosting: prerender a page for every live.
export const onBeforePrerenderStart = () =>
  sekaiLives.map((l) => `/lives/${encodeURIComponent(l.id)}`);
