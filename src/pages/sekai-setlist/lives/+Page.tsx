/**
 * Project Sekai Past Setlists Page
 * Setlists of past COLORFUL LIVE, Thanks Festival, Sekai Symphony and Connect Live shows.
 */

import { useTranslation } from 'react-i18next';
import { join } from 'path-browserify';
import { Stack } from 'styled-system/jsx';
import { Metadata } from '~/components/layout/Metadata';
import { Link } from '~/components/ui/link';
import { Text } from '~/components/ui/styled/text';
import { PastSetlists } from '~/components/sekai-setlist/PastSetlists';

export function Page() {
  const { t } = useTranslation();
  const title = t('sekaiSetlist.lives.title', { defaultValue: 'Project Sekai Past Setlists' });

  return (
    <>
      <Metadata title={title} helmet />
      <Stack gap={4} w="full" maxW="4xl" mx="auto" py={{ base: 2, md: 4 }}>
        <Stack gap={1}>
          <Text fontSize={{ base: '2xl', md: '3xl' }} fontWeight="bold">
            {title}
          </Text>
          <Text color="fg.muted" fontSize="md">
            {t('sekaiSetlist.lives.description', {
              defaultValue:
                'Setlists from COLORFUL LIVE, the Anniversary Thanks Festival, Sekai Symphony and Connect Lives.'
            })}
          </Text>
          <Link href={join(import.meta.env.BASE_URL, '/sekai-setlist')} fontSize="sm">
            {t('sekaiSetlist.lives.toBuilder', { defaultValue: '← Setlist builder' })}
          </Link>
        </Stack>
        <PastSetlists />
        <Text color="fg.subtle" fontSize="xs">
          {t('sekaiSetlist.lives.credit', {
            defaultValue: 'Setlists from the Project SEKAI Wiki (projectsekai.fandom.com).'
          })}
        </Text>
      </Stack>
    </>
  );
}
