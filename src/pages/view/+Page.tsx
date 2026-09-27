/**
 * A shared Project Sekai setlist prediction, read-only.
 */

import { useTranslation } from 'react-i18next';
import { Stack } from 'styled-system/jsx';
import { Metadata } from '~/components/layout/Metadata';
import { Text } from '~/components/ui/styled/text';
import { ViewPrediction } from '~/components/sekai-setlist/ViewPrediction';

export function Page() {
  const { t } = useTranslation();
  const title = t('view.title', { defaultValue: 'Shared Prediction' });

  return (
    <>
      <Metadata title={title} helmet />
      <Stack gap={4} w="full" maxW="3xl" mx="auto" py={{ base: 2, md: 4 }}>
        <Text fontSize={{ base: '2xl', md: '3xl' }} fontWeight="bold">
          {title}
        </Text>
        <ViewPrediction />
      </Stack>
    </>
  );
}
