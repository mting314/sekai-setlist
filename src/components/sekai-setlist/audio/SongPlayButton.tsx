/**
 * The play button next to a song name. It plays the version the row stands for (a VIRTUAL SINGER
 * ver. row plays that recording) and, like the (i) button, never starts a drag or a row's
 * double-click-to-add.
 */
import { useTranslation } from 'react-i18next';
import { BiPause, BiPlay } from 'react-icons/bi';
import { useSongAudio } from './song-audio-context';
import { IconButton } from '~/components/ui/styled/icon-button';
import { Spinner } from '~/components/ui/styled/spinner';
import { sekaiSongName } from '~/utils/sekai-setlist/catalog';
import type { AudioKind } from '~/types/sekai';

const stop = (e: React.SyntheticEvent) => e.stopPropagation();

export function SongPlayButton({ songId, version }: { songId: string; version?: AudioKind }) {
  const { t, i18n } = useTranslation();
  const { playing, toggle } = useSongAudio();
  const kind = version ?? 'sekai';
  const status =
    playing?.songId === songId && playing.version === kind ? playing.status : undefined;
  const song = sekaiSongName(songId, i18n.language);
  const name =
    kind === 'virtual_singer'
      ? `${song} (${t('version.virtualSinger', { defaultValue: 'VIRTUAL SINGER ver.' })})`
      : kind === 'original'
        ? `${song} (${t('version.original', { defaultValue: 'Original ver.' })})`
        : song;
  const label = status
    ? t('audio.pause', { name, defaultValue: `Pause: ${name}` })
    : t('audio.play', { name, defaultValue: `Play: ${name}` });

  return (
    <IconButton
      size="xs"
      variant="ghost"
      data-song-play={songId}
      data-audio-version={kind}
      data-audio-status={status}
      aria-label={label}
      title={label}
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        toggle(songId, kind);
      }}
      onDoubleClick={stop}
      onPointerDown={stop}
      onKeyDown={stop}
      flexShrink={0}
      w="6"
      minW="6"
      h="6"
      p={0}
      color={status ? 'fg.default' : 'fg.muted'}
      _hover={{ color: 'fg.default' }}
    >
      {status === 'loading' ? (
        <Spinner borderWidth="1.5px" width="3.5" height="3.5" />
      ) : status === 'playing' ? (
        <BiPause size={16} />
      ) : (
        <BiPlay size={16} />
      )}
    </IconButton>
  );
}
