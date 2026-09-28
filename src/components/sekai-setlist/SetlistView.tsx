/**
 * Read-only setlist: event header, then numbered rows (M01 / EN01 / MC①) with jackets and unit
 * colour bars. Used by the builder's image export, the import preview and the /view page.
 */
import { useTranslation } from 'react-i18next';
import { SongJacket } from './SongJacket';
import { ItemColorBar, ItemSummary } from './builder/setlist-editor/ItemSummary';
import { css } from 'styled-system/css';
import { Box, HStack, Stack } from 'styled-system/jsx';
import { Text } from '~/components/ui/styled/text';
import { getSekaiLive } from '~/utils/sekai-setlist/live-data';
import { numberItems, predictionEventName, songCount } from '~/utils/sekai-setlist/prediction';
import type { SekaiPrediction } from '~/types/sekai-prediction';
import { isDividerRow } from '~/types/sekai-prediction';

export interface SetlistViewProps {
  prediction: SekaiPrediction;
  authorName?: string;
  showHeader?: boolean;
  compact?: boolean;
}

export function SetlistView({
  prediction,
  authorName,
  showHeader = true,
  compact = false
}: SetlistViewProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const labels = numberItems(prediction.items);
  const live = getSekaiLive(prediction.live);
  const event = predictionEventName(prediction, lang);
  const title = event || prediction.name || t('game.untitled', { defaultValue: 'Untitled' });
  const n = songCount(prediction);
  const details = [
    live?.date ?? prediction.custom?.date,
    live?.venue ?? prediction.custom?.venue,
    t('builder.songCount', { count: n, defaultValue: `${n} songs` })
  ].filter(Boolean);

  return (
    <Stack
      className={css({
        '&[data-compact=true]': {
          gap: 3,
          '& [data-view-title]': { fontSize: 'lg' },
          '& [data-view-item]': { py: 1.5, px: 3 },
          '& [data-view-row]': { gap: 2 },
          '& [data-view-label]': { fontSize: 'xs' }
        }
      })}
      data-setlist-view
      data-compact={compact}
      gap={4}
    >
      {showHeader && (
        <Box borderBottomWidth="1px" pb={3}>
          <Text data-view-title fontSize="xl" fontWeight="bold">
            {title}
          </Text>
          {event && prediction.name && prediction.name !== event && (
            <Text fontSize="md" fontWeight="medium">
              {prediction.name}
            </Text>
          )}
          {authorName && (
            <Text color="fg.muted" fontSize="sm">
              {t('builder.byAuthor', { name: authorName, defaultValue: `by ${authorName}` })}
            </Text>
          )}
          <Text color="fg.muted" fontSize="sm">
            {details.join(' · ')}
          </Text>
        </Box>
      )}

      <Stack gap={0}>
        {prediction.items.map((item, i) => (
          <Box
            className={css({
              '&[data-odd=true]': { bgColor: 'bg.subtle' },
              '&[data-divider=true]': { bgColor: 'bg.emphasized' }
            })}
            key={item.id}
            data-view-item={item.type}
            data-odd={i % 2 === 1}
            data-divider={isDividerRow(item)}
            position="relative"
            borderBottomWidth="1px"
            py={2}
            px={4}
          >
            <ItemColorBar item={item} />
            <HStack data-view-row gap={3}>
              {labels[i] && (
                <Text
                  data-view-label
                  flexShrink={0}
                  minW="44px"
                  color="fg.muted"
                  fontSize="sm"
                  fontWeight="medium"
                >
                  {labels[i]}
                </Text>
              )}
              {item.type === 'song' && <SongJacket id={item.songId} size={compact ? 28 : 40} />}
              <ItemSummary item={item} iconSize={compact ? 18 : 24} />
            </HStack>
          </Box>
        ))}
      </Stack>

      {!compact && (
        <Text color="fg.muted" fontSize="xs" textAlign="center">
          {t('builder.madeWith', { defaultValue: 'Made with Sekai Setlist' })}
        </Text>
      )}
    </Stack>
  );
}
