import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Flex, HStack, Stack } from 'styled-system/jsx';
import { StatsPanel } from './StatsPanel';
import { SongJacket } from '~/components/sekai-setlist/SongJacket';
import { UnitFilterChips } from '~/components/sekai-setlist/UnitFilterChips';
import { NicknameChips } from '~/components/sekai-setlist/song-info/NicknameChips';
import { SongInfoButton } from '~/components/sekai-setlist/song-info/SongInfoButton';
import { SongPlayButton } from '~/components/sekai-setlist/audio/SongPlayButton';
import { Button } from '~/components/ui/styled/button';
import { Input } from '~/components/ui/styled/input';
import { Text } from '~/components/ui/styled/text';
import { sekaiSongName, sekaiSongSubName } from '~/utils/sekai-setlist/catalog';
import type { UnitFilter } from '~/utils/sekai-setlist/song-filter';
import type { UnperformedSongItem } from '~/utils/sekai-setlist/stats';

type Mode = 'commissioned' | 'covers';
type SortOrder = 'oldest' | 'newest';

export function UnperformedSongsSection({
  commissioned,
  coversAndOther
}: {
  commissioned: UnperformedSongItem[];
  coversAndOther: UnperformedSongItem[];
}) {
  const { t, i18n } = useTranslation();
  const [mode, setMode] = useState<Mode>('commissioned');
  const [search, setSearch] = useState('');
  const [selectedUnits, setSelectedUnits] = useState<UnitFilter[]>([]);
  const [sortOrder, setSortOrder] = useState<SortOrder>('oldest');

  const pool = mode === 'commissioned' ? commissioned : coversAndOther;

  // Unit counts for filter chips
  const unitCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const song of pool) {
      const u = song.units[0] ?? 'other';
      counts[u] = (counts[u] || 0) + 1;
    }
    return counts;
  }, [pool]);

  const toggleUnit = (u: UnitFilter) => {
    setSelectedUnits((prev) => (prev.includes(u) ? prev.filter((x) => x !== u) : [...prev, u]));
  };

  const filteredSongs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pool
      .filter((song) => {
        // Unit filter
        if (selectedUnits.length > 0) {
          const matchUnit =
            song.units.some((u) => selectedUnits.includes(u as UnitFilter)) ||
            (song.units.length === 0 && selectedUnits.includes('other'));
          if (!matchUnit) return false;
        }

        // Search query
        if (q) {
          const matchTitle = song.title.toLowerCase().includes(q);
          const matchEn = song.englishName?.toLowerCase().includes(q);
          const matchNick = song.nicknames?.some((n) => n.toLowerCase().includes(q));
          if (!matchTitle && !matchEn && !matchNick) return false;
        }

        return true;
      })
      .toSorted((a, b) => {
        const diff = (a.publishedAt ?? 0) - (b.publishedAt ?? 0);
        return sortOrder === 'oldest' ? diff : -diff;
      });
  }, [pool, search, selectedUnits, sortOrder]);

  const formatDate = (ms?: number) => {
    if (!ms) return '—';
    return new Date(ms).toLocaleDateString(i18n.language, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <StatsPanel
      title={t('stats.unperformed.title', { defaultValue: 'Songs Awaiting Live Debut' })}
      description={t('stats.unperformed.subtitle', {
        defaultValue:
          '{{total}} songs in Project SEKAI have never been performed live. Explore the most overdue commissioned originals and classic covers awaiting the stage.',
        total: commissioned.length + coversAndOther.length
      })}
    >
      <Stack gap="4">
        {/* Mode Toggle Buttons */}
        <Flex gap="2.5" justify="space-between" align="center" flexWrap="wrap">
          <HStack gap="2">
            <Button
              size="sm"
              variant={mode === 'commissioned' ? 'solid' : 'outline'}
              onClick={() => {
                setMode('commissioned');
                setSelectedUnits([]);
              }}
            >
              {t('stats.unperformed.commissionedTab', {
                count: commissioned.length,
                defaultValue: 'Commissioned Songs ({{count}})'
              })}
            </Button>
            <Button
              size="sm"
              variant={mode === 'covers' ? 'solid' : 'outline'}
              onClick={() => {
                setMode('covers');
                setSelectedUnits([]);
              }}
            >
              {t('stats.unperformed.coversTab', {
                count: coversAndOther.length,
                defaultValue: 'Covers & Outside ({{count}})'
              })}
            </Button>
          </HStack>

          {/* Sort order toggle */}
          <HStack gap="1.5">
            <Text color="fg.muted" fontSize="2xs">
              {t('stats.sort', { defaultValue: 'Sort:' })}
            </Text>
            <Button
              size="xs"
              variant={sortOrder === 'oldest' ? 'subtle' : 'ghost'}
              onClick={() => setSortOrder('oldest')}
            >
              {t('stats.unperformed.oldestFirst', { defaultValue: 'Most Overdue (Oldest)' })}
            </Button>
            <Button
              size="xs"
              variant={sortOrder === 'newest' ? 'subtle' : 'ghost'}
              onClick={() => setSortOrder('newest')}
            >
              {t('stats.unperformed.newestFirst', { defaultValue: 'Newest First' })}
            </Button>
          </HStack>
        </Flex>

        {/* Filter Bar */}
        <Stack gap="2.5">
          <Input
            placeholder={t('sekaiSetlist.searchPlaceholder', {
              defaultValue: 'Search by title or reading…'
            })}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="sm"
          />

          <UnitFilterChips selected={selectedUnits} counts={unitCounts} onToggle={toggleUnit} />
        </Stack>

        {/* Results Counter */}
        <Flex justify="space-between" align="center">
          <Text color="fg.muted" fontSize="xs">
            {t('sekaiSetlist.resultCount', {
              count: filteredSongs.length,
              defaultValue: '{{count}} songs'
            })}
          </Text>
          {mode === 'commissioned' && sortOrder === 'oldest' && (
            <Text color="accent.default" fontSize="2xs" fontWeight="bold">
              ★{' '}
              {t('stats.unperformed.rankedOverdue', {
                defaultValue: 'Ranked by longest time in game without live debut'
              })}
            </Text>
          )}
        </Flex>

        {/* Song List */}
        <Box
          borderColor="border.subtle"
          borderRadius="l2"
          borderWidth="1px"
          bg="bg.default"
          overflow="hidden"
        >
          <Stack gap="0" divideY="1px" divideColor="border.subtle" maxH="480px" overflowY="auto">
            {filteredSongs.length === 0 ? (
              <Box p="6" textAlign="center">
                <Text color="fg.muted" fontSize="sm">
                  {t('sekaiSetlist.noResults', { defaultValue: 'No songs match.' })}
                </Text>
              </Box>
            ) : (
              filteredSongs.map((song, idx) => {
                const name = sekaiSongName(song.songId, i18n.language);
                const sub = sekaiSongSubName(song.songId, i18n.language);

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
                        w="5"
                        color="fg.muted"
                        fontSize="xs"
                        fontWeight="bold"
                        textAlign="center"
                      >
                        #{idx + 1}
                      </Text>
                      <SongJacket id={song.songId} size={40} />
                      <Stack flex="1" gap="0.5" minW="0">
                        <HStack gap="1.5" flexWrap="wrap">
                          <Text title={name} fontSize="xs" fontWeight="bold" truncate>
                            {name}
                          </Text>
                          <Box
                            flexShrink={0}
                            borderRadius="full"
                            w="1.5"
                            h="1.5"
                            bg={song.unitColor}
                          />
                          <NicknameChips songId={song.songId} />
                        </HStack>
                        <HStack gap="2" color="fg.muted" fontSize="2xs">
                          <span>{song.unitName}</span>
                          <span>•</span>
                          <span>
                            {t('stats.unperformed.added', { defaultValue: 'Added' })}:{' '}
                            {formatDate(song.publishedAt)}
                          </span>
                          {sub && (
                            <>
                              <span>•</span>
                              <Text maxW="140px" truncate>
                                {sub}
                              </Text>
                            </>
                          )}
                        </HStack>
                      </Stack>
                    </HStack>

                    <HStack gap="1.5" flexShrink={0}>
                      <SongPlayButton songId={song.songId} />
                      <SongInfoButton songId={song.songId} />
                    </HStack>
                  </Flex>
                );
              })
            )}
          </Stack>
        </Box>
      </Stack>
    </StatsPanel>
  );
}
