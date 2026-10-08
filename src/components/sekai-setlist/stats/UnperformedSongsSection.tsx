import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Flex, HStack, Stack, Wrap } from 'styled-system/jsx';
import { StatsPanel } from './StatsPanel';
import { SongJacket } from '~/components/sekai-setlist/SongJacket';
import { UnitFilterChips } from '~/components/sekai-setlist/UnitFilterChips';
import { NicknameChips } from '~/components/sekai-setlist/song-info/NicknameChips';
import { SongInfoButton } from '~/components/sekai-setlist/song-info/SongInfoButton';
import { SongPlayButton } from '~/components/sekai-setlist/audio/SongPlayButton';
import { Badge } from '~/components/ui/styled/badge';
import { Button } from '~/components/ui/styled/button';
import { Input } from '~/components/ui/styled/input';
import { Text } from '~/components/ui/styled/text';
import { sekaiSongName, sekaiSongSubName } from '~/utils/sekai-setlist/catalog';
import type { UnitFilter } from '~/utils/sekai-setlist/song-filter';
import type { UnperformedSongItem } from '~/utils/sekai-setlist/stats';

type Mode = 'commissioned' | 'covers';
type SortOrder = 'oldest' | 'newest';
export type DebutFilter =
  | 'never'
  | 'awaiting_2d'
  | 'awaiting_3d'
  | 'awaiting_both'
  | 'awaiting_either';
export type SubFilter = 'all' | 'has_other' | 'no_other';

function matchesDebut(s: UnperformedSongItem, filter: DebutFilter, sub: SubFilter): boolean {
  if (filter === 'never') {
    return s.totalAppearances === 0;
  }
  if (filter === 'awaiting_2d') {
    if (s.screen2dCount !== 0) return false;
    if (sub === 'has_other') return s.cast3dCount > 0;
    if (sub === 'no_other') return s.totalAppearances === 0;
    return true;
  }
  if (filter === 'awaiting_3d') {
    if (s.cast3dCount !== 0) return false;
    if (sub === 'has_other') return s.screen2dCount > 0;
    if (sub === 'no_other') return s.totalAppearances === 0;
    return true;
  }
  if (filter === 'awaiting_both') {
    return s.screen2dCount === 0 && s.cast3dCount === 0;
  }
  if (filter === 'awaiting_either') {
    return s.screen2dCount === 0 || s.cast3dCount === 0;
  }
  return true;
}

