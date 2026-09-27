/**
 * Project Sekai live setlists home.
 */

import { Stack } from 'styled-system/jsx';
import { Metadata } from '~/components/layout/Metadata';
import { EventsHub } from '~/components/sekai-setlist/EventsHub';

export function Page() {
  return (
    <>
      <Metadata helmet />
      <Stack w="full" maxW="4xl" mx="auto" py={{ base: 2, md: 4 }}>
        <EventsHub />
      </Stack>
    </>
  );
}
