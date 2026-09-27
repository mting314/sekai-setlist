/**
 * Song search (JP title, kana reading, EN title) with unit chips and a commissioned / cover
 * toggle. Drag a result into the setlist, double-click it, or press → to add it at the bottom.
 * With no match, the search text can be added as a custom (non-catalog) song.
 */
import { memo, useMemo, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { useTranslation } from 'react-i18next';
import { MdArrowForward, MdDragIndicator } from 'react-icons/md';
import { SongJacket } from '../SongJacket';
import { VocalistIcons } from '../SongMeta';
import { UnitFilterChips } from '../UnitFilterChips';
import { SongColorBar } from './setlist-editor/ItemSummary';
import { css } from 'styled-system/css';
import { Box, HStack, Stack } from 'styled-system/jsx';
import { Button } from '~/components/ui/styled/button';
import { IconButton } from '~/components/ui/styled/icon-button';
import { Input } from '~/components/ui/styled/input';
import { Text } from '~/components/ui/styled/text';
import { sekaiSongName, sekaiSongSubName, sekaiSongs } from '~/utils/sekai-setlist/catalog';
import {
  EMPTY_SONG_FILTERS,
  NON_UNIT,
  filterSongs,
  type SongFilters,
  type SongKind,
  type UnitFilter
} from '~/utils/sekai-setlist/song-filter';

const MAX_RESULTS = 100;
const KINDS: SongKind[] = ['all', 'commissioned', 'cover'];

interface DraggableSongItemProps {
  id: string;
  idPrefix: string;
  lang: string;
  onAddSong: (songId: string) => void;
}

const DraggableSongItem = memo(function DraggableSongItem({
  id,
  idPrefix,
  lang,
  onAddSong
}: DraggableSongItemProps) {
  const { t } = useTranslation();
  const name = sekaiSongName(id, lang);
  const sub = sekaiSongSubName(id, lang);
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
    id: `${idPrefix}-${id}`,
    data: { type: 'search-result', songId: id }
  });

  return (
    <Box
      className={css({ '&[data-is-dragging=true]': { opacity: 0.5, shadow: 'lg' } })}
      ref={setNodeRef}
      data-search-result
      data-song-id={id}
      data-is-dragging={isDragging}
      onDoubleClick={() => onAddSong(id)}
      position="relative"
      borderBottomWidth="1px"
      py={1.5}
      pl={2.5}
      pr={2}
      bgColor="bg.default"
      overflow="hidden"
      _hover={{ bgColor: 'bg.subtle' }}
    >
      <SongColorBar songId={id} width={3} />
      <HStack gap={2} alignItems="center">
        <Box
          className={css({ '&[data-is-dragging=true]': { cursor: 'grabbing' } })}
          ref={setActivatorNodeRef}
          data-drag-handle
          data-is-dragging={isDragging}
          style={{ touchAction: 'none' }}
          flexShrink={0}
          {...attributes}
          {...listeners}
          aria-label={t('builder.dragSong', {
            name,
            defaultValue: `Drag ${name} into the setlist`
          })}
          cursor="grab"
          color="fg.muted"
        >
          <MdDragIndicator size={16} />
        </Box>
        <SongJacket id={id} size={32} />
        <Stack flex={1} gap={0.5} minW={0}>
          <Text fontSize="sm" fontWeight="medium" lineHeight="1.3">
            {name}
          </Text>
          {sub && (
            <Text color="fg.muted" fontSize="xs" lineHeight="1.2">
              {sub}
            </Text>
          )}
          <VocalistIcons id={id} size={16} max={5} />
        </Stack>
        <IconButton
          size="xs"
          variant="ghost"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onAddSong(id);
          }}
          onDoubleClick={(e: React.MouseEvent) => e.stopPropagation()}
          aria-label={t('builder.addToSetlist', { name, defaultValue: `Add ${name} to setlist` })}
          flexShrink={0}
        >
          <MdArrowForward size={16} />
        </IconButton>
      </HStack>
    </Box>
  );
});

export interface SongSearchPanelProps {
  onAddSong: (songId: string) => void;
  onAddCustomSong?: (name: string) => void;
  /** Prefix for draggable ids, unique per mounted panel. */
  idPrefix?: string;
  maxH?: string;
  hideTitle?: boolean;
}

export function SongSearchPanel({
  onAddSong,
  onAddCustomSong,
  idPrefix = 'search',
  maxH = '400px',
  hideTitle = false
}: SongSearchPanelProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [filters, setFilters] = useState<SongFilters>(EMPTY_SONG_FILTERS);
  const results = useMemo(() => filterSongs(sekaiSongs, filters), [filters]);
  const query = filters.search.trim();

  // Per-unit counts under the current search + kind, so each chip shows what picking it adds.
  const unitCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of filterSongs(sekaiSongs, { ...filters, units: [] })) {
      for (const u of s.units.length ? s.units : [NON_UNIT]) counts[u] = (counts[u] ?? 0) + 1;
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
    <Stack gap={3} minH={0}>
      {!hideTitle && (
        <Text fontSize="lg" fontWeight="bold">
          {t('builder.songSearch', { defaultValue: 'Song search' })}
        </Text>
      )}

      <Input
        value={filters.search}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setFilters((f) => ({ ...f, search: e.target.value }))
        }
        placeholder={t('builder.searchSongs', { defaultValue: 'Search by title or reading…' })}
        aria-label={t('builder.searchSongsLabel', { defaultValue: 'Search songs' })}
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
      </HStack>

      <Box style={{ maxHeight: maxH }} borderRadius="md" borderWidth="1px" overflow="auto">
        {results.length === 0 ? (
          <Stack gap={3} alignItems="center" p={4}>
            <Text color="fg.muted" fontSize="sm" textAlign="center">
              {t('builder.noSongsFound', { defaultValue: 'No songs found' })}
            </Text>
            {onAddCustomSong && query && (
              <Button
                size="sm"
                onClick={() => {
                  onAddCustomSong(query);
                  setFilters((f) => ({ ...f, search: '' }));
                }}
              >
                {t('builder.addCustomSong', {
                  name: query,
                  defaultValue: `Add "${query}" as custom song`
                })}
              </Button>
            )}
          </Stack>
        ) : (
          <Stack gap={0}>
            {results.slice(0, MAX_RESULTS).map((s) => (
              <DraggableSongItem
                key={s.id}
                id={s.id}
                idPrefix={idPrefix}
                lang={lang}
                onAddSong={onAddSong}
              />
            ))}
          </Stack>
        )}
      </Box>

      {results.length > 0 && (
        <Text color="fg.muted" fontSize="xs" textAlign="center">
          {results.length > MAX_RESULTS
            ? t('builder.showingSome', {
                shown: MAX_RESULTS,
                count: results.length,
                defaultValue: `Showing ${MAX_RESULTS} of ${results.length} — refine your search`
              })
            : t('builder.showingResults', {
                count: results.length,
                defaultValue: `Showing ${results.length} results`
              })}
        </Text>
      )}
    </Stack>
  );
}
