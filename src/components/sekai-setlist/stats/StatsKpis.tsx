import { useTranslation } from 'react-i18next';
import { Box, Grid } from 'styled-system/jsx';
import { Text } from '~/components/ui/styled/text';
import type { StatsOverviewKPIs } from '~/utils/sekai-setlist/stats';

export function StatsKpis({ kpis }: { kpis: StatsOverviewKPIs }) {
  const { t } = useTranslation();

  const performedPct = Math.round(
    (kpis.performedCatalogSongs / kpis.totalCatalogSongs) * 100
  );
  const unperformedPct = 100 - performedPct;

  const cards = [
    {
      value: kpis.totalLives,
      label: t('stats.kpi.lives', { defaultValue: 'Recorded Lives' }),
      sub: t('stats.kpi.setlists', {
        count: kpis.totalSetlists,
        defaultValue: '{{count}} setlists'
      })
    },
    {
      value: kpis.totalLiveAppearances,
      label: t('stats.kpi.performances', { defaultValue: 'Song Appearances' }),
      sub: t('stats.kpi.acrossLives', { defaultValue: 'Across all lives' })
    },
    {
      value: `${kpis.performedCatalogSongs} / ${kpis.totalCatalogSongs}`,
      label: t('stats.kpi.performedSongs', { defaultValue: 'Songs Performed' }),
      sub: `${performedPct}% ${t('stats.kpi.ofCatalog', { defaultValue: 'of catalog' })}`,
      highlight: 'accent.default'
    },
    {
      value: kpis.unperformedCatalogSongs,
      label: t('stats.kpi.unperformedSongs', { defaultValue: 'Unperformed Songs' }),
      sub: `${unperformedPct}% ${t('stats.kpi.awaitingDebut', { defaultValue: 'awaiting stage debut' })}`
    },
    {
      value: kpis.cast3dPerformances,
      label: t('stats.kpi.cast3d', { defaultValue: '3D Cast Plays' }),
      sub: t('stats.kpi.cast3dSub', { defaultValue: 'Thanks Fes & Fan Meetings' }),
      color: '#f97316'
    },
    {
      value: kpis.screen2dPerformances,
      label: t('stats.kpi.screen2d', { defaultValue: '2D Screen Plays' }),
      sub: t('stats.kpi.screen2dSub', { defaultValue: 'COLORFUL LIVE' }),
      color: '#06b6d4'
    }
  ];

  return (
    <Grid
      gap="3"
      gridTemplateColumns={{
        base: 'repeat(2, 1fr)',
        md: 'repeat(3, 1fr)',
        lg: 'repeat(6, 1fr)'
      }}
    >
      {cards.map((card, idx) => (
        <Box
          key={idx}
          borderColor="border.subtle"
          borderRadius="l2"
          borderWidth="1px"
          p="3.5"
          bg="bg.default"
          shadow="xs"
        >
          <Text
            fontSize={{ base: 'xl', md: '2xl' }}
            fontWeight="bold"
            lineHeight="tight"
            color={card.color ?? (card.highlight ? 'accent.default' : 'fg.default')}
          >
            {card.value}
          </Text>
          <Text fontSize="xs" fontWeight="medium" color="fg.default" mt="1">
            {card.label}
          </Text>
          <Text fontSize="2xs" color="fg.muted" mt="0.5">
            {card.sub}
          </Text>
        </Box>
      ))}
    </Grid>
  );
}
