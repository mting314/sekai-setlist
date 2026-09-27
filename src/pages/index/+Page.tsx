/**
 * Project Sekai Setlist Predictions home.
 */

import { Stack } from 'styled-system/jsx';
import { Metadata } from '~/components/layout/Metadata';
import { PredictionsHome } from '~/components/sekai-setlist/PredictionsHome';

export function Page() {
  return (
    <>
      <Metadata helmet />
      <Stack w="full" maxW="4xl" mx="auto" py={{ base: 2, md: 4 }}>
        <PredictionsHome />
      </Stack>
    </>
  );
}
