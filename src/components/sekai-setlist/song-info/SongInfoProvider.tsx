/**
 * Opens the song-info dialog from anywhere: `useSongInfo()(songId)`. Mounted once in the page
 * layout; the dialog's code is only fetched the first time a song is opened.
 */
import { Suspense, lazy, useCallback, useState, type ReactNode } from 'react';
import { SongInfoContext } from './song-info-context';

const SongInfoDialog = lazy(() =>
  import('./SongInfoDialog').then((m) => ({ default: m.SongInfoDialog }))
);

export function SongInfoProvider({ children }: { children: ReactNode }) {
  const [songId, setSongId] = useState<string>();
  const [open, setOpen] = useState(false);
  const openSong = useCallback((id: string) => {
    setSongId(id);
    setOpen(true);
  }, []);

  return (
    <SongInfoContext.Provider value={openSong}>
      {children}
      {songId && (
        <Suspense fallback={null}>
          <SongInfoDialog key={songId} songId={songId} open={open} onOpenChange={setOpen} />
        </Suspense>
      )}
    </SongInfoContext.Provider>
  );
}
