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
      <Box borderColor="border.subtle" borderBottomWidth="1px" p="3" bg="bg.subtle">
        <Text fontSize="sm" fontWeight="bold">
          {title}
        </Text>
        <Text color="fg.muted" fontSize="2xs">
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

          const badgeBg = isPreRelease ? '#ec489922' : isExpress ? 'accent.subtle' : '#f59e0b22';
          const badgeColor = isPreRelease ? '#ec4899' : isExpress ? 'accent.default' : '#f59e0b';

          return (
            <Flex
              key={song.songId}
              gap="2.5"
              justify="space-between"
              align="center"
              p="2.5"
              _hover={{ bg: 'bg.subtle' }}
            >
              <HStack flex="1" gap="2.5" minW="0">
                <Text
                  flexShrink={0}
                  w="4"
                  color="fg.muted"
                  fontSize="xs"
                  fontWeight="bold"
                  textAlign="center"
                >
                  #{idx + 1}
                </Text>
                <SongJacket id={song.songId} size={36} />
                <Stack flex="1" gap="0.5" minW="0">
                  <HStack gap="1.5">
                    <Text title={name} fontSize="xs" fontWeight="bold" truncate>
                      {name}
                    </Text>
                    <Box flexShrink={0} borderRadius="full" w="1.5" h="1.5" bg={song.unitColor} />
                  </HStack>
                  <Text title={song.firstLiveName} color="fg.muted" fontSize="2xs" truncate>
                    {song.firstLiveName}
                  </Text>
                </Stack>
              </HStack>

              <HStack gap="2" flexShrink={0}>
                <Box
                  borderRadius="full"
                  py="0.5"
                  px="2"
                  color={badgeColor}
                  fontSize="2xs"
                  fontWeight="bold"
                  bg={badgeBg}
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
          <Box borderColor="border.subtle" borderRadius="l2" borderWidth="1px" p="3" bg="bg.subtle">
            <Text color="fg.muted" fontSize="2xs">
              {t('stats.delay.avgWait', { defaultValue: 'Average Wait' })}
            </Text>
            <Text mt="0.5" color="fg.default" fontSize="xl" fontWeight="bold">
              {stats.averageDays} {t('stats.days', { defaultValue: 'days' })}
            </Text>
            <Text color="fg.subtle" fontSize="2xs">
              ~{(stats.averageDays / 30.4).toFixed(1)}{' '}
              {t('stats.months', { defaultValue: 'months' })}
            </Text>
          </Box>

          <Box borderColor="border.subtle" borderRadius="l2" borderWidth="1px" p="3" bg="bg.subtle">
            <Text color="fg.muted" fontSize="2xs">
              {t('stats.delay.medianWait', { defaultValue: 'Median Wait' })}
            </Text>
            <Text mt="0.5" color="fg.default" fontSize="xl" fontWeight="bold">
              {stats.medianDays} {t('stats.days', { defaultValue: 'days' })}
            </Text>
            <Text color="fg.subtle" fontSize="2xs">
              ~{(stats.medianDays / 30.4).toFixed(1)}{' '}
              {t('stats.months', { defaultValue: 'months' })}
            </Text>
          </Box>

          <Box
            borderColor="border.subtle"
            borderLeftWidth="3px"
            borderLeftColor="#ec4899"
            borderRadius="l2"
            borderWidth="1px"
            p="3"
            bg="bg.subtle"
          >
            <Text color="fg.muted" fontSize="2xs">
              {t('stats.delay.preReleaseCount', { defaultValue: 'Pre-Release Debuts' })}
            </Text>
            <Text mt="0.5" color="#ec4899" fontSize="xl" fontWeight="bold">
              {stats.buckets[0]?.count ?? 0} {t('stats.songs', { defaultValue: 'songs' })}
            </Text>
            <Text color="fg.subtle" fontSize="2xs">
              {t('stats.delay.playedBeforeDrop', { defaultValue: 'Played before in-game release' })}
            </Text>
          </Box>

          <Box
            borderColor="border.subtle"
            borderLeftWidth="3px"
            borderLeftColor="#f59e0b"
            borderRadius="l2"
            borderWidth="1px"
            p="3"
            bg="bg.subtle"
          >
            <Text color="fg.muted" fontSize="2xs">
              {t('stats.delay.maxWait', { defaultValue: 'Longest Wait' })}
            </Text>
            <Text mt="0.5" color="#f59e0b" fontSize="xl" fontWeight="bold">
              {stats.maxDays} {t('stats.days', { defaultValue: 'days' })}
            </Text>
            <Text color="fg.subtle" fontSize="2xs">
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
          <Flex gap="2" justify="space-between" align="center" mb="2" flexWrap="wrap">
            <Text fontSize="sm" fontWeight="bold">
              {t('stats.delay.distTitle', { defaultValue: 'Debut Delay Distribution' })}
            </Text>
            <Text color="fg.muted" fontSize="xs">
              {t('stats.delay.clickBucket', {
                defaultValue: 'Click a bar to view songs in bucket'
              })}
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
              borderColor="border.subtle"
              borderRadius="l2"
              borderWidth="1px"
              mt="3"
              p="3"
              bg="bg.subtle"
            >
              <Text mb="2" fontSize="xs" fontWeight="bold">
                {selectedBucket.labelEn} ({selectedBucket.songs.length}{' '}
                {t('stats.songs', { defaultValue: 'songs' })}):
              </Text>
              <Wrap gap="1.5" maxH="160px" overflowY="auto">
                {selectedBucket.songs.map((s) => {
                  const title = sekaiSongName(s.songId, i18n.language);
                  return (
                    <Box
                      key={s.songId}
                      display="inline-flex"
                      gap="1.5"
                      alignItems="center"
                      borderColor="border.subtle"
                      borderRadius="full"
                      borderWidth="1px"
                      py="1"
                      px="2.5"
                      fontSize="xs"
                      bg="bg.default"
                    >
                      <Box flexShrink={0} borderRadius="full" w="2" h="2" bg={s.unitColor} />
                      <Text maxW="160px" truncate>
                        {title}
                      </Text>
                      <Text color="fg.muted" fontSize="2xs" fontWeight="bold">
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
            title={t('stats.delay.expressTitle', {
              defaultValue: '⚡ Express Lane: Fastest to the Stage'
            })}
            sub={t('stats.delay.expressSub', {
              defaultValue: 'Includes pre-release debuts at Anniversary Thanks Festivals & Symphony'
            })}
            lang={i18n.language}
            isExpress
          />

          <DelayTable
            songs={stats.longestWaits}
            title={t('stats.delay.longestTitle', {
              defaultValue: '⏳ Veteran Arrivals: Longest Wait to Stage'
            })}
            sub={t('stats.delay.longestSub', {
              defaultValue:
                'Songs that waited years from launch before their first live performance'
            })}
            lang={i18n.language}
          />
        </Grid>
      </Stack>
    </StatsPanel>
  );
}
