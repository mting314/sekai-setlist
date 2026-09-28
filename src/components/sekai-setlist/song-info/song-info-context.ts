import { createContext, useContext } from 'react';

/** Opens the song-info dialog for a song id (a no-op outside SongInfoProvider). */
export const SongInfoContext = createContext<(songId: string) => void>(() => {});

export const useSongInfo = () => useContext(SongInfoContext);
