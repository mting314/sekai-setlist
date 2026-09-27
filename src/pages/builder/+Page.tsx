/**
 * Project Sekai Setlist Builder Page
 * Build a setlist prediction for a live (or a dream setlist), save it locally and share a link.
 */

import { useTranslation } from 'react-i18next';
import { join } from 'path-browserify';
import { Stack } from 'styled-system/jsx';
import { Metadata } from '~/components/layout/Metadata';
import { Link } from '~/components/ui/link';
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
              defaultValue:
                'Build your setlist prediction (or a dream setlist), save it and share it with a link.'
            })}
          </Text>
          <Link href={join(import.meta.env.BASE_URL, '/lives')} fontSize="sm">
            {t('sekaiSetlist.lives.fromBuilder', {
              defaultValue: 'Browse past live setlists →'
            })}
          </Link>
        </Stack>
        <SekaiSetlistEditor />
      </Stack>
    </>
  );
}
