import { useTranslation } from 'react-i18next';
import { Box, Flex, Grid, HStack, Stack } from 'styled-system/jsx';
import { StatsPanel } from './StatsPanel';
import { Text } from '~/components/ui/styled/text';
import { SongInfoButton } from '~/components/sekai-setlist/song-info/SongInfoButton';
import { SongPlayButton } from '~/components/sekai-setlist/audio/SongPlayButton';
import { sekaiSongName } from '~/utils/sekai-setlist/catalog';
import {
  FORMAT_COLORS,
  getLiveFormat,
  type VersionBreakdownStats
} from '~/utils/sekai-setlist/stats';

export function VersionBreakdownSection({ stats }: { stats: VersionBreakdownStats }) {
  const { t, i18n } = useTranslation();

  const fullPct = ((stats.fullVersionCount / stats.totalPerformances) * 100).toFixed(1);
  const shortPct = ((stats.shortOrGameCount / stats.totalPerformances) * 100).toFixed(1);

  return (
    <StatsPanel
      title={t('stats.version.title', {
        defaultValue: 'Performance Version Length: Full vs Short Size'
      })}
      description={t('stats.version.subtitle', {
        defaultValue:
          'Project SEKAI live concerts overwhelmingly feature full-length versions with complete second verses and extended guitar solos, while short and game-size cuts are reserved for select medley slots.'
      })}
    >
      <Stack gap="4">
        {/* KPI split cards */}
        <Grid
          gap="3"
          gridTemplateColumns={{
            base: 'repeat(1, 1fr)',
            sm: 'repeat(2, 1fr)'
          }}
        >
          <Box
            borderColor="border.subtle"
            borderLeftWidth="4px"
            borderLeftColor="accent.default"
            borderRadius="l2"
            borderWidth="1px"
            p="3.5"
            bg="bg.subtle"
          >
            <Flex justify="space-between" align="baseline">
              <Text fontSize="sm" fontWeight="bold">
                {t('stats.version.fullTitle', { defaultValue: 'Full Length Versions' })}
              </Text>
              <Text color="accent.default" fontSize="xl" fontWeight="extrabold">
                {fullPct}%
              </Text>
            </Flex>
            <Text mt="1" color="fg.muted" fontSize="xs">
              {stats.fullVersionCount}{' '}
              {t('stats.version.playsOf', {
                count: stats.totalPerformances,
                defaultValue: 'plays out of {{count}} total'
              })}
            </Text>
            <Text mt="1.5" color="fg.subtle" fontSize="2xs">
              {t('stats.version.fullNote', {
                defaultValue:
                  'Standard live performance format for all COLORFUL LIVE and Thanks Festival sets.'
              })}
            </Text>
          </Box>

          <Box
            borderColor="border.subtle"
            borderLeftWidth="4px"
            borderLeftColor="#f59e0b"
            borderRadius="l2"
            borderWidth="1px"
            p="3.5"
            bg="bg.subtle"
          >
            <Flex justify="space-between" align="baseline">
              <Text fontSize="sm" fontWeight="bold">
                {t('stats.version.shortTitle', { defaultValue: 'Short / Game Size / Medleys' })}
              </Text>
              <Text color="#f59e0b" fontSize="xl" fontWeight="extrabold">
                {shortPct}%
              </Text>
            </Flex>
            <Text mt="1" color="fg.muted" fontSize="xs">
              {stats.shortOrGameCount}{' '}
              {t('stats.version.playsOf', {
                count: stats.totalPerformances,
                defaultValue: 'plays out of {{count}} total'
              })}
            </Text>
            <Text mt="1.5" color="fg.subtle" fontSize="2xs">
              {t('stats.version.shortNote', {
                defaultValue:
                  'Appeared in Sekai Symphony 2026 medleys and select 5th Thanks Fes slots.'
              })}
            </Text>
          </Box>
        </Grid>

        {/* Proportion Visual Bar */}
        <Box>
          <Flex borderRadius="full" h="3" bg="border.subtle" overflow="hidden">
            <Box title={`Full version: ${fullPct}%`} w={`${fullPct}%`} bg="accent.default" />
            <Box title={`Short/Game version: ${shortPct}%`} w={`${shortPct}%`} bg="#f59e0b" />
          </Flex>
        </Box>

        {/* List of the 11 Short Version Performances */}
        <Box
          borderColor="border.subtle"
          borderRadius="l2"
          borderWidth="1px"
          bg="bg.default"
          overflow="hidden"
        >
          <Box borderColor="border.subtle" borderBottomWidth="1px" p="3" bg="bg.subtle">
            <Text fontSize="xs" fontWeight="bold">
              {t('stats.version.allShortList', {
                defaultValue: 'All {{count}} Short & Game Version Performances Recorded',
                count: stats.shortOrGameCount
              })}
            </Text>
          </Box>

          <Stack gap="0" divideY="1px" divideColor="border.subtle">
            {stats.shortVersionItems.map((item, idx) => {
              const name = item.songId ? sekaiSongName(item.songId, i18n.language) : item.title;
              const fmt = getLiveFormat(item.liveSeries);
              const fmtColor = FORMAT_COLORS[fmt];

              return (
                <Flex
                  key={`${item.liveId}-${idx}`}
                  gap="2.5"
                  justify="space-between"
                  align="center"
                  p="2.5"
                  _hover={{ bg: 'bg.subtle' }}
                >
                  <Stack flex="1" gap="0.5" minW="0">
                    <HStack gap="2">
                      <Text fontSize="xs" fontWeight="bold" truncate>
                        {name}
                      </Text>
                      <Box
                        borderRadius="xs"
                        py="0.25"
                        px="1.5"
                        color="#f59e0b"
                        fontSize="2xs"
                        fontWeight="bold"
                        bg="#f59e0b22"
                      >
                        {item.note}
                      </Box>
                    </HStack>
                    <HStack gap="2">
                      <Box flexShrink={0} borderRadius="full" w="1.5" h="1.5" bg={fmtColor} />
                      <Text color="fg.muted" fontSize="2xs" truncate>
                        {item.liveName} ({item.liveDate})
                      </Text>
                    </HStack>
                  </Stack>

                  {item.songId && (
                    <HStack gap="1.5" flexShrink={0}>
                      <SongPlayButton songId={item.songId} />
                      <SongInfoButton songId={item.songId} />
                    </HStack>
                  )}
                </Flex>
              );
            })}
          </Stack>
        </Box>
      </Stack>
    </StatsPanel>
  );
}
