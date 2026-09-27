/**
 * Centre panel: the setlist as a sortable, droppable list with M01 / EN01 / MC① numbering.
 */
import { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useTranslation } from 'react-i18next';
import { DropPreview } from './setlist-editor/DropPreview';
import { SetlistEndDropZone } from './setlist-editor/SetlistEndDropZone';
import { SetlistItem } from './setlist-editor/SetlistItem';
import { Box, HStack, Stack } from 'styled-system/jsx';
import { Button } from '~/components/ui/styled/button';
import { Text } from '~/components/ui/styled/text';
import { numberItems } from '~/utils/sekai-setlist/prediction';
import type { PredictionItem } from '~/types/sekai-prediction';
import { isSongRow } from '~/types/sekai-prediction';

export const DROP_ZONE = 'setlist-drop-zone';

export interface DropIndicator {
  /** Row the ghost is drawn against; undefined when the setlist is empty. */
  itemId?: string;
  position: 'top' | 'bottom';
  draggedItem: PredictionItem;
}

export interface SetlistEditorPanelProps {
  items: PredictionItem[];
  onRemove: (id: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onEdit?: (id: string) => void;
  onOpenImport?: () => void;
  dropIndicator?: DropIndicator | null;
}

export function SetlistEditorPanel({
  items,
  onRemove,
  onMoveUp,
  onMoveDown,
  onEdit,
  onOpenImport,
  dropIndicator
}: SetlistEditorPanelProps) {
  const { t } = useTranslation();
  const { setNodeRef } = useDroppable({ id: DROP_ZONE });
  const labels = useMemo(() => numberItems(items), [items]);
  const songs = items.filter(isSongRow).length;

  return (
    <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
      <Stack
        ref={setNodeRef}
        data-setlist-editor
        gap={2}
        minH="full"
        p={4}
        bgColor="bg.subtle"
        transition="background-color 0.2s"
      >
        {items.length === 0 ? (
          <Stack flex={1} gap={4} justifyContent="center" alignItems="center">
            {dropIndicator ? (
              <DropPreview item={dropIndicator.draggedItem} showDropHereText />
            ) : (
              <Box
                borderRadius="lg"
                borderWidth="2px"
                p={8}
                textAlign="center"
                borderStyle="dashed"
              >
                <Text mb={2} fontSize="lg" fontWeight="medium">
                  {t('builder.emptySetlist', { defaultValue: 'Your setlist is empty' })}
                </Text>
                <Text mb={onOpenImport ? 4 : 0} color="fg.muted" fontSize="sm">
                  {t('builder.emptySetlistHint', {
                    defaultValue: 'Search for songs on the left to add them here'
                  })}
                </Text>
                {onOpenImport && (
                  <Button onClick={onOpenImport}>
                    {t('builder.import', { defaultValue: 'Import' })}
                  </Button>
                )}
              </Box>
            )}
          </Stack>
        ) : (
          <>
            <HStack justifyContent="space-between" alignItems="center" mb={2}>
              <Text fontSize="lg" fontWeight="bold">
                {t('builder.yourSetlist', { defaultValue: 'Your setlist' })}
              </Text>
              <Text color="fg.muted" fontSize="sm">
                {t('builder.songCount', { count: songs, defaultValue: `${songs} songs` })}
              </Text>
            </HStack>

            {items.map((item, index) => {
              const indicated = dropIndicator?.itemId === item.id ? dropIndicator : undefined;
              return (
                <SetlistItem
                  key={item.id}
                  item={item}
                  label={labels[index]}
                  onRemove={() => onRemove(item.id)}
                  onMoveUp={() => onMoveUp(index)}
                  onMoveDown={() => onMoveDown(index)}
                  onEdit={onEdit && (() => onEdit(item.id))}
                  isFirst={index === 0}
                  isLast={index === items.length - 1}
                  dropIndicatorPosition={indicated?.position}
                  draggedItem={indicated?.draggedItem}
                />
              );
            })}
          </>
        )}
        <SetlistEndDropZone />
      </Stack>
    </SortableContext>
  );
}
