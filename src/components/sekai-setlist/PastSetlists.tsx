/**
 * Past Project Sekai live setlists (COLORFUL LIVE, Thanks Festival, Sekai Symphony, Connect
 * Lives, unit fan meetings): filter by series and by the song picker's filters (search, unit,
 * commissioned/cover), browse each live's setlists or the most-performed songs, and open any
 * setlist in the builder.
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BiCheckDouble,
  BiChevronDown,
  BiChevronRight,
  BiEdit,
  BiLinkExternal,
  BiRightArrowAlt
} from 'react-icons/bi';
import { Box, HStack, Stack, Wrap, styled } from 'styled-system/jsx';
import { PerformanceList } from './PerformanceList';
import { SongJacket } from './SongJacket';
import { LiveVisual } from './LiveVisual';
import { KindBadge } from './SongMeta';
import { UnitFilterChips } from './UnitFilterChips';
import { NicknameChips } from './song-info/NicknameChips';
import { SongPlayButton } from './audio/SongPlayButton';
import { SongInfoButton } from './song-info/SongInfoButton';
import { Badge } from '~/components/ui/styled/badge';
import { Button } from '~/components/ui/styled/button';
import { Input } from '~/components/ui/styled/input';
import { Link } from '~/components/ui/link';
import { Text } from '~/components/ui/styled/text';
import { getSekaiSong, sekaiSongName } from '~/utils/sekai-setlist/catalog';
import { getSekaiLive, sekaiLiveName, sekaiLives } from '~/utils/sekai-setlist/live-data';
import {
  EMPTY_LIVE_FILTERS,
  LIVE_SERIES,
  filterLives,
  hasSongFilters,
  liveSongMatches,
  songStats,
  type LiveFilters,
  type SongStat
} from '~/utils/sekai-setlist/lives';
import { builderHref, liveHref, markHref, songHref } from '~/utils/sekai-setlist/routes';
import { NON_UNIT, type SongKind, type UnitFilter } from '~/utils/sekai-setlist/song-filter';
import type { SekaiLive, SekaiLiveSeries } from '~/types/sekai';

const KINDS: SongKind[] = ['all', 'commissioned', 'cover'];
const MAX_STATS = 100;

type View = 'lives' | 'songs';

const CardHeader = styled('button', {
  base: {
    cursor: 'pointer',
    display: 'flex',
    gap: '3',
    alignItems: 'center',
    w: 'full',
    p: { base: '3', md: '4' },
    textAlign: 'left',
    _hover: { bgColor: 'bg.subtle' }
  }
});

const unitsOf = (songId: string): UnitFilter[] => {
  const units = getSekaiSong(songId)?.units ?? [];
  return units.length ? units : [NON_UNIT];
};

/** Tally unit filters over groups (songs or lives), each group counting once per unit. */
function countUnits(groups: Iterable<Iterable<UnitFilter>>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const g of groups) for (const u of new Set(g)) counts[u] = (counts[u] ?? 0) + 1;
  return counts;
}

