/**
 * Your saved predictions, newest first, filterable by live. Load one into the builder, go and
 * mark it (only once its live has a setlist), or delete it.
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { css } from 'styled-system/css';
import { Box, HStack, Stack } from 'styled-system/jsx';
import { Button } from '~/components/ui/styled/button';
import {
  Backdrop as DialogBackdrop,
  CloseTrigger as DialogCloseTrigger,
  Content as DialogContent,
  Description as DialogDescription,
  Positioner as DialogPositioner,
  Root as DialogRoot,
  Title as DialogTitle
} from '~/components/ui/styled/dialog';
import { Text } from '~/components/ui/styled/text';
import { usePredictions } from '~/hooks/usePredictions';
import { getSekaiLive, livesWithSetlists, sekaiLiveName } from '~/utils/sekai-setlist/live-data';
import { songCount } from '~/utils/sekai-setlist/prediction';
import { deletePrediction } from '~/utils/sekai-setlist/predictions-store';
import type { SekaiPrediction } from '~/types/sekai-prediction';

const hasSetlist = new Set(livesWithSetlists.map((l) => l.id));

export interface LoadPredictionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoad: (p: SekaiPrediction) => void;
  onMark?: (p: SekaiPrediction) => void;
  /** Called after a prediction is deleted from storage. */
  onDeleted?: (id: string) => void;
}

function PredictionRow({
  prediction,
  selected,
  onSelect,
  onOpen,
  onDelete
}: {
  prediction: SekaiPrediction;
  selected: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const { t, i18n } = useTranslation();
  const live = getSekaiLive(prediction.live);
  const name = prediction.name || t('game.untitled', { defaultValue: 'Untitled prediction' });
  const n = songCount(prediction);
  const event = live
    ? sekaiLiveName(live, i18n.language)
    : prediction.custom
      ? `${prediction.custom.name} (${t('builder.customEvent', { defaultValue: 'Custom' })})`
      : t('game.noLive', { defaultValue: 'No live — a dream setlist' });

  return (
    <Box
      className={css({
        '&[data-selected=true]': { borderColor: 'border.accent', bgColor: 'bg.emphasized' }
      })}
      data-prediction-id={prediction.id}
      data-selected={selected}
      role="option"
      aria-selected={selected}
      tabIndex={0}
      onClick={onSelect}
      onDoubleClick={onOpen}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      cursor="pointer"
      borderRadius="md"
      borderWidth="1px"
      p={3}
      _hover={{ bgColor: 'bg.subtle' }}
    >
      <HStack justifyContent="space-between" alignItems="start">
        <Stack flex={1} gap={0.5} minW={0}>
          <Text fontSize="sm" fontWeight="medium">
            {name}
          </Text>
          <Text color="fg.muted" fontSize="xs">
            {event}
          </Text>
          <Text color="fg.muted" fontSize="xs">
            {t('builder.songCount', { count: n, defaultValue: `${n} songs` })} ·{' '}
            {new Date(prediction.updatedAt).toLocaleDateString(i18n.language)}
          </Text>
        </Stack>
        <Button
          size="xs"
          variant="ghost"
          aria-label={t('builder.deletePrediction', { name, defaultValue: `Delete ${name}` })}
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onDelete();
          }}
          onDoubleClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          ✕
        </Button>
      </HStack>
    </Box>
  );
}

