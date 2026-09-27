import { sekaiSongs } from '~/utils/sekai-setlist/catalog';

// Static hosting: prerender a page for every catalog song, performed live or not.
export const onBeforePrerenderStart = () => sekaiSongs.map((s) => `/songs/${s.id}`);
