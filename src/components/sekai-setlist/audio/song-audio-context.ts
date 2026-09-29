import { createContext, useContext } from 'react';
import type { AudioKind } from '~/types/sekai';

/** The song (and version) being loaded or played. */
export interface NowPlaying {
  songId: string;
  version: AudioKind;
  status: 'loading' | 'playing';
}

export interface SongAudioControls {
  playing?: NowPlaying;
  /** Plays a song's version, or stops it if that's what's playing. */
  toggle: (songId: string, version?: AudioKind) => void;
}

/** Song playback (a no-op outside SongAudioProvider). */
export const SongAudioContext = createContext<SongAudioControls>({ toggle: () => {} });

export const useSongAudio = () => useContext(SongAudioContext);
