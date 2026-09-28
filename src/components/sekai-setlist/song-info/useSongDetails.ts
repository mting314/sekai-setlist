import { useEffect, useState } from 'react';
import { loadSongDetails, type SongDetailsById } from '~/utils/sekai-setlist/song-details';
import type { SekaiSongDetails } from '~/types/sekai';

/** A song's credits, release date and events; undefined until the details file has loaded. */
export function useSongDetails(songId: string): SekaiSongDetails | undefined {
  const [all, setAll] = useState<SongDetailsById>();
  useEffect(() => {
    let active = true;
    void loadSongDetails().then((d) => active && setAll(d));
    return () => {
      active = false;
    };
  }, []);
  return all && (all[songId] ?? {});
}
