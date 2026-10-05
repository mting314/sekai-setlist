import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Flex, Grid, HStack, Stack, Wrap } from 'styled-system/jsx';
import { ReleaseDelayHistogram } from './StatsCharts';
import { StatsPanel } from './StatsPanel';
import { SongJacket } from '~/components/sekai-setlist/SongJacket';
import { SongInfoButton } from '~/components/sekai-setlist/song-info/SongInfoButton';
import { SongPlayButton } from '~/components/sekai-setlist/audio/SongPlayButton';
import { Text } from '~/components/ui/styled/text';
import { sekaiSongName } from '~/utils/sekai-setlist/catalog';
import { type ReleaseDelaySong, type ReleaseDelayStats } from '~/utils/sekai-setlist/stats';

function DelayTable({
  songs,
  title,
  sub,
  lang,
  isExpress
}: {
  songs: ReleaseDelaySong[];
  title: string;
  sub: string;
  lang: string;
  isExpress?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <Box
      borderColor="border.subtle"
      borderRadius="l2"
      borderWidth="1px"
      bg="bg.default"
      overflow="hidden"
    >
      <Box p="3" bg="bg.subtle" borderBottomWidth="1px" borderColor="border.subtle">
        <Text fontSize="sm" fontWeight="bold">
          {title}
        </Text>
        <Text fontSize="2xs" color="fg.muted">
          {sub}
        </Text>
      </Box>

      <Stack gap="0" divideY="1px" divideColor="border.subtle" maxH="380px" overflowY="auto">
        {songs.map((song, idx) => {
          const name = sekaiSongName(song.songId, lang);
          const isPreRelease = song.daysToDebut < 0;
          const daysText = isPreRelease
            ? `${song.daysToDebut}d (${t('stats.preRelease', { defaultValue: 'Pre-release' })})`
            : `${song.daysToDebut}d`;

          const badgeBg = isPreRelease
            ? '#ec489922'
            : isExpress
              ? 'accent.subtle'
              : '#f59e0b22';
          const badgeColor = isPreRelease
            ? '#ec4899'
            : isExpress
              ? 'accent.default'
              : '#f59e0b';

          return (
            <Flex
              key={song.songId}
              p="2.5"
              align="center"
              justify="space-between"
              gap="2.5"
              _hover={{ bg: 'bg.subtle' }}
            >
              <HStack gap="2.5" minW="0" flex="1">
                <Text
                  fontSize="xs"
                  fontWeight="bold"
                  color="fg.muted"
                  w="4"
                  textAlign="center"
                  flexShrink={0}
                >
                  #{idx + 1}
                </Text>
                <SongJacket
                  id={song.songId}
                  size={36}
                />
                <Stack gap="0.5" minW="0" flex="1">
                  <HStack gap="1.5">
                    <Text fontSize="xs" fontWeight="bold" truncate title={name}>
                      {name}
                    </Text>
                    <Box
                      w="1.5"
                      h="1.5"
                      borderRadius="full"
                      bg={song.unitColor}
                      flexShrink={0}
                    />
                  </HStack>
                  <Text fontSize="2xs" color="fg.muted" truncate title={song.firstLiveName}>
                    {song.firstLiveName}
                  </Text>
                </Stack>
              </HStack>

              <HStack gap="2" flexShrink={0}>
                <Box
                  px="2"
                  py="0.5"
                  borderRadius="full"
                  bg={badgeBg}
                  color={badgeColor}
                  fontSize="2xs"
                  fontWeight="bold"
                  whiteSpace="nowrap"
                >
                  {daysText}
                </Box>
                <SongPlayButton songId={song.songId} />
                <SongInfoButton songId={song.songId} />
              </HStack>
            </Flex>
          );
        })}
      </Stack>
    </Box>
  );
}

