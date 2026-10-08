// Page links. Shared predictions travel in the hash (`#p=…`, see share.ts), saved ones by id in
// `?prediction=` and the live in `?live=`, so prerendered pages stay static and pick them up on
// the client.
import { join } from 'path-browserify';
import { encodePrediction } from './share';
import type { SekaiPrediction } from '~/types/sekai-prediction';

const page = (path: string, query: Record<string, string | undefined> = {}, hash?: string) => {
  const q = new URLSearchParams(
    Object.entries(query).filter((e): e is [string, string] => !!e[1])
  ).toString();
  return join(import.meta.env.BASE_URL, path) + (q ? `?${q}` : '') + (hash ? `#${hash}` : '');
};

export interface PredictionTarget {
  prediction?: string; // a saved prediction's id
  live?: string; // a lives.json id
  share?: SekaiPrediction; // carried whole in the hash
}
const predictionPage = (path: string, { prediction, live, share }: PredictionTarget = {}) =>
  page(path, { prediction, live }, share && encodePrediction(share));

export const homeHref = () => page('/');
export const livesHref = () => page('/lives');
export const liveHref = (id: string) => page(`/lives/${encodeURIComponent(id)}`);
export const songsHref = () => page('/songs');
export const songHref = (id: string) => page(`/songs/${encodeURIComponent(id)}`);
export const unitHref = (id: string) => page(`/units/${encodeURIComponent(id)}`);
export const predictHref = () => page('/predict');
/** The builder: a saved prediction, a shared one to import, or a new one for a live. */
export const builderHref = (target?: PredictionTarget) => predictionPage('/builder', target);
/** Read-only page for a shared prediction (`share`) or a saved one (`prediction`). */
export const viewHref = (target?: PredictionTarget) => predictionPage('/view', target);
/** Absolute /view link for sharing a prediction (client only). */
export const shareLink = (p: SekaiPrediction) =>
  new URL(viewHref({ share: p }), window.location.origin).href;
/** Mark a prediction against a live's real setlist (either may be picked on the page). */
export const markHref = (target?: PredictionTarget) =>
  predictionPage('/mark', { ...target, live: target?.live ?? target?.share?.live });

const param = (name: string) => new URLSearchParams(window.location.search).get(name) ?? undefined;
/** `?live=` of the current page (client only). */
export const liveParam = () => param('live');
/** `?prediction=` of the current page (client only). */
export const predictionParam = () => param('prediction');
