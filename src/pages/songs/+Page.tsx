/**
 * Project Sekai song catalog, with how often each song was performed live.
 */

import { useTranslation } from 'react-i18next';
import { Stack } from 'styled-system/jsx';
import { Metadata } from '~/components/layout/Metadata';
import { Text } from '~/components/ui/styled/text';
import { SongBrowser } from '~/components/sekai-setlist/SongBrowser';

export function Page() {
  const { t } = useTranslation();
  const title = t('song.title', { defaultValue: 'Project Sekai Songs' });

  return (
    <>
      <Metadata title={title} helmet />
      <Stack gap={4} w="full" maxW="4xl" mx="auto" py={{ base: 2, md: 4 }}>
        <Stack gap={1}>
          <Text as="h1" fontSize={{ base: '2xl', md: '3xl' }} fontWeight="bold">
            {title}
          </Text>
          <Text color="fg.muted" fontSize="md">
            {t('song.description', {
              defaultValue: 'Every song in the game and how many lives performed it.'
            })}
          </Text>
        </Stack>
        <SongBrowser />
        <Text color="fg.subtle" fontSize="xs">
          {t('sekaiSetlist.credit', {
            defaultValue: 'Song data and jackets from sekai.best / Sekai master DB.'
          })}
        </Text>
      </Stack>
    </>
  );
}
