import { useTranslation } from 'react-i18next';
import { Box, Flex, HStack, Stack, Wrap } from 'styled-system/jsx';
import { StatsPanel } from './StatsPanel';
import { Text } from '~/components/ui/styled/text';
import { useSongInfo } from '~/components/sekai-setlist/song-info/song-info-context';
import { characterIconUrl } from '~/utils/sekai-setlist/assets';
import { sekaiSongName } from '~/utils/sekai-setlist/catalog';
import type {
  CharacterFocusCell,
  CharacterFocusRow,
  FocusMatrixStats
} from '~/utils/sekai-setlist/stats';

function FocusCellPill({
  cell,
  lang
}: {
  cell: CharacterFocusCell | null;
  lang: string;
}) {
  const { t } = useTranslation();
  const openSong = useSongInfo();

  if (!cell || !cell.songId) {
    return (
      <Box
        w="full"
        h="7"
        display="flex"
        alignItems="center"
        justifyContent="center"
        color="fg.subtle"
        fontSize="xs"
      >
        —
      </Box>
    );
  }

  const name = cell.title ? sekaiSongName(cell.songId, lang) : cell.songId;
  const isPerformed = cell.isPerformed;

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

  return (
    <Box
      as="button"
      onClick={() => cell.songId && openSong(cell.songId)}
      title={tooltip}
      w="full"
      h="7"
      borderRadius="sm"
      borderWidth="1px"
      borderColor={isPerformed ? 'accent.muted' : 'border.subtle'}
      bg={isPerformed ? 'accent.subtle' : 'bg.subtle'}
      color={isPerformed ? 'accent.default' : 'fg.muted'}
      display="flex"
      alignItems="center"
      justifyContent="center"
      fontSize="2xs"
      fontWeight="bold"
      cursor="pointer"
      transition="all 0.15s ease"
      _hover={{
        borderColor: isPerformed ? 'accent.default' : 'fg.muted',
        transform: 'scale(1.05)',
        zIndex: 1
      }}
    >
      <HStack gap="1" justify="center">
        <span>{cell.isWorldLink ? 'WL' : isPerformed ? `${cell.performanceCount}x` : '0x'}</span>
      </HStack>
    </Box>
  );
}

export function FocusMatrixSection({ stats }: { stats: FocusMatrixStats }) {
  const { t, i18n } = useTranslation();
  const isJa = i18n.language.startsWith('ja');

  // Group characters by unit
  const unitsMap = new Map<string, CharacterFocusRow[]>();
  for (const char of stats.characters) {
    const list = unitsMap.get(char.unitId) ?? [];
    list.push(char);
    unitsMap.set(char.unitId, list);
  }

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
        <Box
          borderColor="border.subtle"
          borderRadius="l2"
          borderWidth="1px"
          p="3"
          bg="bg.subtle"
        >
          <Flex justify="space-between" align="center" mb="2" flexWrap="wrap" gap="2">
            <Text fontSize="xs" fontWeight="bold">
              {t('stats.focus.debutProgress', { defaultValue: 'Debut Progress by Focus Cycle' })}
            </Text>
            <Text fontSize="xs" fontWeight="bold" color="accent.default">
              {stats.performedFocusSongs} / {stats.totalFocusSongs} ({stats.completionRate}%)
            </Text>
          </Flex>

          <Wrap gap="2">
            {stats.cycleCompletion.map((c) => {
              const allDone = c.performed === c.total && c.total > 0;
              return (
                <Box
                  key={c.cycle}
                  px="2.5"
                  py="1"
                  borderRadius="sm"
                  borderWidth="1px"
                  borderColor={allDone ? 'accent.muted' : 'border.subtle'}
                  bg={allDone ? 'accent.subtle' : 'bg.default'}
                  fontSize="2xs"
                  display="inline-flex"
                  alignItems="center"
                  gap="1.5"
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

        {/* Legend */}
        <HStack gap="4" justify="flex-end" px="1">
          <HStack gap="1.5">
            <Box w="3" h="3" borderRadius="xs" bg="accent.subtle" borderWidth="1px" borderColor="accent.muted" />
            <Text fontSize="2xs" color="fg.muted">
              {t('stats.focus.legendPerformed', { defaultValue: 'Performed (>0x)' })}
            </Text>
          </HStack>
          <HStack gap="1.5">
            <Box w="3" h="3" borderRadius="xs" bg="bg.subtle" borderWidth="1px" borderColor="border.subtle" />
            <Text fontSize="2xs" color="fg.muted">
              {t('stats.focus.legendUnperformed', { defaultValue: 'Awaiting Debut (0x)' })}
            </Text>
          </HStack>
          <HStack gap="1.5">
            <Text fontSize="2xs" color="fg.subtle">—</Text>
            <Text fontSize="2xs" color="fg.muted">
              {t('stats.focus.legendNotReleased', { defaultValue: 'Not Released Yet' })}
            </Text>
          </HStack>
        </HStack>

        {/* Matrix Grid */}
        <Box
          borderColor="border.subtle"
          borderRadius="l2"
          borderWidth="1px"
          overflowX="auto"
          bg="bg.default"
        >
          <Box minW="680px">
            {/* Header row */}
            <Flex
              bg="bg.subtle"
              borderBottomWidth="1px"
              borderColor="border.subtle"
              p="2"
              fontSize="2xs"
              fontWeight="bold"
              color="fg.muted"
              align="center"
            >
              <Box w="180px" flexShrink={0} pl="2">
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
              <Box w="60px" textAlign="right" pr="2">
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
                    p="1.5"
                    align="center"
                    borderBottomWidth="1px"
                    borderBottomColor="border.subtle"
                    _hover={{ bg: 'bg.subtle' }}
                  >
                    {/* Character Identity */}
                    <HStack w="180px" flexShrink={0} gap="2" pl="1">
                      <Box
                        w="1"
                        h="5"
                        borderRadius="full"
                        bg={char.unitColor}
                        flexShrink={0}
                      />
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
                        <FocusCellPill cell={cell} lang={i18n.language} />
                      </Box>
                    ))}

                    {/* World Link */}
                    <Box flex="1" px="1">
                      <FocusCellPill cell={char.worldLink} lang={i18n.language} />
                    </Box>

                    {/* Done count */}
                    <Box w="60px" textAlign="right" pr="2">
                      <Text fontSize="2xs" fontWeight="bold" color="fg.muted">
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
