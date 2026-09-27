/**
 * One Project Sekai song and every live it was performed at.
 */

import { useTranslation } from 'react-i18next';
import { usePageContext } from 'vike-react/usePageContext';
import { Stack } from 'styled-system/jsx';
import { Metadata } from '~/components/layout/Metadata';
import { NotFound } from '~/components/sekai-setlist/NotFound';
import { SongPage } from '~/components/sekai-setlist/SongPage';
import { getSekaiSong, sekaiSongName } from '~/utils/sekai-setlist/catalog';

export function Page() {
  const { i18n } = useTranslation();
  const song = getSekaiSong(usePageContext().routeParams.id ?? '');
  if (!song) return <NotFound />;

  return (
    <>
      <Metadata title={sekaiSongName(song.id, i18n.language)} helmet />
      <Stack w="full" maxW="4xl" mx="auto" py={{ base: 2, md: 4 }}>
        <SongPage song={song} />
      </Stack>
    </>
  );
}
