/**
 * Project Sekai Setlist Builder Page
 * A standalone setlist builder for Project Sekai songs (no performances, scoring or backend).
 */

import { useTranslation } from 'react-i18next';
import { Stack } from 'styled-system/jsx';
import { Metadata } from '~/components/layout/Metadata';
import { Text } from '~/components/ui/styled/text';
import { SekaiSetlistEditor } from '~/components/sekai-setlist/SekaiSetlistEditor';

export function Page() {
  const { t } = useTranslation();
  const title = t('sekaiSetlist.title', { defaultValue: 'Project Sekai Setlist Builder' });

  return (
    <>
      <Metadata title={title} helmet />
      <Stack gap={4} w="full" maxW="4xl" mx="auto" py={{ base: 2, md: 4 }}>
        <Stack gap={1}>
          <Text fontSize={{ base: '2xl', md: '3xl' }} fontWeight="bold">
            {title}
          </Text>
          <Text color="fg.muted" fontSize="md">
            {t('sekaiSetlist.description', {
              defaultValue: 'Build a dream Project Sekai setlist and share it with a link.'
            })}
          </Text>
        </Stack>
        <SekaiSetlistEditor />
      </Stack>
    </>
  );
}
