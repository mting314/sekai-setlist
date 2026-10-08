import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Flex, Grid, HStack, Stack, Wrap } from 'styled-system/jsx';
import { FormatStackedBarChart } from './StatsCharts';
import { StatsPanel } from './StatsPanel';
import { Button } from '~/components/ui/styled/button';
import { Text } from '~/components/ui/styled/text';
import { useSongInfo } from '~/components/sekai-setlist/song-info/song-info-context';
import { sekaiSongColors, sekaiSongName } from '~/utils/sekai-setlist/catalog';
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
      label: t('stats.overlap.both', { defaultValue: 'Both 2D & 3D Cast' }),
      count: overlap.both2dAnd3d.length,
      color: '#10b981', // Emerald
      description: t('stats.overlap.bothDesc', {
        defaultValue:
          'Performed by both virtual characters (COLORFUL LIVE / Connect Live) and the real voice cast'
      }),
      songIds: overlap.both2dAnd3d
    },
    {
      key: 'screen2d',
      label: t('stats.overlap.screen2dOnly', { defaultValue: '2D Characters Only' }),
      count: overlap.screen2dOnly.length,
      color: FORMAT_COLORS.screen_2d,
      description: t('stats.overlap.screen2dDesc', {
        defaultValue:
          'Performed by virtual characters (COLORFUL LIVE or Connect Live), but not yet by the real voice cast on stage'
      }),
      songIds: overlap.screen2dOnly
    },
    {
      key: 'cast3d',
      label: t('stats.overlap.cast3dOnly', { defaultValue: '3D Cast Only' }),
      count: overlap.cast3dOnly.length,
      color: FORMAT_COLORS.cast_3d,
      description: t('stats.overlap.cast3dDesc', {
        defaultValue:
          'Performed by voice actors at Thanks Fes or Fan Meetings, never at COLORFUL LIVE or Connect Live'
      }),
      songIds: overlap.cast3dOnly
    },
    {
      key: 'other',
      label: t('stats.overlap.otherOnly', { defaultValue: 'Symphony Only' }),
      count: overlap.otherFormatOnly.length,
      color: FORMAT_COLORS.symphony,
      description: t('stats.overlap.otherDesc', {
        defaultValue: 'Performed exclusively in Sekai Symphony orchestra'
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
          'Comparing virtual character performances (COLORFUL LIVE screen projections & in-game Connect Lives) against real-life voice cast stage performances (Thanks Festival & Fan Meetings).'
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
                borderTopWidth="3px"
                borderTopColor={color}
                borderRadius="l2"
                borderWidth="1px"
                p="3"
                bg="bg.subtle"
              >
                <Flex justify="space-between" align="baseline">
                  <Text color="fg.default" fontSize="xs" fontWeight="bold">
                    {isJa ? meta.ja : meta.en}
                  </Text>
                  <Text color={color} fontSize="lg" fontWeight="extrabold">
                    {f.total}
                  </Text>
                </Flex>
                <Text mt="1" color="fg.muted" fontSize="2xs" lineHeight="normal">
                  {isJa ? meta.descJa : meta.descEn}
                </Text>
                <Text mt="1.5" color="fg.subtle" fontSize="2xs">
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
          <Text mb="2" fontSize="sm" fontWeight="bold">
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
            gap="2"
            justify="space-between"
            align={{ base: 'flex-start', sm: 'center' }}
            mb="3"
            flexWrap="wrap"
          >
            <Box>
              <Text fontSize="sm" fontWeight="bold">
                {t('stats.overlap.title', { defaultValue: 'Song Catalog Overlap Matrix' })}
              </Text>
              <Text color="fg.muted" fontSize="xs">
                {t('stats.overlap.subtitle', {
                  defaultValue:
                    'How the {{total}} performed songs divide between 2D and 3D formats.',
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
                  py="1.5"
                  px="3"
                >
                  <HStack gap="1.5">
                    <Box
                      flexShrink={0}
                      borderRadius="full"
                      w="2"
                      h="2"
                      bg={tab.color ?? 'currentColor'}
                    />
                    <span>{tab.label}</span>
                    <Text as="span" ml="0.5" fontSize="2xs" fontWeight="bold" opacity={0.8}>
                      ({tab.count} · {pct}%)
                    </Text>
                  </HStack>
                </Button>
              );
            })}
          </Wrap>

          <Text mb="2.5" color="fg.muted" fontSize="2xs" fontStyle="italic">
            {currentTab.description} ({currentTab.count}{' '}
            {t('stats.songs', { defaultValue: 'songs' })}):
          </Text>

          {/* Song Pills */}
          <Wrap gap="1.5" maxH="280px" p="1" overflowY="auto">
            {currentTab.songIds.map((songId) => {
              const title = sekaiSongName(songId, i18n.language);
              const colors = sekaiSongColors(songId);
              const mainColor = colors[0] ?? '#8a8a8a';

              return (
                <Box
                  as="button"
                  key={songId}
                  onClick={() => openSong(songId)}
                  title={`${title} (Click for song details)`}
                  cursor="pointer"
                  display="inline-flex"
                  gap="1.5"
                  alignItems="center"
                  borderColor="border.subtle"
                  borderRadius="full"
                  borderWidth="1px"
                  py="1"
                  px="2.5"
                  fontSize="xs"
                  fontWeight="medium"
                  bg="bg.subtle"
                  transition="all 0.15s ease"
                  _hover={{
                    borderColor: mainColor,
                    bg: 'bg.muted',
                    transform: 'translateY(-1px)'
                  }}
                >
                  <Box flexShrink={0} borderRadius="full" w="2" h="2" bg={mainColor} />
                  <Text maxW="180px" fontSize="xs" truncate>
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
