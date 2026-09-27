/**
 * One catalog song: jacket, units, vocalists and release date, then every time it was performed
 * live (grouped by live, with setlist position, notes and encore).
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Grid, HStack, Stack, Wrap } from 'styled-system/jsx';
import { Card } from './LiveSummaryCard';
import { SongJacket } from './SongJacket';
import { KindBadge, UnitBadge, VocalistIcons } from './SongMeta';
import { Badge } from '~/components/ui/styled/badge';
import { Link } from '~/components/ui/link';
import { Text } from '~/components/ui/styled/text';
import { sekaiSongName, sekaiSongSubName } from '~/utils/sekai-setlist/catalog';
import { sekaiLiveName, sekaiLives } from '~/utils/sekai-setlist/live-data';
import { songHistory, type SongPerformance } from '~/utils/sekai-setlist/lives';
import { liveHref, songsHref } from '~/utils/sekai-setlist/routes';
import type { SekaiLive, SekaiSong } from '~/types/sekai';

const isoDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card>
      <Stack gap={0.5}>
        <Text color="fg.muted" fontSize="xs">
          {label}
        </Text>
        <Box fontSize="lg" fontWeight="bold">
          {value}
        </Box>
      </Stack>
    </Card>
  );
}

export function SongPage({ song }: { song: SekaiSong }) {
  const { t, i18n } = useTranslation();
  const history = useMemo(() => songHistory(song.id, sekaiLives), [song.id]);

  // Group appearances by live, keeping newest-first order.
  const byLive = useMemo(() => {
    const groups: { live: SekaiLive; entries: SongPerformance[] }[] = [];
    for (const h of history) {
      const last = groups.at(-1);
      if (last?.live.id === h.live.id) last.entries.push(h);
      else groups.push({ live: h.live, entries: [h] });
    }
    return groups;
  }, [history]);
  const setlistCount = new Set(history.map((h) => h.perf)).size;
  const units = song.units.length ? song.units : ['other'];
  const subName = sekaiSongSubName(song.id, i18n.language);

  return (
    <Stack gap={6}>
      <Stack gap={3}>
        <Link href={songsHref()} fontSize="sm">
          {t('song.allSongs', { defaultValue: '← All songs' })}
        </Link>
        <HStack gap={4} alignItems="flex-start">
          <SongJacket id={song.id} size={112} />
          <Stack gap={1.5} minW={0}>
            <Stack gap={0}>
              <Text
                as="h1"
                fontSize={{ base: 'xl', md: '3xl' }}
                fontWeight="bold"
                lineHeight="tight"
              >
                {sekaiSongName(song.id, i18n.language)}
              </Text>
              {subName && <Text color="fg.muted">{subName}</Text>}
            </Stack>
            <Wrap gap={1.5}>
              {units.map((u) => (
                <UnitBadge key={u} unit={u} />
              ))}
              <KindBadge commissioned={song.commissioned} />
            </Wrap>
            <VocalistIcons id={song.id} size={28} max={12} />
            {song.publishedAt && (
              <Text color="fg.muted" fontSize="xs">
                {t('song.released', {
                  date: isoDate(song.publishedAt),
                  defaultValue: `Added to the game ${isoDate(song.publishedAt)}`
                })}
              </Text>
            )}
          </Stack>
        </HStack>
      </Stack>

      {history.length === 0 ? (
        <Text color="fg.muted" fontSize="sm">
          {t('song.neverPerformed', { defaultValue: 'Not performed at a live yet.' })}
        </Text>
      ) : (
        <>
          <Grid gap={2} gridTemplateColumns={{ base: '1fr 1fr', md: 'repeat(4, 1fr)' }}>
            <Stat label={t('song.statLives', { defaultValue: 'Lives' })} value={byLive.length} />
            <Stat
              label={t('song.statSetlists', { defaultValue: 'Setlists' })}
              value={setlistCount}
            />
            <Stat
              label={t('song.firstPerformed', { defaultValue: 'First performed' })}
              value={
                <Text fontSize="sm">
                  {byLive.at(-1)!.live.startDate ?? byLive.at(-1)!.live.date}
                </Text>
              }
            />
            <Stat
              label={t('song.lastPerformed', { defaultValue: 'Last performed' })}
              value={<Text fontSize="sm">{byLive[0].live.startDate ?? byLive[0].live.date}</Text>}
            />
          </Grid>

          <Stack gap={2}>
            <Text fontSize="lg" fontWeight="bold">
              {t('song.history', { defaultValue: 'Performed at' })}
            </Text>
            {byLive.map(({ live, entries }) => (
              <Card key={live.id}>
                <Stack gap={1}>
                  <HStack gap={2} justifyContent="space-between" flexWrap="wrap">
                    <Link href={liveHref(live.id)} fontWeight="semibold">
                      {sekaiLiveName(live, i18n.language)}
                    </Link>
                    <Text color="fg.muted" fontSize="xs">
                      {live.date}
                    </Text>
                  </HStack>
                  <Wrap gap={1.5}>
                    {entries.map((e, i) => (
                      <HStack key={i} gap={1} color="fg.muted" fontSize="xs">
                        <Badge variant="outline" size="sm">
                          {e.perf.name ? `${e.perf.name} · #${e.position}` : `#${e.position}`}
                        </Badge>
                        {e.encore && (
                          <Badge variant="subtle" size="sm">
                            {t('sekaiSetlist.lives.markerEncore', { defaultValue: 'Encore' })}
                          </Badge>
                        )}
                        {e.note && <span>{e.note}</span>}
                      </HStack>
                    ))}
                  </Wrap>
                </Stack>
              </Card>
            ))}
          </Stack>
        </>
      )}
    </Stack>
  );
}
