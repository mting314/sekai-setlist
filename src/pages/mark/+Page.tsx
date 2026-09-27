/**
 * Mark a Project Sekai setlist prediction against the real setlist.
 */

import { useTranslation } from 'react-i18next';
import { Stack } from 'styled-system/jsx';
import { Metadata } from '~/components/layout/Metadata';
import { Text } from '~/components/ui/styled/text';
import { MarkPrediction } from '~/components/sekai-setlist/MarkPrediction';

export function Page() {
  const { t } = useTranslation();
  const title = t('game.markTitle', { defaultValue: 'Mark a Prediction' });

  return (
    <>
      <Metadata title={title} helmet />
      <Stack gap={4} w="full" maxW="4xl" mx="auto" py={{ base: 2, md: 4 }}>
        <Stack gap={1}>
          <Text fontSize={{ base: '2xl', md: '3xl' }} fontWeight="bold">
            {title}
          </Text>
          <Text color="fg.muted" fontSize="md">
            {t('game.markDescription', {
              defaultValue: 'See how close your prediction came to what was actually performed.'
            })}
          </Text>
        </Stack>
        <MarkPrediction />
      </Stack>
    </>
  );
}
