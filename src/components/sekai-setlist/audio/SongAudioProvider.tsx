/**
 * Plays songs from anywhere: `useSongAudio().toggle(songId, version)`. Mounted once in the page
 * layout with a single audio element, so starting a song stops the one before, and playback
 * carries on across client-side navigation.
 */
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { SongAudioContext, type NowPlaying } from './song-audio-context';
import { useToaster } from '~/context/ToasterContext';
import { loadSongAudio } from '~/utils/sekai-setlist/song-audio-data';
import { audioUrl, pickAudio } from '~/utils/sekai-setlist/song-audio';
import type { AudioKind } from '~/types/sekai';

// A few samples of silence. Played in the tap itself, it lets Safari start the real audio later,
// once the file has downloaded, outside the tap.
const SILENCE =
  'data:audio/wav;base64,UklGRiwAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQgAAACAgICAgICAgA==';

export function SongAudioProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { toast } = useToaster();
  const [playing, setPlaying] = useState<NowPlaying>();
  const current = useRef<NowPlaying>(undefined); // `playing`, for toggle without re-creating it
  const audioRef = useRef<HTMLAudioElement>(undefined);
  const blobUrl = useRef<string>(undefined);
  const request = useRef(0); // the latest toggle, so a slow download never plays over a newer one

  const set = useCallback((next?: NowPlaying) => {
    current.current = next;
    setPlaying(next);
  }, []);

  const toggle = useCallback(
    (songId: string, version: AudioKind = 'sekai') => {
      const n = ++request.current;
      const was = current.current;
      audioRef.current?.pause();
      if (was?.songId === songId && was.version === version) {
        set(undefined);
        return;
      }
      const failed = (key: string, defaultValue: string) => {
        if (n !== request.current) return;
        set(undefined);
        toast({ title: t(key, { defaultValue }), type: 'error' });
      };

      if (!audioRef.current) {
        audioRef.current = new Audio();
        // Not the silence ending while the file is still downloading.
        audioRef.current.addEventListener(
          'ended',
          () => current.current?.status === 'playing' && set(undefined)
        );
      }
      const audio = audioRef.current;
      if (!audio.canPlayType('audio/ogg; codecs=vorbis')) {
        failed('audio.unsupported', "Your browser can't play this audio");
        return;
      }
      audio.src = SILENCE;
      audio.play().catch(() => {});
      set({ songId, version, status: 'loading' });

      void (async () => {
        try {
          const path = pickAudio((await loadSongAudio())[songId], version);
          if (!path) {
            failed('audio.noAudio', 'No audio for this song');
            return;
          }
          // The wiki's CDN refuses a third-party Referer, which an audio element always sends.
          const res = await fetch(audioUrl(path), { referrerPolicy: 'no-referrer' });
          if (!res.ok) throw new Error(`audio: ${res.status}`);
          const blob = new Blob([await res.blob()], { type: 'audio/ogg' });
          if (n !== request.current) return;
          if (blobUrl.current) URL.revokeObjectURL(blobUrl.current);
          blobUrl.current = URL.createObjectURL(blob);
          audio.src = blobUrl.current;
          await audio.play();
          if (n === request.current) set({ songId, version, status: 'playing' });
        } catch {
          failed('audio.failed', 'Could not play audio');
        }
      })();
    },
    [set, t, toast]
  );

  const value = useMemo(() => ({ playing, toggle }), [playing, toggle]);
  return <SongAudioContext.Provider value={value}>{children}</SongAudioContext.Provider>;
}