export function ReleaseDelaySection({ stats }: { stats: ReleaseDelayStats }) {
  const { t, i18n } = useTranslation();
  const [selectedBucketKey, setSelectedBucketKey] = useState<string | undefined>();

  const selectedBucket = stats.buckets.find((b) => b.key === selectedBucketKey);

  return (
    <StatsPanel
      title={t('stats.delay.title', { defaultValue: 'Time Between Song Release & Stage Debut' })}
      description={t('stats.delay.subtitle', {
        defaultValue:
          'Days elapsed from in-game debut (publishedAt) to first live performance (startDate). Negative numbers denote songs that premiered live before releasing in the game!'
      })}
    >
      <Stack gap="5">
        {/* Metric Summary Cards */}
        <Grid
          gap="2.5"
          gridTemplateColumns={{
            base: 'repeat(2, 1fr)',
            md: 'repeat(4, 1fr)'
          }}
        >
          <Box
            borderColor="border.subtle"
            borderRadius="l2"
            borderWidth="1px"
            p="3"
            bg="bg.subtle"
          >
            <Text fontSize="2xs" color="fg.muted">
              {t('stats.delay.avgWait', { defaultValue: 'Average Wait' })}
            </Text>
            <Text fontSize="xl" fontWeight="bold" color="fg.default" mt="0.5">
              {stats.averageDays} {t('stats.days', { defaultValue: 'days' })}
            </Text>
            <Text fontSize="2xs" color="fg.subtle">
              ~{(stats.averageDays / 30.4).toFixed(1)} {t('stats.months', { defaultValue: 'months' })}
            </Text>
          </Box>

          <Box
            borderColor="border.subtle"
            borderRadius="l2"
            borderWidth="1px"
            p="3"
            bg="bg.subtle"
          >
            <Text fontSize="2xs" color="fg.muted">
              {t('stats.delay.medianWait', { defaultValue: 'Median Wait' })}
            </Text>
            <Text fontSize="xl" fontWeight="bold" color="fg.default" mt="0.5">
              {stats.medianDays} {t('stats.days', { defaultValue: 'days' })}
            </Text>
            <Text fontSize="2xs" color="fg.subtle">
              ~{(stats.medianDays / 30.4).toFixed(1)} {t('stats.months', { defaultValue: 'months' })}
            </Text>
          </Box>

          <Box
            borderColor="border.subtle"
            borderRadius="l2"
            borderWidth="1px"
            p="3"
            bg="bg.subtle"
            borderLeftWidth="3px"
            borderLeftColor="#ec4899"
          >
            <Text fontSize="2xs" color="fg.muted">
              {t('stats.delay.preReleaseCount', { defaultValue: 'Pre-Release Debuts' })}
            </Text>
            <Text fontSize="xl" fontWeight="bold" color="#ec4899" mt="0.5">
              {stats.buckets[0]?.count ?? 0} {t('stats.songs', { defaultValue: 'songs' })}
            </Text>
            <Text fontSize="2xs" color="fg.subtle">
              {t('stats.delay.playedBeforeDrop', { defaultValue: 'Played before in-game release' })}
            </Text>
          </Box>

          <Box
            borderColor="border.subtle"
            borderRadius="l2"
            borderWidth="1px"
            p="3"
            bg="bg.subtle"
            borderLeftWidth="3px"
            borderLeftColor="#f59e0b"
          >
            <Text fontSize="2xs" color="fg.muted">
              {t('stats.delay.maxWait', { defaultValue: 'Longest Wait' })}
            </Text>
            <Text fontSize="xl" fontWeight="bold" color="#f59e0b" mt="0.5">
              {stats.maxDays} {t('stats.days', { defaultValue: 'days' })}
            </Text>
            <Text fontSize="2xs" color="fg.subtle">
              ~{(stats.maxDays / 365).toFixed(1)} {t('stats.years', { defaultValue: 'years' })}
            </Text>
          </Box>
        </Grid>

        {/* Histogram Chart */}
        <Box
          borderColor="border.subtle"
          borderRadius="l2"
          borderWidth="1px"
          p="3.5"
          bg="bg.default"
        >
          <Flex justify="space-between" align="center" mb="2" flexWrap="wrap" gap="2">
            <Text fontSize="sm" fontWeight="bold">
              {t('stats.delay.distTitle', { defaultValue: 'Debut Delay Distribution' })}
            </Text>
            <Text fontSize="xs" color="fg.muted">
              {t('stats.delay.clickBucket', { defaultValue: 'Click a bar to view songs in bucket' })}
            </Text>
          </Flex>

          <ReleaseDelayHistogram
            buckets={stats.buckets}
            lang={i18n.language}
            onSelectBucket={(key) =>
              setSelectedBucketKey((prev) => (prev === key ? undefined : key))
            }
            selectedBucketKey={selectedBucketKey}
          />

          {/* If a bucket is selected, show list of songs in this bucket */}
          {selectedBucket && (
            <Box
              mt="3"
              p="3"
              bg="bg.subtle"
              borderRadius="l2"
              borderColor="border.subtle"
              borderWidth="1px"
            >
              <Text fontSize="xs" fontWeight="bold" mb="2">
                {selectedBucket.labelEn} ({selectedBucket.songs.length}{' '}
                {t('stats.songs', { defaultValue: 'songs' })}):
              </Text>
              <Wrap gap="1.5" maxH="160px" overflowY="auto">
                {selectedBucket.songs.map((s) => {
                  const title = sekaiSongName(s.songId, i18n.language);
                  return (
                    <Box
                      key={s.songId}
                      borderColor="border.subtle"
                      borderRadius="full"
                      borderWidth="1px"
                      px="2.5"
                      py="1"
                      bg="bg.default"
                      fontSize="xs"
                      display="inline-flex"
                      alignItems="center"
                      gap="1.5"
                    >
                      <Box w="2" h="2" borderRadius="full" bg={s.unitColor} flexShrink={0} />
                      <Text truncate maxW="160px">
                        {title}
                      </Text>
                      <Text fontSize="2xs" color="fg.muted" fontWeight="bold">
                        ({s.daysToDebut}d)
                      </Text>
                    </Box>
                  );
                })}
              </Wrap>
            </Box>
          )}
        </Box>

        {/* Express Lane vs Longest Wait Tables */}
        <Grid
          gap="3.5"
          gridTemplateColumns={{
            base: 'repeat(1, 1fr)',
            lg: 'repeat(2, 1fr)'
          }}
        >
          <DelayTable
            songs={stats.fastestDebuts}
            title={t('stats.delay.expressTitle', { defaultValue: '⚡ Express Lane: Fastest to the Stage' })}
            sub={t('stats.delay.expressSub', {
              defaultValue: 'Includes pre-release debuts at Anniversary Thanks Festivals & Symphony'
            })}
            lang={i18n.language}
            isExpress
          />

          <DelayTable
            songs={stats.longestWaits}
            title={t('stats.delay.longestTitle', { defaultValue: '⏳ Veteran Arrivals: Longest Wait to Stage' })}
            sub={t('stats.delay.longestSub', {
              defaultValue: 'Songs that waited years from launch before their first live performance'
            })}
            lang={i18n.language}
          />
        </Grid>
      </Stack>
    </StatsPanel>
  );
}