export function UnperformedSongsSection({
  commissioned,
  coversAndOther,
  allAwaiting
}: {
  commissioned: UnperformedSongItem[];
  coversAndOther: UnperformedSongItem[];
  allAwaiting?: {
    commissioned: UnperformedSongItem[];
    coversAndOther: UnperformedSongItem[];
  };
}) {
  const { t, i18n } = useTranslation();
  const [mode, setMode] = useState<Mode>('commissioned');
  const [debutFilter, setDebutFilter] = useState<DebutFilter>('never');
  const [subFilter, setSubFilter] = useState<SubFilter>('all');
  const [search, setSearch] = useState('');
  const [selectedUnits, setSelectedUnits] = useState<UnitFilter[]>([]);
  const [sortOrder, setSortOrder] = useState<SortOrder>('oldest');

  const fullCommissioned = allAwaiting?.commissioned ?? commissioned;
  const fullCovers = allAwaiting?.coversAndOther ?? coversAndOther;

  const modeSource = mode === 'commissioned' ? fullCommissioned : fullCovers;

  // Counts for debut filters based on the currently selected mode
  const debutCounts = useMemo(() => {
    let never = 0;
    let awaiting2d = 0;
    let awaiting3d = 0;
    let awaitingBoth = 0;
    let awaitingEither = 0;

    for (const s of modeSource) {
      if (s.totalAppearances === 0) never++;
      if (s.screen2dCount === 0) awaiting2d++;
      if (s.cast3dCount === 0) awaiting3d++;
      if (s.screen2dCount === 0 && s.cast3dCount === 0) awaitingBoth++;
      if (s.screen2dCount === 0 || s.cast3dCount === 0) awaitingEither++;
    }

    return { never, awaiting2d, awaiting3d, awaitingBoth, awaitingEither };
  }, [modeSource]);

  // Sub-filter counts when awaiting 2D or 3D is active
  const subCounts = useMemo(() => {
    if (debutFilter === 'awaiting_2d') {
      let all = 0;
      let has3d = 0;
      let no3d = 0;
      for (const s of modeSource) {
        if (s.screen2dCount === 0) {
          all++;
          if (s.cast3dCount > 0) has3d++;
          else no3d++;
        }
      }
      return { all, hasOther: has3d, noOther: no3d };
    }
    if (debutFilter === 'awaiting_3d') {
      let all = 0;
      let has2d = 0;
      let no2d = 0;
      for (const s of modeSource) {
        if (s.cast3dCount === 0) {
          all++;
          if (s.screen2dCount > 0) has2d++;
          else no2d++;
        }
      }
      return { all, hasOther: has2d, noOther: no2d };
    }
    return { all: 0, hasOther: 0, noOther: 0 };
  }, [debutFilter, modeSource]);

  // Counts for the Mode toggle tabs (Commissioned vs Covers) under current debut/sub filters
  const modeCounts = useMemo(() => {
    let commCount = 0;
    for (const s of fullCommissioned) {
      if (matchesDebut(s, debutFilter, subFilter)) commCount++;
    }
    let covCount = 0;
    for (const s of fullCovers) {
      if (matchesDebut(s, debutFilter, subFilter)) covCount++;
    }
    return { commissioned: commCount, covers: covCount };
  }, [fullCommissioned, fullCovers, debutFilter, subFilter]);

  const pool = useMemo(() => {
    return modeSource.filter((s) => matchesDebut(s, debutFilter, subFilter));
  }, [modeSource, debutFilter, subFilter]);

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

  const handleDebutFilterChange = (newFilter: DebutFilter) => {
    setDebutFilter(newFilter);
    setSubFilter('all');
    setSelectedUnits([]);
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

  const panelDescription = useMemo(() => {
    const total = modeCounts.commissioned + modeCounts.covers;
    if (debutFilter === 'never') {
      return t('stats.unperformed.subtitle', {
        defaultValue:
          '{{total}} songs in Project SEKAI have never been performed live. Explore the most overdue commissioned originals and classic covers awaiting the stage.',
        total
      });
    }
    if (debutFilter === 'awaiting_2d') {
      return t('stats.unperformed.subtitle2d', {
        defaultValue:
          '{{total}} songs have never appeared at COLORFUL LIVE (2D screen projection). Explore songs awaiting their 3DCG stage debut.',
        total
      });
    }
    if (debutFilter === 'awaiting_3d') {
      return t('stats.unperformed.subtitle3d', {
        defaultValue:
          '{{total}} songs have never appeared at Anniversary Thanks Festival or Unit Fan Meetings (3D voice cast). Explore songs waiting to be performed by the cast in person.',
        total
      });
    }
    if (debutFilter === 'awaiting_both') {
      return t('stats.unperformed.subtitleBoth', {
        defaultValue: '{{total}} songs have never appeared in either 2D screen or 3D cast format.',
        total
      });
    }
    return t('stats.unperformed.subtitleEither', {
      defaultValue:
        '{{total}} songs are awaiting their live debut in at least one format (2D screen or 3D cast).',
      total
    });
  }, [debutFilter, modeCounts, t]);

  return (
    <StatsPanel
      title={t('stats.unperformed.title', { defaultValue: 'Songs Awaiting Live Debut' })}
      description={panelDescription}
    >
      <Stack gap="4">
        {/* Mode Toggle & Sort Buttons */}
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
                count: modeCounts.commissioned,
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
                count: modeCounts.covers,
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

        {/* Debut Format Filter */}
        <Stack gap="2">
          <Flex gap="2" align="center" flexWrap="wrap">
            <Text color="fg.muted" fontSize="xs" fontWeight="semibold">
              {t('stats.unperformed.debutFilterLabel', { defaultValue: 'Debut Format:' })}
            </Text>
            <Wrap gap="1.5">
              <Button
                size="xs"
                variant={debutFilter === 'never' ? 'solid' : 'outline'}
                onClick={() => handleDebutFilterChange('never')}
                title={t('stats.unperformed.filterNeverDesc', {
                  defaultValue: 'Never performed at any live'
                })}
              >
                {t('stats.unperformed.filterNever', { defaultValue: 'Never Live' })}{' '}
                <Text as="span" ml="1" fontSize="2xs" opacity={0.8}>
                  ({debutCounts.never})
                </Text>
              </Button>
              <Button
                size="xs"
                variant={debutFilter === 'awaiting_2d' ? 'solid' : 'outline'}
                onClick={() => handleDebutFilterChange('awaiting_2d')}
                title={t('stats.unperformed.filter2dDesc', {
                  defaultValue: 'Never performed at COLORFUL LIVE (2D Screen)'
                })}
              >
                {t('stats.unperformed.filter2d', { defaultValue: 'Awaiting 2D Debut' })}{' '}
                <Text as="span" ml="1" fontSize="2xs" opacity={0.8}>
                  ({debutCounts.awaiting2d})
                </Text>
              </Button>
              <Button
                size="xs"
                variant={debutFilter === 'awaiting_3d' ? 'solid' : 'outline'}
                onClick={() => handleDebutFilterChange('awaiting_3d')}
                title={t('stats.unperformed.filter3dDesc', {
                  defaultValue: 'Never performed at Thanks Fes or Fan Meeting (3D Cast)'
                })}
              >
                {t('stats.unperformed.filter3d', { defaultValue: 'Awaiting 3D Debut' })}{' '}
                <Text as="span" ml="1" fontSize="2xs" opacity={0.8}>
                  ({debutCounts.awaiting3d})
                </Text>
              </Button>
              <Button
                size="xs"
                variant={debutFilter === 'awaiting_both' ? 'solid' : 'outline'}
                onClick={() => handleDebutFilterChange('awaiting_both')}
                title={t('stats.unperformed.filterBothDesc', {
                  defaultValue: 'Never performed in either 2D Screen or 3D Cast'
                })}
              >
                {t('stats.unperformed.filterBoth', { defaultValue: 'Awaiting Both' })}{' '}
                <Text as="span" ml="1" fontSize="2xs" opacity={0.8}>
                  ({debutCounts.awaitingBoth})
                </Text>
              </Button>
              <Button
                size="xs"
                variant={debutFilter === 'awaiting_either' ? 'solid' : 'outline'}
                onClick={() => handleDebutFilterChange('awaiting_either')}
                title={t('stats.unperformed.filterEitherDesc', {
                  defaultValue: 'Awaiting debut in at least one format'
                })}
              >
                {t('stats.unperformed.filterEither', { defaultValue: 'Awaiting Either' })}{' '}
                <Text as="span" ml="1" fontSize="2xs" opacity={0.8}>
                  ({debutCounts.awaitingEither})
                </Text>
              </Button>
            </Wrap>
          </Flex>

          {/* Sub-filter when awaiting 2D or 3D */}
          {(debutFilter === 'awaiting_2d' || debutFilter === 'awaiting_3d') && (
            <Flex
              gap="2"
              align="center"
              borderColor="border.subtle"
              borderRadius="l1"
              borderWidth="1px"
              p="2"
              bg="bg.subtle"
              flexWrap="wrap"
            >
              <Text color="fg.muted" fontSize="2xs" fontWeight="semibold">
                {t('stats.unperformed.subFilterLabel', { defaultValue: 'Stage History:' })}
              </Text>
              <Wrap gap="1.5">
                <Button
                  size="xs"
                  variant={subFilter === 'all' ? 'subtle' : 'ghost'}
                  onClick={() => setSubFilter('all')}
                >
                  {t('stats.unperformed.subFilterAll', { defaultValue: 'All' })} ({subCounts.all})
                </Button>
                <Button
                  size="xs"
                  variant={subFilter === 'has_other' ? 'subtle' : 'ghost'}
                  onClick={() => setSubFilter('has_other')}
                >
                  {debutFilter === 'awaiting_2d'
                    ? t('stats.unperformed.subFilterHas3d', { defaultValue: 'Has 3D Cast Debut' })
                    : t('stats.unperformed.subFilterHas2d', {
                        defaultValue: 'Has 2D Screen Debut'
                      })}{' '}
                  ({subCounts.hasOther})
                </Button>
                <Button
                  size="xs"
                  variant={subFilter === 'no_other' ? 'subtle' : 'ghost'}
                  onClick={() => setSubFilter('no_other')}
                >
                  {t('stats.unperformed.subFilterNever', {
                    defaultValue: 'Never Live Anywhere'
                  })}{' '}
                  ({subCounts.noOther})
                </Button>
              </Wrap>
            </Flex>
          )}
        </Stack>

        {/* Filter Bar (Search + Unit Filter) */}
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
                        <HStack gap="2" color="fg.muted" fontSize="2xs" flexWrap="wrap">
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
                        {/* Format Debut Status Badges */}
                        <HStack gap="1.5" pt="0.5" flexWrap="wrap">
                          {song.screen2dCount > 0 ? (
                            <Badge
                              size="sm"
                              variant="subtle"
                              style={{
                                color: '#0891b2',
                                backgroundColor: 'rgba(6, 182, 212, 0.12)',
                                borderColor: 'rgba(6, 182, 212, 0.25)'
                              }}
                              title={
                                song.first2dLiveName
                                  ? t('stats.unperformed.tooltip2dDebut', {
                                      count: song.screen2dCount,
                                      first: song.first2dLiveName,
                                      defaultValue: `COLORFUL LIVE: ${song.screen2dCount}x (First: ${song.first2dLiveName})`
                                    })
                                  : undefined
                              }
                              py="0"
                              px="1.5"
                              fontSize="2xs"
                            >
                              {t('stats.unperformed.badge2d', {
                                count: song.screen2dCount,
                                defaultValue: `2D: ${song.screen2dCount}x`
                              })}
                            </Badge>
                          ) : (
                            <Badge
                              size="sm"
                              variant="outline"
                              title={t('stats.unperformed.tooltipAwaiting2d', {
                                defaultValue: 'Never performed at COLORFUL LIVE (2D Screen)'
                              })}
                              borderColor="border.subtle"
                              py="0"
                              px="1.5"
                              color="fg.muted"
                              fontSize="2xs"
                            >
                              {t('stats.unperformed.badgeAwaiting2d', {
                                defaultValue: 'Awaiting 2D'
                              })}
                            </Badge>
                          )}

                          {song.cast3dCount > 0 ? (
                            <Badge
                              size="sm"
                              variant="subtle"
                              style={{
                                color: '#ea580c',
                                backgroundColor: 'rgba(249, 115, 22, 0.12)',
                                borderColor: 'rgba(249, 115, 22, 0.25)'
                              }}
                              title={
                                song.first3dLiveName
                                  ? t('stats.unperformed.tooltip3dDebut', {
                                      count: song.cast3dCount,
                                      first: song.first3dLiveName,
                                      defaultValue: `3D Cast: ${song.cast3dCount}x (First: ${song.first3dLiveName})`
                                    })
                                  : undefined
                              }
                              py="0"
                              px="1.5"
                              fontSize="2xs"
                            >
                              {t('stats.unperformed.badge3d', {
                                count: song.cast3dCount,
                                defaultValue: `3D: ${song.cast3dCount}x`
                              })}
                            </Badge>
                          ) : (
                            <Badge
                              size="sm"
                              variant="outline"
                              title={t('stats.unperformed.tooltipAwaiting3d', {
                                defaultValue:
                                  'Never performed at Thanks Festival / Fan Meeting (3D Cast)'
                              })}
                              borderColor="border.subtle"
                              py="0"
                              px="1.5"
                              color="fg.muted"
                              fontSize="2xs"
                            >
                              {t('stats.unperformed.badgeAwaiting3d', {
                                defaultValue: 'Awaiting 3D'
                              })}
                            </Badge>
                          )}

                          {song.connectLiveCount > 0 && (
                            <Badge
                              size="sm"
                              variant="subtle"
                              style={{
                                color: '#7c3aed',
                                backgroundColor: 'rgba(139, 92, 246, 0.12)',
                                borderColor: 'rgba(139, 92, 246, 0.25)'
                              }}
                              py="0"
                              px="1.5"
                              fontSize="2xs"
                            >
                              {t('stats.unperformed.badgeConnectLive', {
                                count: song.connectLiveCount,
                                defaultValue: `Connect: ${song.connectLiveCount}x`
                              })}
                            </Badge>
                          )}

                          {song.symphonyCount > 0 && (
                            <Badge
                              size="sm"
                              variant="subtle"
                              style={{
                                color: '#db2777',
                                backgroundColor: 'rgba(236, 72, 153, 0.12)',
                                borderColor: 'rgba(236, 72, 153, 0.25)'
                              }}
                              py="0"
                              px="1.5"
                              fontSize="2xs"
                            >
                              {t('stats.unperformed.badgeSymphony', {
                                count: song.symphonyCount,
                                defaultValue: `Symphony: ${song.symphonyCount}x`
                              })}
                            </Badge>
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
