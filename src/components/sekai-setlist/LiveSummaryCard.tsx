/**
 * Compact live card: series badge, linked name, date and venue, with an optional action on the
 * right. Used by the home hub, the predictions hub and unit pages.
 */
import { useTranslation } from 'react-i18next';
import { HStack, Stack, Wrap, styled } from 'styled-system/jsx';
import { Badge } from '~/components/ui/styled/badge';
import { Link } from '~/components/ui/link';
import { Text } from '~/components/ui/styled/text';
import { sekaiLiveName } from '~/utils/sekai-setlist/live-data';
import { liveHref } from '~/utils/sekai-setlist/routes';
import type { SekaiLive } from '~/types/sekai';

export const Card = styled('div', {
  base: {
    borderRadius: 'xl',
    borderWidth: '1px',
    p: { base: '3', md: '4' },
    bgColor: 'bg.default'
  }
});

export function LiveSummaryCard({
  live,
  action,
  badges
}: {
  live: SekaiLive;
  action?: React.ReactNode;
  badges?: React.ReactNode;
}) {
  const { t, i18n } = useTranslation();
  return (
    <Card>
      <HStack gap={3} justifyContent="space-between" alignItems="center">
        <Stack gap={0.5} minW={0}>
          <Wrap gap={1.5}>
            <Badge variant="outline" size="sm">
              {t(`sekaiSetlist.lives.series.${live.series}`, { defaultValue: live.series })}
            </Badge>
            {badges}
          </Wrap>
          <Link href={liveHref(live.id)} fontWeight="semibold">
            {sekaiLiveName(live, i18n.language)}
          </Link>
          <Text color="fg.muted" fontSize="xs">
            {[live.date, live.venue].filter(Boolean).join(' · ')}
          </Text>
        </Stack>
        {action}
      </HStack>
    </Card>
  );
}
