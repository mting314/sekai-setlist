// Credits, original release dates and event info for the song-info dialog and song page. Loaded
// on demand so the ~100 KB file stays out of the main bundle.
import type { SekaiSongDetails } from '~/types/sekai';

export type SongDetailsById = Record<string, SekaiSongDetails>;

let loading: Promise<SongDetailsById> | undefined;

export const loadSongDetails = (): Promise<SongDetailsById> =>
  (loading ??= import('../../../data/sekai/song-details.json').then(
    (m) => m.default as SongDetailsById,
    (error: unknown) => {
      loading = undefined; // let the next open try again
      throw error;
    }
  ));
