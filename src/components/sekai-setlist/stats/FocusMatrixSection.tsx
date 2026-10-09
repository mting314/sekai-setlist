import { useMemo, useState, type CSSProperties, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Portal } from '@ark-ui/react';
import { BiLinkExternal } from 'react-icons/bi';
import { Box, Flex, HStack, Stack, Wrap, styled } from 'styled-system/jsx';
import { StatsPanel } from './StatsPanel';
import { SongJacket } from '~/components/sekai-setlist/SongJacket';
import { NicknameChip } from '~/components/sekai-setlist/song-info/NicknameChips';
import { useSongInfo } from '~/components/sekai-setlist/song-info/song-info-context';
import { HoverCard } from '~/components/ui/hover-card';
import { Badge } from '~/components/ui/styled/badge';
import { Button } from '~/components/ui/styled/button';
import { Text } from '~/components/ui/styled/text';
import { characterIconUrl } from '~/utils/sekai-setlist/assets';
import { sekaiSongName } from '~/utils/sekai-setlist/catalog';
import { sekaiBestEventUrl } from '~/utils/sekai-setlist/song-events';
import type {
  CharacterFocusCell,
  CharacterFocusRow,
  FocusMatrixStats
} from '~/utils/sekai-setlist/stats';

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const isoDate = (ms: number) => new Date(ms + JST_OFFSET_MS).toISOString().slice(0, 10);

const EventLink = styled('a', {
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '1',
    color: 'accent.default',
    fontSize: 'xs',
    fontWeight: 'medium',
    textDecoration: 'none',
    lineClamp: 1,
    _hover: { textDecoration: 'underline' }
  }
});

export type HeatmapPalette = 'emerald' | 'sunset' | 'neon';

export function getHeatLevel(count: number): number {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count <= 4) return 3;
  if (count <= 6) return 4;
  return 5;
}

export function getHeatStyle(level: number, palette: HeatmapPalette): CSSProperties {
  if (level === 0) {
    return {
      backgroundColor: 'var(--colors-bg-subtle)',
      borderColor: 'var(--colors-border-subtle)',
      color: 'var(--colors-fg-muted)'
    };
  }

  if (palette === 'emerald') {
    switch (level) {
      case 1:
        return {
          backgroundColor: 'color-mix(in srgb, #14b8a6 20%, transparent)',
          borderColor: 'color-mix(in srgb, #14b8a6 45%, transparent)',
          color: 'var(--colors-accent-default)'
        };
      case 2:
        return {
          backgroundColor: 'color-mix(in srgb, #14b8a6 40%, transparent)',
          borderColor: 'color-mix(in srgb, #14b8a6 70%, transparent)',
          color: 'var(--colors-accent-default)'
        };
      case 3:
        return {
          backgroundColor: 'color-mix(in srgb, #0d9488 65%, transparent)',
          borderColor: '#0d9488',
          color: '#ffffff'
        };
      case 4:
        return {
          backgroundColor: '#0d9488',
          borderColor: '#0f766e',
          color: '#ffffff'
        };
      case 5:
      default:
        return {
          backgroundColor: '#047857',
          borderColor: '#34d399',
          color: '#ffffff',
          boxShadow: '0 0 7px rgba(52, 211, 153, 0.45)'
        };
    }
  }

  if (palette === 'sunset') {
    switch (level) {
      case 1:
        return {
          backgroundColor: 'color-mix(in srgb, #eab308 24%, transparent)',
          borderColor: 'color-mix(in srgb, #eab308 50%, transparent)',
          color: '#ca8a04'
        };
      case 2:
        return {
          backgroundColor: 'color-mix(in srgb, #f59e0b 42%, transparent)',
          borderColor: 'color-mix(in srgb, #f59e0b 70%, transparent)',
          color: '#d97706'
        };
      case 3:
        return {
          backgroundColor: 'color-mix(in srgb, #f97316 68%, transparent)',
          borderColor: '#f97316',
          color: '#ffffff'
        };
      case 4:
        return {
          backgroundColor: '#ea580c',
          borderColor: '#c2410c',
          color: '#ffffff'
        };
      case 5:
      default:
        return {
          backgroundColor: '#dc2626',
          borderColor: '#fca5a5',
          color: '#ffffff',
          boxShadow: '0 0 7px rgba(239, 68, 68, 0.45)'
        };
    }
  }

  // Neon (Purple / Magenta / Pink)
  switch (level) {
    case 1:
      return {
        backgroundColor: 'color-mix(in srgb, #8b5cf6 22%, transparent)',
        borderColor: 'color-mix(in srgb, #8b5cf6 45%, transparent)',
        color: '#7c3aed'
      };
    case 2:
      return {
        backgroundColor: 'color-mix(in srgb, #a855f7 42%, transparent)',
        borderColor: 'color-mix(in srgb, #a855f7 70%, transparent)',
        color: '#9333ea'
      };
    case 3:
      return {
        backgroundColor: 'color-mix(in srgb, #c026d3 65%, transparent)',
        borderColor: '#c026d3',
        color: '#ffffff'
      };
    case 4:
      return {
        backgroundColor: '#c026d3',
        borderColor: '#a21caf',
        color: '#ffffff'
      };
    case 5:
    default:
      return {
        backgroundColor: '#be185d',
        borderColor: '#f472b6',
        color: '#ffffff',
        boxShadow: '0 0 7px rgba(244, 114, 182, 0.45)'
      };
  }
}

