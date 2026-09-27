/**
 * Invisible drop target after the last row, for adding to the end of the setlist.
 */
import { useDroppable } from '@dnd-kit/core';
import { Box } from 'styled-system/jsx';

export const END_DROP_ZONE = 'setlist-drop-zone-end';

export function SetlistEndDropZone() {
  const { setNodeRef } = useDroppable({ id: END_DROP_ZONE });
  return <Box ref={setNodeRef} borderRadius="md" w="full" minH="60px" mt={2} />;
}
