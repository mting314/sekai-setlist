/**
 * Song catalog browser (/songs): the song picker's search, unit and commissioned/cover filters,
 * an "only performed live" toggle, sorted by how many lives played the song or by release.
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HStack, Stack } from 'styled-system/jsx';
import { SongJacket } from './SongJacket';
import { KindBadge, VocalistIcons } from './SongMeta';
import { UnitFilterChips } from './UnitFilterChips';
import { NicknameChips } from './song-info/NicknameChips';
import { SongInfoButton } from './song-info/SongInfoButton';
import { Button } from '~/components/ui/styled/button';
import { Input } from '~/components/ui/styled/input';
import { Link } from '~/components/ui/link';
import { Text } from '~/components/ui/styled/text';
import {
  getSekaiSong,
  sekaiSongName,
  sekaiSongSubName,
  sekaiSongs
} from '~/utils/sekai-setlist/catalog';
import { sekaiLives } from '~/utils/sekai-setlist/live-data';
import { EMPTY_LIVE_FILTERS, songStats, type SongStat } from '~/utils/sekai-setlist/lives';
import { songHref } from '~/utils/sekai-setlist/routes';
import {
  EMPTY_SONG_FILTERS,
  NON_UNIT,
  filterSongs,
  type SongFilters,
  type SongKind,
  type UnitFilter
} from '~/utils/sekai-setlist/song-filter';
import type { SekaiSong } from '~/types/sekai';

const MAX_RESULTS = 200;
const KINDS: SongKind[] = ['all', 'commissioned', 'cover'];
type Sort = 'performed' | 'newest';

const statsById = new Map<string, SongStat>(
  songStats(sekaiLives, EMPTY_LIVE_FILTERS, getSekaiSong).map((s) => [s.songId, s])
);

export function SongBrowser() {
  const { t, i18n } = useTranslation();
  const [filters, setFilters] = useState<SongFilters>(EMPTY_SONG_FILTERS);
  const [performedOnly, setPerformedOnly] = useState(false);
  const [sort, setSort] = useState<Sort>('performed');

  const pool = useMemo(
    () => (performedOnly ? sekaiSongs.filter((s) => statsById.has(s.id)) : sekaiSongs),
    [performedOnly]
  );

  const results = useMemo(() => {
    const livesOf = (s: SekaiSong) => statsById.get(s.id)?.lives.length ?? 0;
    const newest = (a: SekaiSong, b: SekaiSong) =>
      (b.publishedAt ?? 0) - (a.publishedAt ?? 0) || Number(b.id) - Number(a.id);
    return filterSongs(pool, filters).toSorted((a, b) =>
      sort === 'performed' ? livesOf(b) - livesOf(a) || newest(a, b) : newest(a, b)
    );
  }, [pool, filters, sort]);

  const unitCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of filterSongs(pool, { ...filters, units: [] })) {
      const keys = s.units.length ? s.units : [NON_UNIT];
      for (const u of keys) counts[u] = (counts[u] ?? 0) + 1;
    }
    return counts;
  }, [pool, filters]);

  const toggleUnit = (u: UnitFilter) =>
    setFilters((f) => ({
      ...f,
      units: f.units.includes(u) ? f.units.filter((x) => x !== u) : [...f.units, u]
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
          <Button
            size="xs"
            variant={performedOnly ? 'solid' : 'outline'}
            aria-pressed={performedOnly}
            onClick={() => setPerformedOnly((p) => !p)}
          >
            {t('song.performedOnly', { defaultValue: 'Performed live' })}
          </Button>
          <HStack gap={1} ml="auto">
            <Button
              size="xs"
              variant={sort === 'performed' ? 'subtle' : 'ghost'}
              aria-pressed={sort === 'performed'}
              onClick={() => setSort('performed')}
            >
              {t('song.sortPerformed', { defaultValue: 'Most performed' })}
            </Button>
            <Button
              size="xs"
              variant={sort === 'newest' ? 'subtle' : 'ghost'}
              aria-pressed={sort === 'newest'}
              onClick={() => setSort('newest')}
            >
              {t('song.sortNewest', { defaultValue: 'Newest' })}
            </Button>
          </HStack>
        </HStack>
      </Stack>

      {results.length === 0 ? (
        <Text p={6} color="fg.muted" fontSize="sm" textAlign="center">
          {t('sekaiSetlist.noResults', { defaultValue: 'No songs match.' })}
        </Text>
      ) : (
        <Stack gap={1}>
          <Text color="fg.muted" fontSize="xs">
            {t('sekaiSetlist.resultCount', {
              count: results.length,
              defaultValue: `${results.length} songs`
            })}
          </Text>
          {results.slice(0, MAX_RESULTS).map((song) => {
            const st = statsById.get(song.id);
            const sub = sekaiSongSubName(song.id, i18n.language);
            return (
              <HStack
                key={song.id}
                gap={2.5}
                borderRadius="lg"
                p={1.5}
                _hover={{ bgColor: 'bg.subtle' }}
              >
                <SongJacket id={song.id} size={40} />
                <Stack flex={1} gap={0.5} minW={0}>
                  <HStack gap={1.5} minW={0}>
                    <Link
                      href={songHref(song.id)}
                      fontSize="sm"
                      fontWeight="medium"
                      textOverflow="ellipsis"
                      overflow="hidden"
                      whiteSpace="nowrap"
                    >
                      {sekaiSongName(song.id, i18n.language)}
                    </Link>
                    <NicknameChips songId={song.id} />
                    <KindBadge commissioned={song.commissioned} />
                    <SongInfoButton songId={song.id} />
                  </HStack>
                  <HStack gap={2} minW={0}>
                    <VocalistIcons id={song.id} size={16} />
                    {sub && (
                      <Text
                        color="fg.subtle"
                        fontSize="xs"
                        textOverflow="ellipsis"
                        overflow="hidden"
                        whiteSpace="nowrap"
                      >
                        {sub}
                      </Text>
                    )}
                  </HStack>
                </Stack>
                <Text flexShrink={0} color={st ? 'fg.default' : 'fg.subtle'} fontSize="xs">
                  {st
                    ? t('sekaiSetlist.lives.livesCount', {
                        count: st.lives.length,
                        defaultValue: `${st.lives.length} lives`
                      })
                    : t('song.notPerformed', { defaultValue: 'Not performed' })}
                </Text>
              </HStack>
            );
          })}
          {results.length > MAX_RESULTS && (
            <Text p={3} color="fg.subtle" fontSize="xs" textAlign="center">
              {t('sekaiSetlist.truncated', {
                shown: MAX_RESULTS,
                total: results.length,
                defaultValue: `Showing first ${MAX_RESULTS} of ${results.length} — refine your search.`
              })}
            </Text>
          )}
        </Stack>
      )}
    </Stack>
  );
}