function FocusCellPill({
  cell,
  lang,
  palette,
  selectedHeatLevel
}: {
  cell: CharacterFocusCell | null;
  lang: string;
  palette: HeatmapPalette;
  selectedHeatLevel: number | null;
}) {
  const { t } = useTranslation();
  const openSong = useSongInfo();

  if (!cell || !cell.songId) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        w="full"
        h="7"
        color="fg.subtle"
        fontSize="xs"
      >
        —
      </Box>
    );
  }

  const name = cell.title ? sekaiSongName(cell.songId, lang) : cell.songId;
  const isPerformed = cell.isPerformed;
  const heatLevel = getHeatLevel(cell.performanceCount);
  const heatStyle = getHeatStyle(heatLevel, palette);

  const isDimmed = selectedHeatLevel !== null && selectedHeatLevel !== heatLevel;
  const isHighlighted = selectedHeatLevel === heatLevel;

  const tooltip = isPerformed
    ? `${name} (${cell.nickname ?? ''})\n${t('stats.focus.playedTimes', {
        count: cell.performanceCount,
        defaultValue: 'Played {{count}} times live'
      })}\n${t('stats.focus.firstLive', {
        live: cell.firstLiveName ?? '—',
        defaultValue: 'First: {{live}}'
      })}`
    : `${name} (${cell.nickname ?? ''})\n${t('stats.focus.unperformed', {
        defaultValue: 'Awaiting first live performance'
      })}`;

  const label = cell.isWorldLink
    ? `WL ${cell.performanceCount > 0 ? `${cell.performanceCount}x` : '0x'}`
    : `${cell.performanceCount}x`;

  return (
    <HoverCard.Root openDelay={120} closeDelay={150} positioning={{ placement: 'top', gutter: 8 }}>
      <HoverCard.Trigger asChild>
        <Box
          as="button"
          onClick={() => cell.songId && openSong(cell.songId)}
          title={tooltip}
          data-focus-cell={cell.songId}
          style={heatStyle}
          cursor="pointer"
          display="flex"
          transform={isHighlighted ? 'scale(1.08)' : 'none'}
          justifyContent="center"
          alignItems="center"
          outline={isHighlighted ? '2px solid currentColor' : 'none'}
          borderRadius="sm"
          borderWidth="1px"
          w="full"
          h="7"
          fontSize="2xs"
          fontWeight="bold"
          opacity={isDimmed ? 0.25 : 1}
          transition="all 0.15s ease"
          _hover={{
            transform: 'scale(1.1)',
            zIndex: 2,
            boxShadow: 'md'
          }}
        >
          <span>{label}</span>
        </Box>
      </HoverCard.Trigger>
      <Portal>
        <HoverCard.Positioner style={{ zIndex: 100 }}>
          <HoverCard.Content
            data-focus-hover-card={cell.songId}
            bg="bg.default"
            borderColor="border.default"
            borderRadius="md"
            borderWidth="1px"
            boxShadow="xl"
            p="3"
            w="310px"
            maxW="90vw"
            fontSize="xs"
            lineHeight="normal"
            textAlign="left"
            pointerEvents="auto"
          >
            <Stack gap="2.5">
              {/* Header: Jacket + Song Title + Cycle & Nickname */}
              <HStack gap="2.5" alignItems="flex-start">
                <SongJacket id={cell.songId} size={48} />
                <Stack gap="1" flex="1" minW="0">
                  <HStack gap="1.5" flexWrap="wrap" alignItems="center">
                    {cell.nickname && (
                      <NicknameChip
                        nickname={cell.nickname}
                        songId={cell.songId}
                        eventId={cell.eventId}
                      />
                    )}
                    <Badge size="sm" variant="subtle">
                      {cell.isWorldLink
                        ? t('stats.focus.hoverWorldLink', { defaultValue: 'World Link' })
                        : t('stats.focus.hoverFocusCycle', {
                            cycle: cell.cycle,
                            defaultValue: `Focus ${cell.cycle}`
                          })}
                    </Badge>
                  </HStack>
                  <Text fontWeight="bold" fontSize="sm" lineClamp={2} title={name}>
                    {name}
                  </Text>
                  {cell.englishName && cell.englishName !== name && (
                    <Text color="fg.muted" fontSize="2xs" lineClamp={1}>
                      {cell.englishName}
                    </Text>
                  )}
                </Stack>
              </HStack>

              {/* Event info */}
              {cell.eventName && (
                <Box
                  bg="bg.subtle"
                  borderColor="border.subtle"
                  borderRadius="sm"
                  borderWidth="1px"
                  p="2"
                >
                  <Flex justify="space-between" align="center" gap="1" mb="0.5">
                    <Text color="fg.muted" fontSize="2xs" fontWeight="bold">
                      {t('stats.focus.hoverEvent', { defaultValue: 'Event' })}
                    </Text>
                    {cell.publishedAt && (
                      <Text color="fg.muted" fontSize="2xs">
                        {isoDate(cell.publishedAt)}
                      </Text>
                    )}
                  </Flex>
                  {cell.eventId ? (
                    <EventLink
                      href={sekaiBestEventUrl(cell.eventId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e: MouseEvent) => e.stopPropagation()}
                    >
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {cell.eventName}
                      </span>
                      <BiLinkExternal size={11} style={{ flexShrink: 0 }} />
                    </EventLink>
                  ) : (
                    <Text fontSize="xs" fontWeight="medium" lineClamp={1}>
                      {cell.eventName}
                    </Text>
                  )}
                </Box>
              )}

              {/* Performances Section */}
              <Stack gap="1.5">
                <Flex justify="space-between" align="center">
                  <Text color="fg.muted" fontSize="2xs" fontWeight="bold">
                    {t('stats.focus.hoverPerformances', { defaultValue: 'Live Performances' })}
                  </Text>
                  <Text
                    fontWeight="bold"
                    fontSize="xs"
                    color={isPerformed ? 'accent.default' : 'fg.muted'}
                  >
                    {isPerformed
                      ? t('stats.focus.playedTimes', {
                          count: cell.performanceCount,
                          defaultValue: '{{count}}x'
                        })
                      : t('stats.focus.hoverNeverPlayed', { defaultValue: 'Never Live' })}
                  </Text>
                </Flex>

                {isPerformed ? (
                  <>
                    {/* Format breakdown pills */}
                    <Wrap gap="1">
                      {cell.screen2dCount > 0 && (
                        <Box
                          display="inline-flex"
                          alignItems="center"
                          gap="1"
                          px="1.5"
                          py="0.5"
                          borderRadius="sm"
                          borderWidth="1px"
                          fontSize="2xs"
                          fontWeight="medium"
                          style={{
                            backgroundColor: 'color-mix(in srgb, #06b6d4 15%, transparent)',
                            borderColor: '#06b6d4',
                            color: '#06b6d4'
                          }}
                        >
                          <span>2D: {cell.screen2dCount}x</span>
                        </Box>
                      )}
                      {cell.cast3dCount > 0 && (
                        <Box
                          display="inline-flex"
                          alignItems="center"
                          gap="1"
                          px="1.5"
                          py="0.5"
                          borderRadius="sm"
                          borderWidth="1px"
                          fontSize="2xs"
                          fontWeight="medium"
                          style={{
                            backgroundColor: 'color-mix(in srgb, #f97316 15%, transparent)',
                            borderColor: '#f97316',
                            color: '#f97316'
                          }}
                        >
                          <span>3D Cast: {cell.cast3dCount}x</span>
                        </Box>
                      )}
                      {(cell.connectLiveCount ?? 0) > 0 && (
                        <Box
                          display="inline-flex"
                          alignItems="center"
                          gap="1"
                          px="1.5"
                          py="0.5"
                          borderRadius="sm"
                          borderWidth="1px"
                          fontSize="2xs"
                          fontWeight="medium"
                          style={{
                            backgroundColor: 'color-mix(in srgb, #8b5cf6 15%, transparent)',
                            borderColor: '#8b5cf6',
                            color: '#8b5cf6'
                          }}
                        >
                          <span>Connect: {cell.connectLiveCount}x</span>
                        </Box>
                      )}
                      {(cell.symphonyCount ?? 0) > 0 && (
                        <Box
                          display="inline-flex"
                          alignItems="center"
                          gap="1"
                          px="1.5"
                          py="0.5"
                          borderRadius="sm"
                          borderWidth="1px"
                          fontSize="2xs"
                          fontWeight="medium"
                          style={{
                            backgroundColor: 'color-mix(in srgb, #ec4899 15%, transparent)',
                            borderColor: '#ec4899',
                            color: '#ec4899'
                          }}
                        >
                          <span>Symphony: {cell.symphonyCount}x</span>
                        </Box>
                      )}
                    </Wrap>

                    {/* Debut & Latest Live */}
                    <Stack gap="1" pt="1" fontSize="2xs">
                      {cell.firstLiveName && (
                        <Flex gap="1.5" align="baseline">
                          <Text color="fg.muted" flexShrink={0}>
                            {t('stats.focus.hoverStageDebut', { defaultValue: 'Debut:' })}
                          </Text>
                          <Text fontWeight="medium" lineClamp={1}>
                            {cell.firstLiveName}
                            {cell.firstLiveDate && (
                              <Text as="span" color="fg.muted" ml="1">
                                ({cell.firstLiveDate})
                              </Text>
                            )}
                          </Text>
                        </Flex>
                      )}
                      {cell.performanceCount > 1 &&
                        cell.latestLiveName &&
                        cell.latestLiveName !== cell.firstLiveName && (
                          <Flex gap="1.5" align="baseline">
                            <Text color="fg.muted" flexShrink={0}>
                              {t('stats.focus.hoverLatestLive', { defaultValue: 'Latest:' })}
                            </Text>
                            <Text fontWeight="medium" lineClamp={1}>
                              {cell.latestLiveName}
                              {cell.latestLiveDate && (
                                <Text as="span" color="fg.muted" ml="1">
                                  ({cell.latestLiveDate})
                                </Text>
                              )}
                            </Text>
                          </Flex>
                        )}
                    </Stack>
                  </>
                ) : (
                  <Box
                    bg="bg.subtle"
                    borderColor="border.subtle"
                    borderRadius="sm"
                    borderWidth="1px"
                    p="2"
                    textAlign="center"
                  >
                    <Text color="fg.muted" fontSize="2xs">
                      {t('stats.focus.unperformed', {
                        defaultValue: 'Awaiting first live performance'
                      })}
                    </Text>
                  </Box>
                )}
              </Stack>

              {/* Footer Hint */}
              <Box
                pt="2"
                borderTopWidth="1px"
                borderColor="border.subtle"
                color="fg.subtle"
                fontSize="2xs"
                textAlign="center"
              >
                {t('stats.focus.hoverClickToOpen', {
                  defaultValue: 'Click cell to view song info & setlists'
                })}
              </Box>
            </Stack>
          </HoverCard.Content>
        </HoverCard.Positioner>
      </Portal>
    </HoverCard.Root>
  );
}

