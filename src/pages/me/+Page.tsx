/**
 * My Lives: your attendance log and stats (or a shared log from a #a= link).
 */

import { useTranslation } from 'react-i18next';
import { Stack } from 'styled-system/jsx';
import { Metadata } from '~/components/layout/Metadata';
import { MyLives } from '~/components/sekai-setlist/MyLives';

export function Page() {
  const { t } = useTranslation();
  return (
    <>
      <Metadata title={t('attendance.title', { defaultValue: 'My Lives' })} helmet />
      <Stack w="full" maxW="4xl" mx="auto" py={{ base: 2, md: 4 }}>
        <MyLives />
      </Stack>
    </>
  );
}
