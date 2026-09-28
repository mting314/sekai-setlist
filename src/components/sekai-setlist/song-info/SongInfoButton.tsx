/**
 * The (i) next to a song name that opens its song-info dialog. It swallows the pointer and
 * double-click events so it never starts a drag or triggers a row's double-click-to-add.
 */
import { useTranslation } from 'react-i18next';
import { BiInfoCircle } from 'react-icons/bi';
import { useSongInfo } from './song-info-context';
import { IconButton } from '~/components/ui/styled/icon-button';
import { sekaiSongName } from '~/utils/sekai-setlist/catalog';

const stop = (e: React.SyntheticEvent) => e.stopPropagation();

export function SongInfoButton({ songId }: { songId: string }) {
  const { t, i18n } = useTranslation();
  const openSong = useSongInfo();
  const name = sekaiSongName(songId, i18n.language);
  const label = t('songInfo.open', { name, defaultValue: `Song info: ${name}` });

  return (
    <IconButton
      size="xs"
      variant="ghost"
      data-song-info={songId}
      aria-label={label}
      title={label}
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        openSong(songId);
      }}
      onDoubleClick={stop}
      onPointerDown={stop}
      onKeyDown={stop}
      flexShrink={0}
      w="6"
      minW="6"
      h="6"
      p={0}
      color="fg.muted"
      _hover={{ color: 'fg.default' }}
    >
      <BiInfoCircle size={16} />
    </IconButton>
  );
}
