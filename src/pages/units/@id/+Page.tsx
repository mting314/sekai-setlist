/**
 * One unit (or "Other"): its most performed songs and the lives that featured it.
 */

import { useTranslation } from 'react-i18next';
import { usePageContext } from 'vike-react/usePageContext';
import { Stack } from 'styled-system/jsx';
import { Metadata } from '~/components/layout/Metadata';
import { NotFound } from '~/components/sekai-setlist/NotFound';
import { UnitPage } from '~/components/sekai-setlist/UnitPage';
import { getSekaiUnit } from '~/utils/sekai-setlist/catalog';

export function Page() {
  const { t } = useTranslation();
  const unit = getSekaiUnit(usePageContext().routeParams.id ?? '');
  if (!unit) return <NotFound />;

  return (
    <>
      <Metadata title={t(`sekaiSetlist.units.${unit.id}`, { defaultValue: unit.name })} helmet />
      <Stack w="full" maxW="4xl" mx="auto" py={{ base: 2, md: 4 }}>
        <UnitPage unit={unit} />
      </Stack>
    </>
  );
}
