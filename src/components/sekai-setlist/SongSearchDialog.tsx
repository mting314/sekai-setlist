/**
 * Sekai song picker: free-text search (JP title, kana reading, EN title), unit chips
 * (the six units plus "Other") and a commissioned/cover filter.
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BiPlus, BiX } from 'react-icons/bi';
import { Box, HStack, Stack } from 'styled-system/jsx';
import { SongJacket } from './SongJacket';
import { KindBadge, VocalistIcons } from './SongMeta';
import { UnitFilterChips } from './UnitFilterChips';
import { Button } from '~/components/ui/styled/button';
import { IconButton } from '~/components/ui/styled/icon-button';
import { Input } from '~/components/ui/styled/input';
import { Text } from '~/components/ui/styled/text';
import {
  Root as DialogRoot,
  Backdrop as DialogBackdrop,
  Positioner as DialogPositioner,
  Content as DialogContent,
  Title as DialogTitle,
  CloseTrigger as DialogCloseTrigger
} from '~/components/ui/styled/dialog';
import { sekaiSongName, sekaiSongSubName, sekaiSongs } from '~/utils/sekai-setlist/catalog';
import {
  EMPTY_SONG_FILTERS,
  NON_UNIT,
  filterSongs,
  type SongFilters,
  type SongKind,
  type UnitFilter
} from '~/utils/sekai-setlist/song-filter';

const MAX_RESULTS = 200;
const KINDS: SongKind[] = ['all', 'commissioned', 'cover'];

export interface SongSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (id: string) => void;
  /** Songs already in the setlist (shown as "Add again"; repeats are allowed for reprises). */
  addedIds: Set<string>;
}

export function SongSearchDialog({ open, onOpenChange, onPick, addedIds }: SongSearchDialogProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [filters, setFilters] = useState<SongFilters>(EMPTY_SONG_FILTERS);

  const results = useMemo(() => filterSongs(sekaiSongs, filters), [filters]);

  // Per-unit counts under the current search + kind (ignoring the unit selection itself), so
  // each chip shows how many songs picking it would add.
  const unitCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of filterSongs(sekaiSongs, { ...filters, units: [] })) {
      const keys = s.units.length ? s.units : [NON_UNIT];
      for (const u of keys) counts[u] = (counts[u] ?? 0) + 1;
    }
    return counts;
  }, [filters]);

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
    <DialogRoot
      open={open}
      onOpenChange={(details: { open: boolean }) => onOpenChange(details.open)}
    >
      <DialogBackdrop />
      <DialogPositioner>
        <DialogContent
          display="flex"
          flexDirection="column"
          w={{ base: 'calc(100vw - 16px)', md: '720px' }}
          maxW="720px"
          h={{ base: 'calc(100dvh - 32px)', md: '80vh' }}
          overflow="hidden"
        >
          <Stack gap={3} borderBottomWidth="1px" p={{ base: 3, md: 4 }}>
            <HStack justifyContent="space-between">
              <DialogTitle>{t('sekaiSetlist.addSongs', { defaultValue: 'Add songs' })}</DialogTitle>
              <DialogCloseTrigger asChild>
                <IconButton
                  variant="ghost"
                  size="sm"
                  aria-label={t('common.close', { defaultValue: 'Close' })}
                >
                  <BiX size={20} />
                </IconButton>
              </DialogCloseTrigger>
            </HStack>
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
            <HStack gap={1}>
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
              <Text ml="auto" color="fg.muted" fontSize="xs">
                {t('sekaiSetlist.resultCount', {
                  count: results.length,
                  defaultValue: `${results.length} songs`
                })}
              </Text>
            </HStack>
          </Stack>

          <Box flex={1} minH={0} p={2} overflowY="auto">
            {results.length === 0 ? (
              <Text p={6} color="fg.muted" fontSize="sm" textAlign="center">
                {t('sekaiSetlist.noResults', { defaultValue: 'No songs match.' })}
              </Text>
            ) : (
              <Stack gap={1}>
                {results.slice(0, MAX_RESULTS).map((s) => {
                  const sub = sekaiSongSubName(s.id, lang) ?? s.pronunciation;
                  return (
                    <HStack
                      key={s.id}
                      gap={2.5}
                      borderRadius="lg"
                      p={1.5}
                      _hover={{ bgColor: 'bg.subtle' }}
                    >
                      <SongJacket id={s.id} size={44} />
                      <Stack flex={1} gap={0.5} minW={0}>
                        <HStack gap={1.5} minW={0}>
                          <Text
                            fontSize="sm"
                            fontWeight="medium"
                            textOverflow="ellipsis"
                            overflow="hidden"
                            whiteSpace="nowrap"
                          >
                            {sekaiSongName(s.id, lang)}
                          </Text>
                          <KindBadge commissioned={s.commissioned} />
                        </HStack>
                        <HStack gap={2} minW={0}>
                          <VocalistIcons id={s.id} size={18} />
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
                      <Button
                        size="xs"
                        variant={addedIds.has(s.id) ? 'outline' : 'solid'}
                        aria-label={`${t('sekaiSetlist.add', { defaultValue: 'Add' })} ${sekaiSongName(s.id, lang)}`}
                        onClick={() => onPick(s.id)}
                        flexShrink={0}
                      >
                        <BiPlus />
                        {addedIds.has(s.id)
                          ? t('sekaiSetlist.addAgain', { defaultValue: 'Again' })
                          : t('sekaiSetlist.add', { defaultValue: 'Add' })}
                      </Button>
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
          </Box>
        </DialogContent>
      </DialogPositioner>
    </DialogRoot>
  );
}
