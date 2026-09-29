/**
 * One unit (or "Other"): its songs by how often they were performed live, the lives that
 * featured it, and how many of its performed songs you've heard.
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Grid, HStack, Stack, Wrap } from 'styled-system/jsx';
import { LiveSummaryCard, Stat } from './LiveSummaryCard';
import { SongJacket } from './SongJacket';
import { UnitBadge } from './SongMeta';
import { NicknameChips } from './song-info/NicknameChips';
import { SongPlayButton } from './audio/SongPlayButton';
import { SongInfoButton } from './song-info/SongInfoButton';
import { Badge } from '~/components/ui/styled/badge';
import { Button } from '~/components/ui/styled/button';
import { Link } from '~/components/ui/link';
import { Text } from '~/components/ui/styled/text';
import { useAttendance } from '~/hooks/useAttendance';
import { unitIconUrl } from '~/utils/sekai-setlist/assets';
import { ATTENDANCE_HOWS } from '~/utils/sekai-setlist/attendance';
import { attendanceStats, attendedShows } from '~/utils/sekai-setlist/attendance-stats';
import { getSekaiSong, sekaiSongName, sekaiSongs, sekaiUnits } from '~/utils/sekai-setlist/catalog';
import { sekaiLives } from '~/utils/sekai-setlist/live-data';
import { EMPTY_LIVE_FILTERS, filterLives, songStats } from '~/utils/sekai-setlist/lives';
import { songHref } from '~/utils/sekai-setlist/routes';
import { songMatchesUnit } from '~/utils/sekai-setlist/song-filter';
import type { SekaiUnitMeta } from '~/types/sekai';

const SONGS_SHOWN = 30;

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text fontSize="lg" fontWeight="bold">
      {children}
    </Text>
  );
}

export function UnitPage({ unit }: { unit: SekaiUnitMeta }) {
  const { t, i18n } = useTranslation();
  const [showAll, setShowAll] = useState(false);
  const { attendance } = useAttendance();

  const { songCount, performed, lives } = useMemo(() => {
    const filters = { ...EMPTY_LIVE_FILTERS, units: [unit.id] };
    return {
      songCount: sekaiSongs.filter((s) => songMatchesUnit(s, unit.id)).length,
      performed: songStats(sekaiLives, filters, getSekaiSong),
      lives: filterLives(sekaiLives, filters, getSekaiSong)
    };
  }, [unit.id]);
  const heard = useMemo(
    () =>
      attendanceStats(attendedShows(attendance, sekaiLives), ATTENDANCE_HOWS, getSekaiSong).byUnit[
        unit.id
      ] ?? 0,
    [attendance, unit.id]
  );
  const name = t(`sekaiSetlist.units.${unit.id}`, { defaultValue: unit.name });

  return (
    <Stack gap={6}>
      <Wrap gap={1.5}>
        {sekaiUnits.map((u) => (
          <UnitBadge key={u.id} unit={u.id} link current={u.id === unit.id} />
        ))}
      </Wrap>

      <HStack gap={3}>
        {unit.id !== 'other' && (
          <img
            src={unitIconUrl(unit.id)}
            alt=""
            width={56}
            height={56}
            style={{ objectFit: 'contain' }}
          />
        )}
        <Stack gap={1}>
          <Text as="h1" fontSize={{ base: '2xl', md: '3xl' }} fontWeight="bold" lineHeight="tight">
            {name}
          </Text>
          <Box style={{ backgroundColor: unit.color }} borderRadius="full" w="16" h="1" />
        </Stack>
      </HStack>

      <Grid gap={2} gridTemplateColumns={{ base: '1fr 1fr', md: 'repeat(4, 1fr)' }}>
        <Stat label={t('unit.statSongs', { defaultValue: 'Songs' })} value={songCount} />
        <Stat
          label={t('unit.statPerformed', { defaultValue: 'Performed live' })}
          value={performed.length}
        />
        <Stat label={t('unit.statLives', { defaultValue: 'Lives' })} value={lives.length} />
        <Stat
          label={t('unit.statHeard', { defaultValue: 'You heard' })}
          value={`${heard} / ${performed.length}`}
        />
      </Grid>

      <Stack gap={2}>
        <SectionTitle>{t('unit.mostPerformed', { defaultValue: 'Most performed' })}</SectionTitle>
        {performed.length === 0 ? (
          <Text color="fg.muted" fontSize="sm">
            {t('song.neverPerformed', { defaultValue: 'Not performed at a live yet.' })}
          </Text>
        ) : (
          <Stack gap={0}>
            {(showAll ? performed : performed.slice(0, SONGS_SHOWN)).map((s, i) => (
              <HStack key={s.songId} gap={2.5} py={1}>
                <Text
                  flexShrink={0}
                  w="6"
                  color="fg.subtle"
                  fontSize="xs"
                  fontVariantNumeric="tabular-nums"
                  textAlign="right"
                >
                  {i + 1}
                </Text>
                <SongJacket id={s.songId} size={32} />
                <HStack flex={1} gap={1.5} minW={0}>
                  <Link
                    href={songHref(s.songId)}
                    minW={0}
                    fontSize="sm"
                    textOverflow="ellipsis"
                    overflow="hidden"
                    whiteSpace="nowrap"
                  >
                    {sekaiSongName(s.songId, i18n.language)}
                  </Link>
                  <NicknameChips songId={s.songId} />
                  <SongPlayButton songId={s.songId} />
                  <SongInfoButton songId={s.songId} />
                </HStack>
                <Text flexShrink={0} color="fg.muted" fontSize="xs">
                  {t('sekaiSetlist.lives.livesCount', {
                    count: s.lives.length,
                    defaultValue: `${s.lives.length} lives`
                  })}
                </Text>
              </HStack>
            ))}
            {performed.length > SONGS_SHOWN && (
              <Button
                size="xs"
                variant="ghost"
                onClick={() => setShowAll((v) => !v)}
                alignSelf="flex-start"
              >
                {showAll
                  ? t('unit.showFewer', { defaultValue: 'Show fewer' })
                  : t('unit.showAll', {
                      count: performed.length,
                      defaultValue: `Show all ${performed.length}`
                    })}
              </Button>
            )}
          </Stack>
        )}
      </Stack>

      <Stack gap={2}>
        <SectionTitle>
          {t('unit.lives', { defaultValue: 'Lives featuring this unit' })}
        </SectionTitle>
        {lives.map(({ live, matches }) => (
          <LiveSummaryCard
            key={live.id}
            live={live}
            badges={
              <Badge variant="subtle" size="sm">
                {t('unit.songsAtLive', { count: matches, defaultValue: `${matches} songs` })}
              </Badge>
            }
          />
        ))}
      </Stack>
    </Stack>
  );
}
