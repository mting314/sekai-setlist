import { useTranslation } from 'react-i18next';
import { Box, Flex, Grid, HStack, Stack } from 'styled-system/jsx';
import { StatsPanel } from './StatsPanel';
import { Text } from '~/components/ui/styled/text';
import { SongInfoButton } from '~/components/sekai-setlist/song-info/SongInfoButton';
import { SongPlayButton } from '~/components/sekai-setlist/audio/SongPlayButton';
import { sekaiSongName } from '~/utils/sekai-setlist/catalog';
import { FORMAT_COLORS, getLiveFormat, type VersionBreakdownStats } from '~/utils/sekai-setlist/stats';

export function VersionBreakdownSection({ stats }: { stats: VersionBreakdownStats }) {
  const { t, i18n } = useTranslation();

  const fullPct = ((stats.fullVersionCount / stats.totalPerformances) * 100).toFixed(1);
  const shortPct = ((stats.shortOrGameCount / stats.totalPerformances) * 100).toFixed(1);

  return (
    <StatsPanel
      title={t('stats.version.title', { defaultValue: 'Performance Version Length: Full vs Short Size' })}
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
            borderRadius="l2"
            borderWidth="1px"
            p="3.5"
            bg="bg.subtle"
            borderLeftWidth="4px"
            borderLeftColor="accent.default"
          >
            <Flex justify="space-between" align="baseline">
              <Text fontSize="sm" fontWeight="bold">
                {t('stats.version.fullTitle', { defaultValue: 'Full Length Versions' })}
              </Text>
              <Text fontSize="xl" fontWeight="extrabold" color="accent.default">
                {fullPct}%
              </Text>
            </Flex>
            <Text fontSize="xs" color="fg.muted" mt="1">
              {stats.fullVersionCount} {t('stats.version.playsOf', { count: stats.totalPerformances, defaultValue: 'plays out of {{count}} total' })}
            </Text>
            <Text fontSize="2xs" color="fg.subtle" mt="1.5">
              {t('stats.version.fullNote', {
                defaultValue: 'Standard live performance format for all COLORFUL LIVE and Thanks Festival sets.'
              })}
            </Text>
          </Box>

          <Box
            borderColor="border.subtle"
            borderRadius="l2"
            borderWidth="1px"
            p="3.5"
            bg="bg.subtle"
            borderLeftWidth="4px"
            borderLeftColor="#f59e0b"
          >
            <Flex justify="space-between" align="baseline">
              <Text fontSize="sm" fontWeight="bold">
                {t('stats.version.shortTitle', { defaultValue: 'Short / Game Size / Medleys' })}
              </Text>
              <Text fontSize="xl" fontWeight="extrabold" color="#f59e0b">
                {shortPct}%
              </Text>
            </Flex>
            <Text fontSize="xs" color="fg.muted" mt="1">
              {stats.shortOrGameCount} {t('stats.version.playsOf', { count: stats.totalPerformances, defaultValue: 'plays out of {{count}} total' })}
            </Text>
            <Text fontSize="2xs" color="fg.subtle" mt="1.5">
              {t('stats.version.shortNote', {
                defaultValue: 'Appeared in Sekai Symphony 2026 medleys and select 5th Thanks Fes slots.'
              })}
            </Text>
          </Box>
        </Grid>

        {/* Proportion Visual Bar */}
        <Box>
          <Flex h="3" borderRadius="full" overflow="hidden" bg="border.subtle">
            <Box w={`${fullPct}%`} bg="accent.default" title={`Full version: ${fullPct}%`} />
            <Box w={`${shortPct}%`} bg="#f59e0b" title={`Short/Game version: ${shortPct}%`} />
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
          <Box p="3" bg="bg.subtle" borderBottomWidth="1px" borderColor="border.subtle">
            <Text fontSize="xs" fontWeight="bold">
              {t('stats.version.allShortList', {
                defaultValue: 'All {{count}} Short & Game Version Performances Recorded',
                count: stats.shortOrGameCount
              })}
            </Text>
          </Box>

          <Stack gap="0" divideY="1px" divideColor="border.subtle">
            {stats.shortVersionItems.map((item, idx) => {
              const name = item.songId
                ? sekaiSongName(item.songId, i18n.language)
                : item.title;
              const fmt = getLiveFormat(item.liveSeries);
              const fmtColor = FORMAT_COLORS[fmt];

              return (
                <Flex
                  key={`${item.liveId}-${idx}`}
                  p="2.5"
                  align="center"
                  justify="space-between"
                  gap="2.5"
                  _hover={{ bg: 'bg.subtle' }}
                >
                  <Stack gap="0.5" minW="0" flex="1">
                    <HStack gap="2">
                      <Text fontSize="xs" fontWeight="bold" truncate>
                        {name}
                      </Text>
                      <Box
                        px="1.5"
                        py="0.25"
                        borderRadius="xs"
                        bg="#f59e0b22"
                        color="#f59e0b"
                        fontSize="2xs"
                        fontWeight="bold"
                      >
                        {item.note}
                      </Box>
                    </HStack>
                    <HStack gap="2">
                      <Box
                        w="1.5"
                        h="1.5"
                        borderRadius="full"
                        bg={fmtColor}
                        flexShrink={0}
                      />
                      <Text fontSize="2xs" color="fg.muted" truncate>
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
