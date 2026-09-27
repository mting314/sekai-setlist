/**
 * Row content shared by the setlist editor, its drop previews and the drag overlay, so a row
 * looks the same wherever it's shown.
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, HStack, Stack } from 'styled-system/jsx';
import { VocalistIcons } from '../../SongMeta';
import { Text } from '~/components/ui/styled/text';
import { colorBarBackground, sekaiSongColors } from '~/utils/sekai-setlist/catalog';
import { itemName } from '~/utils/sekai-setlist/prediction';
import type { PredictionItem } from '~/types/sekai-prediction';
import { isDividerRow } from '~/types/sekai-prediction';

/** Unit colour bar down the left edge of a song row (split top→bottom for multi-unit songs). */
export function SongColorBar({ songId, width = 4 }: { songId: string; width?: number }) {
  return (
    <Box
      aria-hidden
      style={{ width, background: colorBarBackground(sekaiSongColors(songId)) }}
      position="absolute"
      top={0}
      left={0}
      bottom={0}
    />
  );
}

export function ItemColorBar({ item }: { item: PredictionItem }) {
  return item.type === 'song' ? <SongColorBar songId={item.songId} /> : null;
}

/** Title line plus remarks (or vocalists / "custom song"); dividers are a centred bold band. */
export function ItemSummary({
  item,
  nameSuffix
}: {
  item: PredictionItem;
  nameSuffix?: ReactNode;
}) {
  const { t, i18n } = useTranslation();
  const name = itemName(item, i18n.language);

  if (isDividerRow(item)) {
    return (
      <Text flex={1} fontSize="sm" fontWeight="bold" lineHeight="1.4" textAlign="center">
        {name}
      </Text>
    );
  }

  const remarks = item.type === 'song' || item.type === 'custom' ? item.remarks : undefined;
  return (
    <Stack flex={1} gap={0.5} minW={0}>
      <HStack gap={2} alignItems="center" minW={0}>
        <Text fontSize="sm" fontWeight="medium" lineHeight="1.4">
          {name}
        </Text>
        {nameSuffix}
      </HStack>
      {remarks ? (
        <Text color="fg.muted" fontSize="xs" lineHeight="1.3" fontStyle="italic">
          {remarks}
        </Text>
      ) : item.type === 'song' ? (
        <VocalistIcons id={item.songId} size={16} />
      ) : item.type === 'custom' ? (
        <Text color="fg.muted" fontSize="xs" lineHeight="1.3">
          {t('builder.customSong', { defaultValue: 'Custom song' })}
        </Text>
      ) : null}
    </Stack>
  );
}
