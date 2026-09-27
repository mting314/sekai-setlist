/**
 * Predictions hub: how the game works, saved predictions, lives to predict and to mark against.
 */

import { useTranslation } from 'react-i18next';
import { Stack } from 'styled-system/jsx';
import { Metadata } from '~/components/layout/Metadata';
import { PredictionsHome } from '~/components/sekai-setlist/PredictionsHome';

export function Page() {
  const { t } = useTranslation();
  return (
    <>
      <Metadata
        title={t('game.homeTitle', { defaultValue: 'Project Sekai Setlist Predictions' })}
        helmet
      />
      <Stack w="full" maxW="4xl" mx="auto" py={{ base: 2, md: 4 }}>
        <PredictionsHome />
      </Stack>
    </>
  );
}
