import { sekaiUnits } from '~/utils/sekai-setlist/catalog';

// Static hosting: prerender the six units and "Other".
export const onBeforePrerenderStart = () => sekaiUnits.map((u) => `/units/${u.id}`);
