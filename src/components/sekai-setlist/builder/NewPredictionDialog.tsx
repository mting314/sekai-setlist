/**
 * Start a prediction for a live (upcoming lives first) or a custom event. In `change` mode it
 * re-points the current prediction instead.
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
  Positioner as DialogPositioner,
  Root as DialogRoot,
  Title as DialogTitle
} from '~/components/ui/styled/dialog';
import { Input } from '~/components/ui/styled/input';
import { Text } from '~/components/ui/styled/text';
import { awaitingLives, livesWithSetlists, sekaiLiveName } from '~/utils/sekai-setlist/live-data';
import type { CustomEvent } from '~/types/sekai-prediction';

const MAX_LIVES = 50;
/** Upcoming lives, then past lives newest first. */
const LIVES = [...awaitingLives, ...livesWithSetlists];

export interface NewPredictionTarget {
  live?: string;
  custom?: CustomEvent;
}

export interface NewPredictionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (target: NewPredictionTarget) => void;
  mode?: 'new' | 'change';
}

export function NewPredictionDialog({
  open,
  onOpenChange,
  onConfirm,
  mode = 'new'
}: NewPredictionDialogProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [tab, setTab] = useState<'live' | 'custom'>('live');
  const [search, setSearch] = useState('');
  const [liveId, setLiveId] = useState<string>();
  const [custom, setCustom] = useState<CustomEvent>({ name: '' });

  const lives = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matches = q
      ? LIVES.filter((l) => [l.name, l.nameJa, l.venue].some((s) => s?.toLowerCase().includes(q)))
      : LIVES;
    return matches.slice(0, MAX_LIVES);
  }, [search]);

  const canConfirm = tab === 'live' ? !!liveId : !!custom.name.trim();
  const confirm = () => {
    if (!canConfirm) return;
    if (tab === 'live') onConfirm({ live: liveId });
    else {
      const date = custom.date?.trim();
      const venue = custom.venue?.trim();
      onConfirm({
        custom: { name: custom.name.trim(), ...(date ? { date } : {}), ...(venue ? { venue } : {}) }
      });
    }
    onOpenChange(false);
  };

  const tabButton = (value: 'live' | 'custom', label: string) => (
    <Button
      size="sm"
      variant={tab === value ? 'solid' : 'outline'}
      aria-pressed={tab === value}
      onClick={() => setTab(value)}
      flex={1}
    >
      {label}
    </Button>
  );

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
              {mode === 'change'
                ? t('builder.changeLive', { defaultValue: 'Change live' })
                : t('builder.newPrediction', { defaultValue: 'New prediction' })}
            </DialogTitle>

            <HStack gap={2}>
              {tabButton('live', t('builder.forALive', { defaultValue: 'For a live' }))}
              {tabButton('custom', t('builder.customEvent', { defaultValue: 'Custom' }))}
            </HStack>

            {tab === 'live' ? (
              <Stack flex={1} gap={3} minH={0}>
                <Input
                  value={search}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                  placeholder={t('builder.searchLives', { defaultValue: 'Search lives…' })}
                  aria-label={t('builder.searchLivesLabel', { defaultValue: 'Search lives' })}
                />
                <Box flex={1} minH={0} overflow="auto">
                  <Stack gap={2}>
                    {lives.length === 0 && (
                      <Text color="fg.muted" fontSize="sm" textAlign="center">
                        {t('builder.noLivesFound', { defaultValue: 'No lives found' })}
                      </Text>
                    )}
                    {lives.map((l) => (
                      <Box
                        className={css({
                          '&[data-selected=true]': {
                            borderColor: 'border.accent',
                            bgColor: 'bg.emphasized'
                          }
                        })}
                        key={l.id}
                        data-live-option={l.id}
                        data-selected={liveId === l.id}
                        role="option"
                        aria-selected={liveId === l.id}
                        tabIndex={0}
                        onClick={() => setLiveId(l.id)}
                        onDoubleClick={() => {
                          setLiveId(l.id);
                          onConfirm({ live: l.id });
                          onOpenChange(false);
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && setLiveId(l.id)}
                        cursor="pointer"
                        borderRadius="md"
                        borderWidth="1px"
                        p={3}
                        _hover={{ bgColor: 'bg.subtle' }}
                      >
                        <Text fontSize="sm" fontWeight="medium">
                          {sekaiLiveName(l, lang)}
                        </Text>
                        <Text color="fg.muted" fontSize="xs">
                          {[l.date, l.venue].filter(Boolean).join(' · ')}
                        </Text>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              </Stack>
            ) : (
              <Stack gap={3}>
                <Stack gap={1}>
                  <Text fontSize="sm" fontWeight="medium">
                    {t('builder.eventName', { defaultValue: 'Event name' })} *
                  </Text>
                  <Input
                    value={custom.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCustom((c) => ({ ...c, name: e.target.value }))
                    }
                    aria-label={t('builder.eventName', { defaultValue: 'Event name' })}
                    placeholder={t('builder.eventNamePlaceholder', {
                      defaultValue: 'e.g. My dream 7th anniversary live'
                    })}
                  />
                </Stack>
                <Stack gap={1}>
                  <Text fontSize="sm" fontWeight="medium">
                    {t('builder.eventVenue', { defaultValue: 'Venue' })}
                  </Text>
                  <Input
                    value={custom.venue ?? ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCustom((c) => ({ ...c, venue: e.target.value }))
                    }
                    aria-label={t('builder.eventVenue', { defaultValue: 'Venue' })}
                  />
                </Stack>
                <Stack gap={1}>
                  <Text fontSize="sm" fontWeight="medium">
                    {t('builder.eventDate', { defaultValue: 'Date' })}
                  </Text>
                  <Input
                    type="date"
                    value={custom.date ?? ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCustom((c) => ({ ...c, date: e.target.value }))
                    }
                    aria-label={t('builder.eventDate', { defaultValue: 'Date' })}
                  />
                </Stack>
              </Stack>
            )}

            <Box
              display="flex"
              gap={2}
              justifyContent="flex-end"
              borderTopWidth="1px"
              mt={2}
              pt={4}
            >
              <DialogCloseTrigger asChild>
                <Button variant="outline">{t('common.cancel', { defaultValue: 'Cancel' })}</Button>
              </DialogCloseTrigger>
              <Button onClick={confirm} disabled={!canConfirm}>
                {mode === 'change'
                  ? t('builder.change', { defaultValue: 'Change' })
                  : t('builder.create', { defaultValue: 'Create' })}
              </Button>
            </Box>
          </Stack>
        </DialogContent>
      </DialogPositioner>
    </DialogRoot>
  );
}
