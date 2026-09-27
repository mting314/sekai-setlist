// Page links. Setlists travel in the hash (`#s=…`, see share.ts) and the live in `?live=`, so
// prerendered pages stay static and pick both up on the client.
import { join } from 'path-browserify';
import { encodeState, type SetlistState } from './share';

const page = (path: string, state?: SetlistState, live?: string) =>
  join(import.meta.env.BASE_URL, path) +
  (live ? `?live=${encodeURIComponent(live)}` : '') +
  (state ? `#${encodeState(state)}` : '');

export const homeHref = () => page('/');
export const livesHref = () => page('/lives');
/** The builder, optionally opened on a setlist or as a new prediction for a live. */
export const builderHref = (state?: SetlistState, live?: string) => page('/builder', state, live);
/** Mark a prediction against a live's real setlist (either may be picked on the page). */
export const markHref = (prediction?: SetlistState, live?: string) =>
  page('/mark', prediction, live ?? prediction?.live);

/** `?live=` of the current page (client only). */
export const liveParam = () => new URLSearchParams(window.location.search).get('live') ?? undefined;