export function PastSetlists() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<LiveFilters>(EMPTY_LIVE_FILTERS);
  const [view, setView] = useState<View>('lives');

  const lives = useMemo(() => filterLives(sekaiLives, filters, getSekaiSong), [filters]);
  const stats = useMemo(() => songStats(sekaiLives, filters, getSekaiSong), [filters]);

  // Chip counts ignore the unit selection itself: lives (Setlists view) or songs (Most performed)
  // that picking the unit would show.
  const unitCounts = useMemo(() => {
    const noUnits = { ...filters, units: [] };
    if (view === 'songs')
      return countUnits(songStats(sekaiLives, noUnits, getSekaiSong).map((s) => unitsOf(s.songId)));
    return countUnits(
      filterLives(sekaiLives, noUnits, getSekaiSong).map(({ live }) =>
        live.performances.flatMap((p) =>
          p.songs.flatMap((s) =>
            s.songId && liveSongMatches(s, noUnits, getSekaiSong) ? unitsOf(s.songId) : []
          )
        )
      )
    );
  }, [filters, view]);

  const toggleUnit = (u: UnitFilter) =>
    setFilters((f) => ({
      ...f,
      units: f.units.includes(u) ? f.units.filter((x) => x !== u) : [...f.units, u]
    }));
  const toggleSeries = (s: SekaiLiveSeries) =>
    setFilters((f) => ({
      ...f,
      series: f.series.includes(s) ? f.series.filter((x) => x !== s) : [...f.series, s]
    }));

  const kindLabel = (k: SongKind) =>
    k === 'all'
      ? t('sekaiSetlist.kindAll', { defaultValue: 'All' })
      : k === 'commissioned'
        ? t('sekaiSetlist.commissioned', { defaultValue: 'Commissioned' })
        : t('sekaiSetlist.covers', { defaultValue: 'Covers' });

  return (
    <Stack gap={4}>
      <Stack gap={3} borderRadius="xl" borderWidth="1px" p={{ base: 3, md: 4 }}>
        <Input
          value={filters.search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFilters((f) => ({ ...f, search: e.target.value }))
          }
          placeholder={t('sekaiSetlist.searchPlaceholder', {
            defaultValue: 'Search by title or reading…'
          })}
        />
        <Wrap gap={1}>
          {LIVE_SERIES.map((s) => (
            <Button
              key={s}
              size="xs"
              variant={filters.series.includes(s) ? 'solid' : 'outline'}
              aria-pressed={filters.series.includes(s)}
              onClick={() => toggleSeries(s)}
            >
              {t(`sekaiSetlist.lives.series.${s}`, { defaultValue: s })}
            </Button>
          ))}
        </Wrap>
        <UnitFilterChips selected={filters.units} counts={unitCounts} onToggle={toggleUnit} />
        <HStack gap={1} flexWrap="wrap">
          {KINDS.map((k) => (
            <Button
              key={k}
              size="xs"
              variant={filters.kind === k ? 'solid' : 'outline'}
              aria-pressed={filters.kind === k}
              onClick={() => setFilters((f) => ({ ...f, kind: k }))}
            >
              {kindLabel(k)}
            </Button>
          ))}
          <HStack gap={1} ml="auto">
            <Button
              size="xs"
              variant={view === 'lives' ? 'subtle' : 'ghost'}
              aria-pressed={view === 'lives'}
              onClick={() => setView('lives')}
            >
              {t('sekaiSetlist.lives.viewLives', { defaultValue: 'Setlists' })}
            </Button>
            <Button
              size="xs"
              variant={view === 'songs' ? 'subtle' : 'ghost'}
              aria-pressed={view === 'songs'}
              onClick={() => setView('songs')}
            >
              {t('sekaiSetlist.lives.viewSongs', { defaultValue: 'Most performed' })}
            </Button>
          </HStack>
        </HStack>
      </Stack>

      {view === 'lives' ? (
        lives.length === 0 ? (
          <Text p={6} color="fg.muted" fontSize="sm" textAlign="center">
            {t('sekaiSetlist.lives.noLives', { defaultValue: 'No lives match.' })}
          </Text>
        ) : (
          <Stack gap={2}>
            <Text color="fg.muted" fontSize="xs">
              {t('sekaiSetlist.lives.liveCount', {
                count: lives.length,
                defaultValue: `${lives.length} lives`
              })}
            </Text>
            {lives.map(({ live, matches }) => (
              <LiveCard key={live.id} live={live} matches={matches} filters={filters} />
            ))}
          </Stack>
        )
      ) : (
        <SongStatsList stats={stats} />
      )}
    </Stack>
  );
}

function LiveCard({
  live,
  matches,
  filters
}: {
  live: SekaiLive;
  matches: number;
  filters: LiveFilters;
}) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const filtered = hasSongFilters(filters);
  const noSetlist = live.performances.length === 0;
  const matchNames = filtered
    ? [
        ...new Set(
          live.performances.flatMap((p) =>
            p.songs
              .filter((s) => liveSongMatches(s, filters, getSekaiSong))
              .map((s) => (s.songId ? sekaiSongName(s.songId, i18n.language) : s.title))
          )
        )
      ]
    : [];

  return (
    <Box borderRadius="xl" borderWidth="1px" overflow="hidden">
      <CardHeader type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Box flexShrink={0} color="fg.muted">
          {open ? <BiChevronDown size={20} /> : <BiChevronRight size={20} />}
        </Box>
        <LiveVisual live={live} size="thumb" />
        <Stack flex={1} gap={1} minW={0}>
          <HStack gap={2} flexWrap="wrap">
            <Badge variant="outline" size="sm">
              {t(`sekaiSetlist.lives.series.${live.series}`, { defaultValue: live.series })}
            </Badge>
            {noSetlist && (
              <Badge variant="subtle" size="sm">
                {t('sekaiSetlist.lives.noSetlist', { defaultValue: 'No setlist yet' })}
              </Badge>
            )}
            {filtered && (
              <Text color="fg.muted" fontSize="xs">
                {t('sekaiSetlist.lives.matchCount', {
                  count: matches,
                  defaultValue: `${matches} matching songs`
                })}
              </Text>
            )}
          </HStack>
          <Text fontSize="md" fontWeight="semibold">
            {sekaiLiveName(live, i18n.language)}
          </Text>
          <Text color="fg.muted" fontSize="xs">
            {[live.date, live.venue].filter(Boolean).join(' · ')}
          </Text>
          {matchNames.length > 0 && !open && (
            <Text color="fg.subtle" fontSize="xs" lineClamp={2}>
              {matchNames.join(' / ')}
            </Text>
          )}
        </Stack>
      </CardHeader>

      {open && (
        <Stack gap={4} borderTopWidth="1px" p={{ base: 3, md: 4 }}>
          {live.notes.map((n) => (
            <Text key={n} color="fg.muted" fontSize="xs">
              {n}
            </Text>
          ))}
          <Wrap gap={2}>
            <Button asChild size="xs">
              <a href={liveHref(live.id)}>
                {t('live.open', { defaultValue: 'Live page' })} <BiRightArrowAlt />
              </a>
            </Button>
            <Button asChild size="xs" variant="outline">
              <a href={builderHref({ live: live.id })}>
                <BiEdit /> {t('game.predictLive', { defaultValue: 'Predict this setlist' })}
              </a>
            </Button>
            {!noSetlist && (
              <Button asChild size="xs" variant="outline">
                <a href={markHref({ live: live.id })}>
                  <BiCheckDouble /> {t('game.markLive', { defaultValue: 'Mark a prediction' })}
                </a>
              </Button>
            )}
          </Wrap>
          {live.performances.map((perf, i) => (
            <PerformanceList key={i} live={live} perf={perf} filters={filters} />
          ))}
          <Link
            href={live.source}
            target="_blank"
            rel="noopener noreferrer"
            color="fg.muted"
            fontSize="xs"
          >
            {t('sekaiSetlist.lives.source', {
              site: new URL(live.source).hostname,
              defaultValue: `Source: ${new URL(live.source).hostname}`
            })}
            <BiLinkExternal />
          </Link>
        </Stack>
      )}
    </Box>
  );
}

