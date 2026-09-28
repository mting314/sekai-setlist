/**
 * Opens the song-info dialog from anywhere: `useSongInfo()(songId)`. Mounted once in the page
 * layout; the dialog's code is only fetched the first time a song is opened.
 */
import { Component, Suspense, lazy, useCallback, useState, type ReactNode } from 'react';
import { usePageContext } from 'vike-react/usePageContext';
import { SongInfoContext } from './song-info-context';

const SongInfoDialog = lazy(() =>
  import('./SongInfoDialog').then((m) => ({ default: m.SongInfoDialog }))
);

/** Renders nothing if the dialog's chunk fails to load (a stale tab after a redeploy). */
class DialogBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function SongInfoProvider({ children }: { children: ReactNode }) {
  // The layout stays mounted across client-side navigation, so the dialog remembers the page it
  // was opened on and is only open there: following one of its links closes it.
  const page = (usePageContext() as { urlPathname?: string } | undefined)?.urlPathname;
  const [songId, setSongId] = useState<string>();
  const [openOn, setOpenOn] = useState<{ page?: string }>();
  const openSong = useCallback(
    (id: string) => {
      setSongId(id);
      setOpenOn({ page });
    },
    [page]
  );

  return (
    <SongInfoContext.Provider value={openSong}>
      {children}
      {songId && (
        <DialogBoundary>
          <Suspense fallback={null}>
            <SongInfoDialog
              key={songId}
              songId={songId}
              open={!!openOn && openOn.page === page}
              onOpenChange={(open) => !open && setOpenOn(undefined)}
            />
          </Suspense>
        </DialogBoundary>
      )}
    </SongInfoContext.Provider>
  );
}
