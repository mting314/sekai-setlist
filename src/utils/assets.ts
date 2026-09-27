import { join } from 'path-browserify';

export const getAssetUrl = (path: string) => {
  // BASE_URL is Vite's resolved `base` (always set, '/' by default), so dev URLs stay absolute.
  return join(import.meta.env.BASE_URL, path);
};