export function LoadPredictionDialog({
  open,
  onOpenChange,
  onLoad,
  onMark,
  onDeleted
}: LoadPredictionDialogProps) {
  const { t, i18n } = useTranslation();
  const { predictions, ready } = usePredictions();
  const [filter, setFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string>();

  // Only the lives you have predictions for.
  const filterLives = useMemo(
    () =>
      [...new Set(predictions.flatMap((p) => p.live ?? []))].flatMap(
        (id) => getSekaiLive(id) ?? []
      ),
    [predictions]
  );
  const shown = filter ? predictions.filter((p) => p.live === filter) : predictions;
  const selected = shown.find((p) => p.id === selectedId);
  const markable = !!selected?.live && hasSetlist.has(selected.live);

  const load = (p: SekaiPrediction | undefined) => {
    if (!p) return;
    onLoad(p);
    onOpenChange(false);
  };
  const remove = (p: SekaiPrediction) => {
    const name = p.name || t('game.untitled', { defaultValue: 'Untitled prediction' });
    if (!window.confirm(t('builder.confirmDelete', { name, defaultValue: `Delete "${name}"?` })))
      return;
    deletePrediction(p.id);
    if (selectedId === p.id) setSelectedId(undefined);
    onDeleted?.(p.id);
  };

  return (
    <DialogRoot
      open={open}
      onOpenChange={(details: { open: boolean }) => onOpenChange(details.open)}
      lazyMount
      unmountOnExit
    >
      <DialogBackdrop />
      <DialogPositioner>
        <DialogContent
          display="flex"
          flexDirection="column"
          w="full"
          maxW="600px"
          maxH="80vh"
          overflow="hidden"
        >
          <Stack flex={1} gap={4} minH={0} p={6} overflow="hidden">
            <DialogTitle>
              {t('builder.loadPrediction', { defaultValue: 'Load prediction' })}
            </DialogTitle>
            <DialogDescription>
              <Text fontSize="sm">
                {t('builder.loadPredictionDescription', {
                  defaultValue: 'Pick a saved prediction to open in the builder.'
                })}
              </Text>
            </DialogDescription>

            {filterLives.length > 0 && (
              <select
                className={css({
                  borderRadius: 'l2',
                  borderWidth: '1px',
                  h: '9',
                  px: '2',
                  fontSize: 'sm',
                  bgColor: 'bg.default'
                })}
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                aria-label={t('builder.filterByLive', { defaultValue: 'Filter by live' })}
              >
                <option value="">{t('builder.allLives', { defaultValue: 'All lives' })}</option>
                {filterLives.map((l) => (
                  <option key={l.id} value={l.id}>
                    {sekaiLiveName(l, i18n.language)}
                  </option>
                ))}
              </select>
            )}

            <Box flex={1} minH={0} overflow="auto">
              <Stack role="listbox" gap={2}>
                {ready && shown.length === 0 && (
                  <Box
                    borderRadius="md"
                    borderWidth="1px"
                    p={6}
                    textAlign="center"
                    bgColor="bg.muted"
                  >
                    <Text color="fg.muted" fontSize="sm">
                      {t('builder.noPredictions', { defaultValue: 'No saved predictions yet' })}
                    </Text>
                  </Box>
                )}
                {shown.map((p) => (
                  <PredictionRow
                    key={p.id}
                    prediction={p}
                    selected={p.id === selectedId}
                    onSelect={() => setSelectedId(p.id)}
                    onOpen={() => load(p)}
                    onDelete={() => remove(p)}
                  />
                ))}
              </Stack>
            </Box>

            <Box
              display="flex"
              gap={2}
              justifyContent="flex-end"
              borderTopWidth="1px"
              mt={2}
              pt={4}
              flexWrap="wrap"
            >
              <DialogCloseTrigger asChild>
                <Button variant="outline">{t('common.cancel', { defaultValue: 'Cancel' })}</Button>
              </DialogCloseTrigger>
              {onMark &&
                (selected && !markable ? (
                  <Button variant="ghost" disabled>
                    {t('builder.notPerformedYet', { defaultValue: 'Not performed yet' })}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    disabled={!selected}
                    onClick={() => {
                      if (!selected) return;
                      onMark(selected);
                      onOpenChange(false);
                    }}
                  >
                    {t('game.mark', { defaultValue: 'Mark' })}
                  </Button>
                ))}
              <Button onClick={() => load(selected)} disabled={!selected}>
                {t('builder.load', { defaultValue: 'Load' })}
              </Button>
            </Box>
          </Stack>
        </DialogContent>
      </DialogPositioner>
    </DialogRoot>
  );
}
