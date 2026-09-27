/**
 * Past Project Sekai live setlists (COLORFUL LIVE, Thanks Festival, Sekai Symphony, Connect
 * Lives): filter by series and by the song picker's filters (search, unit, commissioned/cover),
 * browse each live's setlists or the most-performed songs, and open any setlist in the builder.
 */
import { Fragment, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BiChevronDown, BiChevronRight, BiLinkExternal, BiListPlus } from 'react-icons/bi';
import { join } from 'path-browserify';
import { Box, HStack, Stack, Wrap, styled } from 'styled-system/jsx';
import { SongJacket } from './SongJacket';
import { KindBadge } from './SongMeta';
import { UnitFilterChips } from './UnitFilterChips';
import { Badge } from '~/components/ui/styled/badge';
import { Button } from '~/components/ui/styled/button';
import { Input } from '~/components/ui/styled/input';
import { Link } from '~/components/ui/link';
import { Text } from '~/components/ui/styled/text';
import { getSekaiSong, sekaiLives, sekaiSongName } from '~/utils/sekai-setlist/catalog';
import {
  EMPTY_LIVE_FILTERS,
  LIVE_SERIES,
  filterLives,
  hasSongFilters,
  liveSongMatches,
  performanceToState,
  songStats,
  type LiveFilters
} from '~/utils/sekai-setlist/lives';
import { encodeState } from '~/utils/sekai-setlist/share';
import { NON_UNIT, type SongKind, type UnitFilter } from '~/utils/sekai-setlist/song-filter';
import type { SekaiLive, SekaiLivePerformance, SekaiLiveSeries } from '~/types/sekai';

const KINDS: SongKind[] = ['all', 'commissioned', 'cover'];
const MAX_STATS = 100;
const liveById = new Map(sekaiLives.map((l) => [l.id, l]));

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
    _disabled: { cursor: 'default', _hover: { bgColor: 'transparent' } },
    _hover: { bgColor: 'bg.subtle' }
  }
});

const SetlistRow = styled('div', {
  base: {
    display: 'flex',
    gap: '2.5',
    alignItems: 'center',
    py: '1',
    '&[data-dim=true]': { opacity: 0.35 }
  }
});

const builderHref = (live: SekaiLive, perf: SekaiLivePerformance) =>
  `${join(import.meta.env.BASE_URL, '/sekai-setlist')}#${encodeState(performanceToState(live, perf))}`;

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
  const upcoming = live.performances.length === 0;
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
      <CardHeader
        type="button"
        disabled={upcoming}
        aria-expanded={upcoming ? undefined : open}
        onClick={() => setOpen((o) => !o)}
      >
        <Box flexShrink={0} color="fg.muted">
          {upcoming ? null : open ? <BiChevronDown size={20} /> : <BiChevronRight size={20} />}
        </Box>
        <Stack flex={1} gap={1} minW={0}>
          <HStack gap={2} flexWrap="wrap">
            <Badge variant="outline" size="sm">
              {t(`sekaiSetlist.lives.series.${live.series}`, { defaultValue: live.series })}
            </Badge>
            {upcoming && (
              <Badge variant="subtle" size="sm">
                {t('sekaiSetlist.lives.upcoming', { defaultValue: 'Setlist TBA' })}
              </Badge>
            )}
            {filtered && (
              <Text color="fg.muted" fontSize="xs">
                {t('sekaiSetlist.lives.matchCount', {
                  count: matches,
                  defaultValue: `${matches} matching`
                })}
              </Text>
            )}
          </HStack>
          <Text fontSize="md" fontWeight="semibold">
            {i18n.language.startsWith('ja') && live.nameJa ? live.nameJa : live.name}
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
            {t('sekaiSetlist.lives.source', { defaultValue: 'Source: Project SEKAI Wiki' })}
            <BiLinkExternal />
          </Link>
        </Stack>
      )}
    </Box>
  );
}

function PerformanceList({
  live,
  perf,
  filters
}: {
  live: SekaiLive;
  perf: SekaiLivePerformance;
  filters: LiveFilters;
}) {
  const { t, i18n } = useTranslation();
  const filtered = hasSongFilters(filters);
  const markerLabel = (label: string) =>
    /^encore$/i.test(label)
      ? t('sekaiSetlist.lives.markerEncore', { defaultValue: 'Encore' })
      : /^intermission$/i.test(label)
        ? t('sekaiSetlist.lives.markerIntermission', { defaultValue: 'Intermission' })
        : label;

  return (
    <Stack gap={1}>
      <HStack gap={2} justifyContent="space-between">
        <Text fontSize="sm" fontWeight="semibold">
          {perf.name ||
            t('sekaiSetlist.lives.setlist', {
              count: perf.songs.length,
              defaultValue: `Setlist (${perf.songs.length} songs)`
            })}
        </Text>
        <Button asChild size="xs" variant="outline" flexShrink={0}>
          <a href={builderHref(live, perf)}>
            <BiListPlus />
            {t('sekaiSetlist.lives.openInBuilder', { defaultValue: 'Open in builder' })}
          </a>
        </Button>
      </HStack>
      <Stack gap={0.5}>
        {perf.songs.map((s, i) => {
          const song = s.songId ? getSekaiSong(s.songId) : undefined;
          const dim = filtered && !liveSongMatches(s, filters, getSekaiSong);
          const markers = perf.markers.filter((m) => m.at === i);
          return (
            <Fragment key={i}>
              {markers.map((m) => (
                <Text
                  key={m.label}
                  borderTopWidth="1px"
                  mt={1}
                  py={1}
                  color="fg.muted"
                  fontSize="xs"
                  fontWeight="semibold"
                  textAlign="center"
                  borderStyle="dashed"
                >
                  {markerLabel(m.label)}
                </Text>
              ))}
              <SetlistRow data-dim={dim}>
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
                {song ? (
                  <SongJacket id={song.id} size={32} />
                ) : (
                  <Box flexShrink={0} borderRadius="md" w="32px" h="32px" bgColor="bg.muted" />
                )}
                <Stack flex={1} gap={0} minW={0}>
                  <HStack gap={1.5} minW={0}>
                    <Text
                      fontSize="sm"
                      textOverflow="ellipsis"
                      overflow="hidden"
                      whiteSpace="nowrap"
                    >
                      {song ? sekaiSongName(song.id, i18n.language) : s.title}
                    </Text>
                    {s.note && (
                      <Text flexShrink={0} color="fg.muted" fontSize="xs">
                        {s.note}
                      </Text>
                    )}
                  </HStack>
                  {s.performers && (
                    <Text
                      color="fg.subtle"
                      fontSize="xs"
                      textOverflow="ellipsis"
                      overflow="hidden"
                      whiteSpace="nowrap"
                    >
                      {s.performers.join(', ')}
                    </Text>
                  )}
                </Stack>
                {song && <KindBadge commissioned={song.commissioned} />}
              </SetlistRow>
            </Fragment>
          );
        })}
      </Stack>
    </Stack>
  );
}

function SongStatsList({ stats }: { stats: ReturnType<typeof songStats> }) {
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
        const liveNames = st.lives.map((id) => liveById.get(id)?.name ?? id);
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
                <Text
                  fontSize="sm"
                  fontWeight="medium"
                  textOverflow="ellipsis"
                  overflow="hidden"
                  whiteSpace="nowrap"
                >
                  {sekaiSongName(st.songId, i18n.language)}
                </Text>
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
            <Stack gap={0} flexShrink={0} textAlign="right">
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
