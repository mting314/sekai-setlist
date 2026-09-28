/**
 * One setlist row: drag handle, M01 / EN01 / MC① label, song (jacket, unit colour bar, event
 * nickname, song-info button), MC or divider band, and version / move / edit / delete actions.
 */
import { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslation } from 'react-i18next';
import { BiChevronDown, BiChevronUp, BiPencil, BiTrash } from 'react-icons/bi';
import { MdDragIndicator } from 'react-icons/md';
import { SongJacket } from '../../SongJacket';
import { VersionSwitch } from '../../SongMeta';
import { DropPreview } from './DropPreview';
import { ItemColorBar, ItemSummary } from './ItemSummary';
import { css } from 'styled-system/css';
import { Box, HStack, Stack } from 'styled-system/jsx';
import { IconButton } from '~/components/ui/styled/icon-button';
import { Text } from '~/components/ui/styled/text';
import { hasVsVersion } from '~/utils/sekai-setlist/catalog';
import { itemName } from '~/utils/sekai-setlist/prediction';
import type { SongVersion } from '~/types/sekai';
import type { PredictionItem } from '~/types/sekai-prediction';
import { isDividerRow } from '~/types/sekai-prediction';

export interface SetlistItemProps {
  item: PredictionItem;
  /** M01 / EN01 / MC①; none for dividers. */
  label?: string;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit?: () => void;
  /** Pick the Sekai ver. or VIRTUAL SINGER ver. of a song that has both. */
  onVersionChange?: (version: SongVersion) => void;
  isFirst: boolean;
  isLast: boolean;
  dropIndicatorPosition?: 'top' | 'bottom' | null;
  draggedItem?: PredictionItem;
}

const stop = (fn: () => void) => (e: React.MouseEvent) => {
  e.stopPropagation();
  fn();
};

export const SetlistItem = memo(function SetlistItem({
  item,
  label,
  onRemove,
  onMoveUp,
  onMoveDown,
  onEdit,
  onVersionChange,
  isFirst,
  isLast,
  dropIndicatorPosition,
  draggedItem
}: SetlistItemProps) {
  const { t, i18n } = useTranslation();
  const name = itemName(item, i18n.language);
  const versionSwitch = !!onVersionChange && item.type === 'song' && hasVsVersion(item.songId);
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id, data: { type: 'setlist-item', item } });

  return (
    <>
      {dropIndicatorPosition === 'top' && draggedItem && (
        <DropPreview item={draggedItem} position="top" />
      )}

      <Box
        className={css({ '&[data-is-dragging=true]': { opacity: 0.5 } })}
        ref={setNodeRef}
        data-item-id={item.id}
        data-item-type={item.type}
        data-song-id={item.type === 'song' ? item.songId : undefined}
        data-is-dragging={isDragging}
        style={{ transform: CSS.Transform.toString(transform), transition }}
        position="relative"
      >
        <Box
          className={css({ '&[data-is-divider=true]': { py: 3, bgColor: 'bg.emphasized' } })}
          data-is-divider={isDividerRow(item)}
          position="relative"
          borderRadius="md"
          py={2}
          px={3}
          bgColor="bg.default"
          overflow="hidden"
          _hover={{ bgColor: 'bg.muted' }}
        >
          <ItemColorBar item={item} />
          <HStack gap={2} justifyContent="space-between" alignItems="center">
            <HStack flex={1} gap={2} minW={0}>
              <Box
                className={css({ '&[data-is-dragging=true]': { cursor: 'grabbing' } })}
                ref={setActivatorNodeRef}
                data-drag-handle
                data-is-dragging={isDragging}
                style={{ touchAction: 'none' }}
                cursor="grab"
                flexShrink={0}
                p={2}
                {...attributes}
                {...listeners}
                aria-label={t('builder.dragToReorder', {
                  name,
                  defaultValue: `Drag ${name} to reorder`
                })}
                color="fg.muted"
                _hover={{ color: 'fg.default' }}
              >
                <MdDragIndicator size={20} />
              </Box>

              {label && (
                <Text
                  data-item-label
                  flexShrink={0}
                  minW="32px"
                  color={item.type === 'mc' ? 'fg.muted' : 'fg.default'}
                  fontSize="sm"
                  fontWeight="medium"
                  textAlign="center"
                >
                  {label}
                </Text>
              )}
              {item.type === 'song' && <SongJacket id={item.songId} size={32} />}

              <ItemSummary item={item} info versionBadge={!versionSwitch} />
            </HStack>

            <HStack gap={1} flexShrink={0}>
              {versionSwitch && item.type === 'song' && (
                <VersionSwitch version={item.version} onChange={onVersionChange!} />
              )}
              <Stack gap={0}>
                <IconButton
                  size="xs"
                  variant="ghost"
                  disabled={isFirst}
                  onClick={stop(onMoveUp)}
                  aria-label={t('builder.moveUp', { name, defaultValue: `Move ${name} up` })}
                  minW="32px"
                  h="24px"
                  _active={{ bg: 'bg.subtle' }}
                >
                  <BiChevronUp size={20} />
                </IconButton>
                <IconButton
                  size="xs"
                  variant="ghost"
                  disabled={isLast}
                  onClick={stop(onMoveDown)}
                  aria-label={t('builder.moveDown', { name, defaultValue: `Move ${name} down` })}
                  minW="32px"
                  h="24px"
                  _active={{ bg: 'bg.subtle' }}
                >
                  <BiChevronDown size={20} />
                </IconButton>
              </Stack>
              {onEdit && (
                <IconButton
                  size="sm"
                  variant="ghost"
                  onClick={stop(onEdit)}
                  aria-label={t('builder.editItem', { name, defaultValue: `Edit ${name}` })}
                >
                  <BiPencil size={14} />
                </IconButton>
              )}
              <IconButton
                size="xs"
                variant="ghost"
                onClick={stop(onRemove)}
                aria-label={t('builder.removeItem', { name, defaultValue: `Remove ${name}` })}
              >
                <BiTrash size={14} />
              </IconButton>
            </HStack>
          </HStack>
        </Box>
      </Box>

      {dropIndicatorPosition === 'bottom' && draggedItem && (
        <DropPreview item={draggedItem} position="bottom" />
      )}
    </>
  );
});
