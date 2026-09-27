// Project Sekai asset URLs.
//
// Song jackets are hotlinked from the sekai.best CDN. Its Cloudflare rule rejects requests whose
// Referer is a third-party site, so every <img> that loads a jacket must set
// referrerPolicy="no-referrer" (see SongJacket). Unit and character icons are bundled under
// public/assets/sekai because the CDN has no endpoint for them.
import { join } from 'path-browserify';
import { getAssetUrl } from '~/utils/assets';

const CDN = 'https://storage.sekai.best/sekai-jp-assets';

/** Song jacket URL. Undefined when the song has no assetbundle. */
export function jacketUrl(assetbundleName?: string): string | undefined {
  if (!assetbundleName) return undefined;
  return `${CDN}/music/jacket/${assetbundleName}/${assetbundleName}.webp`;
}

export const unitIconUrl = (unit: string) =>
  getAssetUrl(join('assets/sekai/units', `${unit}.webp`));

export const characterIconUrl = (id: number) =>
  getAssetUrl(join('assets/sekai/chara', `${id}.webp`));
