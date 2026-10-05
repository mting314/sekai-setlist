import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Flex, Grid, HStack, Stack, Wrap } from 'styled-system/jsx';
import { FormatStackedBarChart } from './StatsCharts';
import { StatsPanel } from './StatsPanel';
import { Button } from '~/components/ui/styled/button';
import { Text } from '~/components/ui/styled/text';
import { useSongInfo } from '~/components/sekai-setlist/song-info/song-info-context';
import {
  sekaiSongColors,
  sekaiSongName
} from '~/utils/sekai-setlist/catalog';
import {
  FORMAT_COLORS,
  FORMAT_NAMES,
  type FormatOverlap,
  type LiveFormat,
  type UnitFormatBreakdown
} from '~/utils/sekai-setlist/stats';

type OverlapTab = 'both' | 'screen2d' | 'cast3d' | 'other';

export function FormatComparisonSection({
  byUnit,
  overlap,
  counts
}: {
  byUnit: UnitFormatBreakdown[];
  overlap: FormatOverlap;
  counts: {
    screen2d: number;
    cast3d: number;
    connectLive: number;
    symphony: number;
    total: number;
  };
}) {
  const { t, i18n } = useTranslation();
  const openSong = useSongInfo();
  const [activeTab, setActiveTab] = useState<OverlapTab>('both');
  const isJa = i18n.language.startsWith('ja');

  const totalCatalogPerformed =
    overlap.both2dAnd3d.length +
    overlap.screen2dOnly.length +
    overlap.cast3dOnly.length +
    overlap.otherFormatOnly.length;

  const overlapTabs: {
    key: OverlapTab;
    label: string;
    count: number;
    color?: string;
    description: string;
    songIds: string[];
  }[] = [
    {
      key: 'both',
      label: t('stats.overlap.both', { defaultValue: 'Both 2D Screen & 3D Cast' }),
      count: overlap.both2dAnd3d.length,
      color: '#10b981', // Emerald
      description: t('stats.overlap.bothDesc', {
        defaultValue: 'Performed by both the 3DCG virtual characters and the real voice cast'
      }),
      songIds: overlap.both2dAnd3d
    },
    {
      key: 'screen2d',
      label: t('stats.overlap.screen2dOnly', { defaultValue: '2D Screen Only' }),
      count: overlap.screen2dOnly.length,
      color: FORMAT_COLORS.screen_2d,
      description: t('stats.overlap.screen2dDesc', {
        defaultValue: 'Performed at COLORFUL LIVE, but not yet by the real voice cast on stage'
      }),
      songIds: overlap.screen2dOnly
    },
    {
      key: 'cast3d',
      label: t('stats.overlap.cast3dOnly', { defaultValue: '3D Cast Only' }),
      count: overlap.cast3dOnly.length,
      color: FORMAT_COLORS.cast_3d,
      description: t('stats.overlap.cast3dDesc', {
        defaultValue: 'Performed by voice actors at Thanks Fes or Fan Meetings, never at COLORFUL LIVE'
      }),
      songIds: overlap.cast3dOnly
    },
    {
      key: 'other',
      label: t('stats.overlap.otherOnly', { defaultValue: 'Connect / Symphony Only' }),
      count: overlap.otherFormatOnly.length,
      color: '#8b5cf6',
      description: t('stats.overlap.otherDesc', {
        defaultValue: 'Performed exclusively in Connect Live or Sekai Symphony orchestra'
      }),
      songIds: overlap.otherFormatOnly
    }
  ];

  const currentTab = overlapTabs.find((t) => t.key === activeTab)!;

  const formatCards: { key: LiveFormat; total: number }[] = [
    { key: 'screen_2d', total: counts.screen2d },
    { key: 'cast_3d', total: counts.cast3d },
    { key: 'connect_live', total: counts.connectLive },
    { key: 'symphony', total: counts.symphony }
  ];

  return (
    <StatsPanel
      title={t('stats.format.title', { defaultValue: '2D Screen vs 3D Cast Performances' })}
      description={t('stats.format.subtitle', {
        defaultValue:
          'Comparing virtual character screen projections (COLORFUL LIVE) against real-life voice cast stage performances (Thanks Festival & Fan Meetings).'
      })}
    >
      <Stack gap="5">
        {/* Format Definition Cards */}
        <Grid
          gap="2.5"
          gridTemplateColumns={{
            base: 'repeat(1, 1fr)',
            sm: 'repeat(2, 1fr)',
            lg: 'repeat(4, 1fr)'
          }}
        >
          {formatCards.map((f) => {
            const meta = FORMAT_NAMES[f.key];
            const color = FORMAT_COLORS[f.key];
            const pct = Math.round((f.total / counts.total) * 100);
            return (
              <Box
                key={f.key}
                borderColor="border.subtle"
                borderRadius="l2"
                borderWidth="1px"
                p="3"
                bg="bg.subtle"
                borderTopWidth="3px"
                borderTopColor={color}
              >
                <Flex justify="space-between" align="baseline">
                  <Text fontSize="xs" fontWeight="bold" color="fg.default">
                    {isJa ? meta.ja : meta.en}
                  </Text>
                  <Text fontSize="lg" fontWeight="extrabold" color={color}>
                    {f.total}
                  </Text>
                </Flex>
                <Text fontSize="2xs" color="fg.muted" mt="1" lineHeight="normal">
                  {isJa ? meta.descJa : meta.descEn}
                </Text>
                <Text fontSize="2xs" color="fg.subtle" mt="1.5">
                  {pct}% {t('stats.format.ofTotalPlays', { defaultValue: 'of all song plays' })}
                </Text>
              </Box>
            );
          })}
        </Grid>

        {/* Stacked Unit Breakdown Chart */}
        <Box
          borderColor="border.subtle"
          borderRadius="l2"
          borderWidth="1px"
          p="3.5"
          bg="bg.default"
        >
          <Text fontSize="sm" fontWeight="bold" mb="2">
            {t('stats.format.byUnitTitle', { defaultValue: 'Performances by Unit & Format' })}
          </Text>
          <FormatStackedBarChart data={byUnit} />
        </Box>

        {/* Song Overlap Section */}
        <Box
          borderColor="border.subtle"
          borderRadius="l2"
          borderWidth="1px"
          p="3.5"
          bg="bg.default"
        >
          <Flex
            justify="space-between"
            align={{ base: 'flex-start', sm: 'center' }}
            mb="3"
            flexWrap="wrap"
            gap="2"
          >
            <Box>
              <Text fontSize="sm" fontWeight="bold">
                {t('stats.overlap.title', { defaultValue: 'Song Catalog Overlap Matrix' })}
              </Text>
              <Text fontSize="xs" color="fg.muted">
                {t('stats.overlap.subtitle', {
                  defaultValue: 'How the {{total}} performed songs divide between 2D and 3D formats.',
                  total: totalCatalogPerformed
                })}
              </Text>
            </Box>
          </Flex>

          {/* Overlap Filter Buttons */}
          <Wrap gap="2" mb="3">
            {overlapTabs.map((tab) => {
              const isActive = activeTab === tab.key;
              const pct = Math.round((tab.count / totalCatalogPerformed) * 100);
              return (
                <Button
                  key={tab.key}
                  size="xs"
                  variant={isActive ? 'solid' : 'outline'}
                  onClick={() => setActiveTab(tab.key)}
                  px="3"
                  py="1.5"
                >
                  <HStack gap="1.5">
                    <Box
                      w="2"
                      h="2"
                      borderRadius="full"
                      bg={tab.color ?? 'currentColor'}
                      flexShrink={0}
                    />
                    <span>{tab.label}</span>
                    <Text
                      as="span"
                      opacity={0.8}
                      fontWeight="bold"
                      fontSize="2xs"
                      ml="0.5"
                    >
                      ({tab.count} · {pct}%)
                    </Text>
                  </HStack>
                </Button>
              );
            })}
          </Wrap>

          <Text fontSize="2xs" color="fg.muted" mb="2.5" fontStyle="italic">
            {currentTab.description} ({currentTab.count} {t('stats.songs', { defaultValue: 'songs' })}):
          </Text>

          {/* Song Pills */}
          <Wrap gap="1.5" maxH="280px" overflowY="auto" p="1">
            {currentTab.songIds.map((songId) => {
              const title = sekaiSongName(songId, i18n.language);
              const colors = sekaiSongColors(songId);
              const mainColor = colors[0] ?? '#8a8a8a';

              return (
                <Box
                  key={songId}
                  as="button"
                  onClick={() => openSong(songId)}
                  borderColor="border.subtle"
                  borderRadius="full"
                  borderWidth="1px"
                  px="2.5"
                  py="1"
                  bg="bg.subtle"
                  fontSize="xs"
                  fontWeight="medium"
                  cursor="pointer"
                  transition="all 0.15s ease"
                  _hover={{
                    borderColor: mainColor,
                    bg: 'bg.muted',
                    transform: 'translateY(-1px)'
                  }}
                  display="inline-flex"
                  alignItems="center"
                  gap="1.5"
                  title={`${title} (Click for song details)`}
                >
                  <Box
                    w="2"
                    h="2"
                    borderRadius="full"
                    bg={mainColor}
                    flexShrink={0}
                  />
                  <Text fontSize="xs" maxW="180px" truncate>
                    {title}
                  </Text>
                </Box>
              );
            })}
          </Wrap>
        </Box>
      </Stack>
    </StatsPanel>
  );
}
