// Each song's audio files (data/sekai/song-audio.json). Loaded on the first play, so it stays out
// of the main bundle.
import type { SongAudio } from '~/types/sekai';

export type SongAudioById = Record<string, SongAudio>;

let loading: Promise<SongAudioById> | undefined;

export const loadSongAudio = (): Promise<SongAudioById> =>
  (loading ??= import('../../../data/sekai/song-audio.json').then(
    (m) => m.default as SongAudioById,
    (error: unknown) => {
      loading = undefined; // let the next play try again
      throw error;
    }
  ));
