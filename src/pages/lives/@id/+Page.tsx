/**
 * One Project Sekai live: its setlists, notes and prediction actions.
 */

import { useTranslation } from 'react-i18next';
import { usePageContext } from 'vike-react/usePageContext';
import { Stack } from 'styled-system/jsx';
import { Metadata } from '~/components/layout/Metadata';
import { LivePage } from '~/components/sekai-setlist/LivePage';
import { NotFound } from '~/components/sekai-setlist/NotFound';
import { getSekaiLive, sekaiLiveName } from '~/utils/sekai-setlist/live-data';

export function Page() {
  const { i18n } = useTranslation();
  const live = getSekaiLive(usePageContext().routeParams.id);
  if (!live) return <NotFound />;

  return (
    <>
      <Metadata title={sekaiLiveName(live, i18n.language)} helmet />
      <Stack w="full" maxW="4xl" mx="auto" py={{ base: 2, md: 4 }}>
        <LivePage live={live} />
      </Stack>
    </>
  );
}
