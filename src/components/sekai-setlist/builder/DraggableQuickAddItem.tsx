/**
 * Quick Add row (MC / ENCORE / INTERMISSION): drag it into the setlist, or double-click or
 * press + to add it at the bottom.
 */
import { useDraggable } from '@dnd-kit/core';
import { useTranslation } from 'react-i18next';
import { BiPlus } from 'react-icons/bi';
import { MdDragIndicator } from 'react-icons/md';
import { quickAddTitle, type QuickAddType } from './quick-add';
import { css } from 'styled-system/css';
import { Box, HStack } from 'styled-system/jsx';
import { IconButton } from '~/components/ui/styled/icon-button';
import { Text } from '~/components/ui/styled/text';

export interface DraggableQuickAddItemProps {
  type: QuickAddType;
  /** Keeps draggable ids unique when the panel is mounted twice (panel and drawer). */
  idSuffix?: string;
  onAdd: () => void;
}

export function DraggableQuickAddItem({ type, idSuffix, onAdd }: DraggableQuickAddItemProps) {
  const { t } = useTranslation();
  const title = quickAddTitle(type);
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
    id: `quick-add-${type}${idSuffix ? `-${idSuffix}` : ''}`,
    data: { type: 'quick-add-item', itemType: type }
  });

  return (
    <Box
      className={css({ '&[data-is-dragging=true]': { opacity: 0.5, shadow: 'lg' } })}
      ref={setNodeRef}
      data-quick-add={type}
      data-is-dragging={isDragging}
      onDoubleClick={onAdd}
      borderRadius="md"
      borderWidth="1px"
      py={1}
      px={2}
      bgColor="bg.default"
      _hover={{ bgColor: 'bg.subtle' }}
    >
      <HStack gap={2} alignItems="center">
        <Box
          ref={setActivatorNodeRef}
          data-drag-handle
          data-is-dragging={isDragging}
          {...attributes}
          {...listeners}
          className={css({ '&[data-is-dragging=true]': { cursor: 'grabbing' } })}
          aria-label={t('builder.dragQuickAdd', {
            name: title,
            defaultValue: `Drag ${title} into the setlist`
          })}
          style={{ touchAction: 'none' }}
          cursor="grab"
          color="fg.muted"
        >
          <MdDragIndicator size={16} />
        </Box>
        <Text flex={1} fontSize="sm" fontWeight="medium">
          {title}
        </Text>
        <IconButton
          size="xs"
          variant="ghost"
          onClick={onAdd}
          onDoubleClick={(e: React.MouseEvent) => e.stopPropagation()}
          aria-label={t('builder.addQuickItem', { name: title, defaultValue: `Add ${title}` })}
        >
          <BiPlus />
        </IconButton>
      </HStack>
    </Box>
  );
}