export function FocusMatrixSection({ stats }: { stats: FocusMatrixStats }) {
  const { t, i18n } = useTranslation();
  const [palette, setPalette] = useState<HeatmapPalette>('emerald');
  const [selectedHeatLevel, setSelectedHeatLevel] = useState<number | null>(null);
  const isJa = i18n.language.startsWith('ja');

  // Group characters by unit
  const unitsMap = useMemo(() => {
    const map = new Map<string, CharacterFocusRow[]>();
    for (const char of stats.characters) {
      const list = map.get(char.unitId) ?? [];
      list.push(char);
      map.set(char.unitId, list);
    }
    return map;
  }, [stats.characters]);

  // Compute counts for each heat level
  const heatCounts = useMemo(() => {
    const counts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const char of stats.characters) {
      for (const c of char.cycles) {
        if (c) {
          const lvl = getHeatLevel(c.performanceCount);
          counts[lvl] = (counts[lvl] || 0) + 1;
        }
      }
      if (char.worldLink) {
        const lvl = getHeatLevel(char.worldLink.performanceCount);
        counts[lvl] = (counts[lvl] || 0) + 1;
      }
    }
    return counts;
  }, [stats.characters]);

  const heatLevelDefs = [
    { level: 0, key: 'heatLevel_0', fallback: '0x (Awaiting)' },
    { level: 1, key: 'heatLevel_1', fallback: '1x' },
    { level: 2, key: 'heatLevel_2', fallback: '2x' },
    { level: 3, key: 'heatLevel_3', fallback: '3–4x' },
    { level: 4, key: 'heatLevel_4', fallback: '5–6x' },
    { level: 5, key: 'heatLevel_5', fallback: '7+x' }
  ];

  return (
    <StatsPanel
      title={t('stats.focus.title', { defaultValue: 'Character Focus Songs Live Debut Matrix' })}
      description={t('stats.focus.subtitle', {
        defaultValue:
          'Tracking event-commissioned focus songs for the 20 main characters across Focus Cycles 1–7 and World Link. Click any cell to view song credits and setlists.'
      })}
    >
      <Stack gap="4">
        {/* Progress Overview Bar */}
        <Box borderColor="border.subtle" borderRadius="l2" borderWidth="1px" p="3" bg="bg.subtle">
          <Flex gap="2" justify="space-between" align="center" mb="2" flexWrap="wrap">
            <Text fontSize="xs" fontWeight="bold">
              {t('stats.focus.debutProgress', { defaultValue: 'Debut Progress by Focus Cycle' })}
            </Text>
            <Text color="accent.default" fontSize="xs" fontWeight="bold">
              {stats.performedFocusSongs} / {stats.totalFocusSongs} ({stats.completionRate}%)
            </Text>
          </Flex>

          <Wrap gap="2">
            {stats.cycleCompletion.map((c) => {
              const allDone = c.performed === c.total && c.total > 0;
              return (
                <Box
                  key={c.cycle}
                  display="inline-flex"
                  gap="1.5"
                  alignItems="center"
                  borderColor={allDone ? 'accent.muted' : 'border.subtle'}
                  borderRadius="sm"
                  borderWidth="1px"
                  py="1"
                  px="2.5"
                  fontSize="2xs"
                  bg={allDone ? 'accent.subtle' : 'bg.default'}
                >
                  <Text fontWeight="bold">Focus {c.cycle}:</Text>
                  <Text color={allDone ? 'accent.default' : 'fg.muted'}>
                    {c.performed}/{c.total} ({c.percent}%)
                  </Text>
                </Box>
              );
            })}
          </Wrap>
        </Box>

        {/* Heatmap Controls: Legend & Palette Switcher */}
        <Flex
          gap="2.5"
          justify="space-between"
          align={{ base: 'flex-start', sm: 'center' }}
          borderColor="border.subtle"
          borderRadius="l2"
          borderWidth="1px"
          p="2.5"
          bg="bg.subtle"
          flexWrap="wrap"
        >
          {/* Heatmap Legend Swatches */}
          <HStack gap="1.5" alignItems="center" flexWrap="wrap">
            <Text color="fg.muted" fontSize="2xs" fontWeight="bold">
              {t('stats.focus.heatmap', { defaultValue: 'Heatmap:' })}
            </Text>
            {heatLevelDefs.map((def) => {
              const isSelected = selectedHeatLevel === def.level;
              const count = heatCounts[def.level] ?? 0;
              const style = getHeatStyle(def.level, palette);
              const label = t(`stats.focus.${def.key}`, { defaultValue: def.fallback });

              return (
                <Box
                  as="button"
                  key={def.level}
                  onClick={() =>
                    setSelectedHeatLevel((prev) => (prev === def.level ? null : def.level))
                  }
                  title={`Click to filter: ${label} (${count} songs)`}
                  style={style}
                  cursor="pointer"
                  transform={isSelected ? 'scale(1.08)' : 'none'}
                  outline={isSelected ? '2px solid currentColor' : 'none'}
                  borderRadius="xs"
                  borderWidth="1px"
                  py="0.75"
                  px="2"
                  fontSize="2xs"
                  fontWeight="bold"
                  opacity={selectedHeatLevel !== null && !isSelected ? 0.35 : 1}
                  transition="all 0.15s ease"
                >
                  {label} ({count})
                </Box>
              );
            })}
            {selectedHeatLevel !== null && (
              <Button
                size="xs"
                variant="ghost"
                onClick={() => setSelectedHeatLevel(null)}
                h="auto"
                py="0.5"
                px="2"
                fontSize="2xs"
              >
                {t('stats.focus.clearFilter', { defaultValue: 'Show All' })}
              </Button>
            )}
          </HStack>

          {/* Palette Selector */}
          <HStack gap="1" alignItems="center">
            <Text color="fg.muted" fontSize="2xs">
              {t('stats.focus.palette', { defaultValue: 'Palette:' })}
            </Text>
            <Button
              size="xs"
              variant={palette === 'emerald' ? 'solid' : 'subtle'}
              onClick={() => setPalette('emerald')}
              h="auto"
              py="0.5"
              px="2"
              fontSize="2xs"
            >
              {t('stats.focus.paletteEmerald', { defaultValue: 'Emerald' })}
            </Button>
            <Button
              size="xs"
              variant={palette === 'sunset' ? 'solid' : 'subtle'}
              onClick={() => setPalette('sunset')}
              h="auto"
              py="0.5"
              px="2"
              fontSize="2xs"
            >
              {t('stats.focus.paletteSunset', { defaultValue: 'Sunset' })}
            </Button>
            <Button
              size="xs"
              variant={palette === 'neon' ? 'solid' : 'subtle'}
              onClick={() => setPalette('neon')}
              h="auto"
              py="0.5"
              px="2"
              fontSize="2xs"
            >
              {t('stats.focus.paletteNeon', { defaultValue: 'Neon' })}
            </Button>
          </HStack>
        </Flex>

        {/* Matrix Grid */}
        <Box
          borderColor="border.subtle"
          borderRadius="l2"
          borderWidth="1px"
          bg="bg.default"
          overflowX="auto"
        >
          <Box minW="680px">
            {/* Header row */}
            <Flex
              align="center"
              borderColor="border.subtle"
              borderBottomWidth="1px"
              p="2"
              color="fg.muted"
              fontSize="2xs"
              fontWeight="bold"
              bg="bg.subtle"
            >
              <Box flexShrink={0} w="180px" pl="2">
                {t('stats.focus.character', { defaultValue: 'Character' })}
              </Box>
              {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                <Box key={num} flex="1" textAlign="center">
                  F{num}
                </Box>
              ))}
              <Box flex="1" textAlign="center">
                WL
              </Box>
              <Box w="60px" pr="2" textAlign="right">
                {t('stats.focus.ratio', { defaultValue: 'Done' })}
              </Box>
            </Flex>

            {/* Character rows grouped by unit */}
            {[...unitsMap.entries()].map(([unitId, chars], uIdx) => (
              <Box
                key={unitId}
                borderTopWidth={uIdx > 0 ? '2px' : '0px'}
                borderTopColor="border.subtle"
              >
                {chars.map((char) => (
                  <Flex
                    key={char.characterId}
                    align="center"
                    borderBottomWidth="1px"
                    borderBottomColor="border.subtle"
                    p="1.5"
                    _hover={{ bg: 'bg.subtle' }}
                  >
                    {/* Character Identity */}
                    <HStack gap="2" flexShrink={0} w="180px" pl="1">
                      <Box flexShrink={0} borderRadius="full" w="1" h="5" bg={char.unitColor} />
                      <img
                        src={characterIconUrl(char.characterId)}
                        alt={char.name}
                        width={24}
                        height={24}
                        style={{ borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <Text fontSize="xs" fontWeight="medium" truncate>
                        {isJa ? char.nameJa : char.name}
                      </Text>
                    </HStack>

                    {/* Focus 1 to 7 */}
                    {char.cycles.map((cell, cIdx) => (
                      <Box key={cIdx} flex="1" px="1">
                        <FocusCellPill
                          cell={cell}
                          lang={i18n.language}
                          palette={palette}
                          selectedHeatLevel={selectedHeatLevel}
                        />
                      </Box>
                    ))}

                    {/* World Link */}
                    <Box flex="1" px="1">
                      <FocusCellPill
                        cell={char.worldLink}
                        lang={i18n.language}
                        palette={palette}
                        selectedHeatLevel={selectedHeatLevel}
                      />
                    </Box>

                    {/* Done count */}
                    <Box w="60px" pr="2" textAlign="right">
                      <Text color="fg.muted" fontSize="2xs" fontWeight="bold">
                        {char.performedSongs}/{char.totalSongs}
                      </Text>
                    </Box>
                  </Flex>
                ))}
              </Box>
            ))}
          </Box>
        </Box>
      </Stack>
    </StatsPanel>
  );
}
