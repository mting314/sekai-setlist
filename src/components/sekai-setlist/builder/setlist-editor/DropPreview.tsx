/**
 * Dashed ghost of the row being dragged in, shown where it will land.
 */
import { useTranslation } from 'react-i18next';
import { MdDragIndicator } from 'react-icons/md';
import { ItemColorBar, ItemSummary } from './ItemSummary';
import { css } from 'styled-system/css';
import { Box, HStack } from 'styled-system/jsx';
import { Text } from '~/components/ui/styled/text';
import type { PredictionItem } from '~/types/sekai-prediction';

export interface DropPreviewProps {
  item: PredictionItem;
  position?: 'top' | 'bottom';
  showDropHereText?: boolean;
}

export function DropPreview({ item, position, showDropHereText = false }: DropPreviewProps) {
  const { t } = useTranslation();
  return (
    <Box
      className={css({
        '&[data-position=bottom]': { mt: 1 },
        '&[data-position=top]': { mb: 1 },
        '&[data-drop-text=true]': { w: 'full', maxW: '400px' }
      })}
      data-drop-preview
      data-position={position}
      data-drop-text={showDropHereText}
      opacity={0.6}
    >
      <Box
        position="relative"
        borderColor="border.emphasized"
        borderRadius="md"
        borderWidth="2px"
        w="full"
        py={2}
        px={3}
        bgColor="bg.muted"
        overflow="hidden"
        borderStyle="dashed"
      >
        <ItemColorBar item={item} />
        <HStack gap={2} alignItems="flex-start">
          <Box flexShrink={0} pt={0.5}>
            <MdDragIndicator size={16} />
          </Box>
          <ItemSummary item={item} />
        </HStack>
      </Box>
      {showDropHereText && (
        <Text mt={2} color="fg.muted" fontSize="sm" textAlign="center">
          {t('builder.dropHere', { defaultValue: 'Drop here to add to setlist' })}
        </Text>
      )}
    </Box>
  );
}