function SongStatsList({ stats }: { stats: SongStat[] }) {
  const { t, i18n } = useTranslation();
  if (stats.length === 0)
    return (
      <Text p={6} color="fg.muted" fontSize="sm" textAlign="center">
        {t('sekaiSetlist.noResults', { defaultValue: 'No songs match.' })}
      </Text>
    );
  return (
    <Stack gap={1}>
      <Text color="fg.muted" fontSize="xs">
        {t('sekaiSetlist.resultCount', {
          count: stats.length,
          defaultValue: `${stats.length} songs`
        })}
      </Text>
      {stats.slice(0, MAX_STATS).map((st, i) => {
        const song = getSekaiSong(st.songId);
        const liveNames = st.lives.map((id) => getSekaiLive(id)?.name ?? id);
        return (
          <HStack
            key={st.songId}
            gap={2.5}
            borderRadius="lg"
            p={1.5}
            _hover={{ bgColor: 'bg.subtle' }}
          >
            <Text
              flexShrink={0}
              w="7"
              color="fg.subtle"
              fontSize="xs"
              fontVariantNumeric="tabular-nums"
              textAlign="right"
            >
              {i + 1}
            </Text>
            <SongJacket id={st.songId} size={40} />
            <Stack flex={1} gap={0.5} minW={0}>
              <HStack gap={1.5} minW={0}>
                <Link
                  href={songHref(st.songId)}
                  fontSize="sm"
                  fontWeight="medium"
                  textOverflow="ellipsis"
                  overflow="hidden"
                  whiteSpace="nowrap"
                >
                  {sekaiSongName(st.songId, i18n.language)}
                </Link>
                <NicknameChips songId={st.songId} />
                {song && <KindBadge commissioned={song.commissioned} />}
              </HStack>
              <Text
                title={liveNames.join('\n')}
                color="fg.subtle"
                fontSize="xs"
                textOverflow="ellipsis"
                overflow="hidden"
                whiteSpace="nowrap"
              >
                {liveNames.join(' / ')}
              </Text>
            </Stack>
            <HStack gap={2} flexShrink={0} alignItems="center">
              <Stack gap={0} textAlign="right">
                <Text fontSize="sm" fontWeight="semibold">
                  {t('sekaiSetlist.lives.livesCount', {
                    count: st.lives.length,
                    defaultValue: `${st.lives.length} lives`
                  })}
                </Text>
                <Text color="fg.subtle" fontSize="xs">
                  {t('sekaiSetlist.lives.showsCount', {
                    count: st.performances,
                    defaultValue: `${st.performances} setlists`
                  })}
                </Text>
              </Stack>
              <SongPlayButton songId={st.songId} />
              <SongInfoButton songId={st.songId} />
            </HStack>
          </HStack>
        );
      })}
      {stats.length > MAX_STATS && (
        <Text p={3} color="fg.subtle" fontSize="xs" textAlign="center">
          {t('sekaiSetlist.truncated', {
            shown: MAX_STATS,
            total: stats.length,
            defaultValue: `Showing first ${MAX_STATS} of ${stats.length} — refine your search.`
          })}
        </Text>
      )}
    </Stack>
  );
}
