/**
 * Project Sekai Setlist Builder Page
 * Full-height builder for one prediction at a time, autosaved in this browser. Opens, in order:
 * `?prediction=`, a shared `#p=` / legacy `#s=` link (imported as a new prediction), `?live=`
 * (its latest prediction, else a new one), the last prediction you had open, else Load / New.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import i18next from 'i18next';
import { useTranslation } from 'react-i18next';
import { BiDotsVerticalRounded } from 'react-icons/bi';
import { Box, HStack, Stack } from 'styled-system/jsx';
import { Metadata } from '~/components/layout/Metadata';
import { Menu } from '~/components/ui/menu';
import { Button } from '~/components/ui/styled/button';
import { IconButton } from '~/components/ui/styled/icon-button';
import { Text } from '~/components/ui/styled/text';
import { LoadPredictionDialog } from '~/components/sekai-setlist/builder/LoadPredictionDialog';
import {
  NewPredictionDialog,
  type NewPredictionTarget
} from '~/components/sekai-setlist/builder/NewPredictionDialog';
import {
  PredictionBuilder,
  type PredictionUpdate
} from '~/components/sekai-setlist/builder/PredictionBuilder';
import { useToaster } from '~/context/ToasterContext';
import { getSekaiLive, sekaiLiveName } from '~/utils/sekai-setlist/live-data';
import { newPrediction } from '~/utils/sekai-setlist/prediction';
import {
  getLastPredictionId,
  getPrediction,
  listPredictions,
  savePrediction,
  setLastPredictionId
} from '~/utils/sekai-setlist/predictions-store';
import {
  builderHref,
  liveParam,
  markHref,
  predictHref,
  predictionParam
} from '~/utils/sekai-setlist/routes';
import { decodeShare } from '~/utils/sekai-setlist/share';
import type { SekaiPrediction } from '~/types/sekai-prediction';

const AUTOSAVE_MS = 400;

/** Default name for a prediction of a live or custom event (global i18next, so effects can call it). */
function defaultName(target: NewPredictionTarget): string {
  const live = getSekaiLive(target.live);
  const name = live ? sekaiLiveName(live, i18next.language ?? 'en') : target.custom?.name;
  return name
    ? i18next.t('game.predictionTitle', { name, defaultValue: `My ${name} prediction` })
    : '';
}

/** Point the URL at what's open (drops any share hash), so a reload reopens it. */
function syncUrl(p: SekaiPrediction | undefined) {
  const target = !p ? {} : getPrediction(p.id) ? { prediction: p.id } : { live: p.live };
  history.replaceState(null, '', builderHref(target));
}

export function Page() {
  const { t, i18n } = useTranslation();
  const { toast } = useToaster();
  const [prediction, setPrediction] = useState<SekaiPrediction>();
  const [newOpen, setNewOpen] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false);
  const [loadOpen, setLoadOpen] = useState(false);
  /** Latest prediction, and the edit not yet written to storage. */
  const current = useRef<SekaiPrediction>(undefined);
  const pending = useRef<SekaiPrediction>(undefined);

  const flush = useCallback(() => {
    const p = pending.current;
    if (!p) return;
    pending.current = undefined;
    const isNew = !getPrediction(p.id);
    savePrediction(p);
    if (isNew) syncUrl(p);
  }, []);

  const saveNow = useCallback(() => {
    pending.current ??= current.current;
    flush();
  }, [flush]);

  const open = useCallback(
    (p: SekaiPrediction | undefined) => {
      flush();
      current.current = p;
      setPrediction(p);
      if (p) setLastPredictionId(p.id);
      syncUrl(p);
    },
    [flush]
  );

  const edit: PredictionUpdate = useCallback((update) => {
    const prev = current.current;
    if (!prev) return;
    const next = update(prev);
    current.current = next;
    pending.current = next;
    setPrediction(next);
  }, []);

  // Autosave shortly after the last edit, and on leaving the page.
  useEffect(() => {
    if (!pending.current) return;
    const timer = setTimeout(flush, AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [prediction, flush]);
  useEffect(() => {
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [flush]);

  // Pick what to open, once, on the client.
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const id = predictionParam();
    const saved = id ? getPrediction(id) : undefined;
    if (saved) return open(saved);

    const shared = decodeShare(window.location.hash);
    if (shared) {
      open(savePrediction(shared.prediction));
      toast({
        title: t('builder.importedShare', { defaultValue: 'Shared prediction added to yours' }),
        type: 'success'
      });
      return;
    }

    const live = getSekaiLive(liveParam());
    if (live) {
      return open(
        listPredictions(live.id)[0] ??
          newPrediction({ live: live.id, name: defaultName({ live: live.id }) })
      );
    }

    const last = getLastPredictionId();
    const lastSaved = last ? getPrediction(last) : undefined;
    if (lastSaved) return open(lastSaved);

    if (listPredictions().length) setLoadOpen(true);
    else setNewOpen(true);
  }, [open, toast, t]);

  const createNew = (target: NewPredictionTarget) =>
    open(newPrediction({ ...target, name: defaultName(target) }));

  const changeEvent = (target: NewPredictionTarget) =>
    edit((p) => {
      const { live: _live, custom: _custom, ...rest } = p;
      const oldDefault = defaultName(p);
      return {
        ...rest,
        ...(target.live ? { live: target.live } : {}),
        ...(target.custom ? { custom: target.custom } : {}),
        // Retitle a name that is still the old default.
        name: !p.name || p.name === oldDefault ? defaultName(target) : p.name
      };
    });

  const live = getSekaiLive(prediction?.live);
  const custom = prediction?.custom;
  const eventName = live ? sekaiLiveName(live, i18n.language) : custom?.name;
  const eventDetails = live
    ? [live.date, live.venue]
    : custom
      ? [custom.date && new Date(custom.date).toLocaleDateString(i18n.language), custom.venue]
      : [];
  const builderTitle = t('builder.title', { defaultValue: 'Setlist Builder' });
  const changeLabel = t('builder.change', { defaultValue: 'Change' });
  const newLabel = t('builder.new', { defaultValue: 'New' });
  const loadLabel = t('builder.load', { defaultValue: 'Load' });
  const backLabel = t('builder.back', { defaultValue: 'Back' });

  return (
    <>
      <Metadata title={eventName ? `${builderTitle} - ${eventName}` : builderTitle} helmet />

      <Stack gap={0} w="full" h="100vh" overflow="hidden">
        {/* Header */}
        <Box
          zIndex={10}
          position="sticky"
          top={0}
          borderBottomWidth="1px"
          p={{ base: 2, md: 4 }}
          bgColor="bg.default"
        >
          <HStack justifyContent="space-between" alignItems="center">
            <Stack flex={1} gap={{ base: 0, md: 1 }} minW={0}>
              {prediction ? (
                <>
                  <HStack gap={2} alignItems="center">
                    <Text
                      data-builder-event
                      fontSize={{ base: 'sm', md: 'lg' }}
                      fontWeight="bold"
                      textOverflow="ellipsis"
                      overflow="hidden"
                      whiteSpace="nowrap"
                    >
                      {eventName ?? t('game.noLive', { defaultValue: 'No live — a dream setlist' })}
                    </Text>
                    {!live && custom && (
                      <Text color="fg.muted" fontSize="xs">
                        ({t('builder.customEvent', { defaultValue: 'Custom' })})
                      </Text>
                    )}
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => setChangeOpen(true)}
                      hideBelow="md"
                    >
                      {changeLabel}
                    </Button>
                  </HStack>
                  {eventDetails.some(Boolean) && (
                    <Text hideBelow="md" color="fg.muted" fontSize={{ base: 'xs', md: 'sm' }}>
                      {eventDetails.filter(Boolean).join(' · ')}
                    </Text>
                  )}
                </>
              ) : (
                <Text color="fg.muted" fontSize={{ base: 'sm', md: 'lg' }}>
                  {t('builder.noPredictionOpen', { defaultValue: 'No prediction open' })}
                </Text>
              )}
            </Stack>

            <HStack hideBelow="md" gap={2} flexShrink={0}>
              <Button size="sm" variant="outline" onClick={() => setNewOpen(true)}>
                {newLabel}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setLoadOpen(true)}>
                {loadLabel}
              </Button>
              <Button asChild size="sm" variant="subtle">
                <a href={predictHref()}>{backLabel}</a>
              </Button>
            </HStack>

            <Box hideFrom="md">
              <Menu.Root
                positioning={{ placement: 'bottom-end' }}
                onSelect={({ value }) => {
                  if (value === 'change') setChangeOpen(true);
                  else if (value === 'new') setNewOpen(true);
                  else if (value === 'load') setLoadOpen(true);
                  else window.location.href = predictHref();
                }}
              >
                <Menu.Trigger asChild>
                  <IconButton
                    variant="ghost"
                    size="sm"
                    aria-label={t('builder.menu', { defaultValue: 'Builder menu' })}
                  >
                    <BiDotsVerticalRounded size={20} />
                  </IconButton>
                </Menu.Trigger>
                <Menu.Positioner>
                  <Menu.Content>
                    {prediction && <Menu.Item value="change">{changeLabel}</Menu.Item>}
                    <Menu.Item value="new">{newLabel}</Menu.Item>
                    <Menu.Item value="load">{loadLabel}</Menu.Item>
                    <Menu.Item value="back">{backLabel}</Menu.Item>
                  </Menu.Content>
                </Menu.Positioner>
              </Menu.Root>
            </Box>
          </HStack>
        </Box>

        <Box flex={1} minH={0} overflow="hidden">
          {prediction ? (
            <PredictionBuilder prediction={prediction} onChange={edit} onSaveNow={saveNow} />
          ) : (
            <Stack justifyContent="center" alignItems="center" h="full" p={8}>
              <Box borderRadius="lg" borderWidth="1px" p={8} textAlign="center" bgColor="bg.muted">
                <Text mb={2} fontSize="lg" fontWeight="bold">
                  {t('builder.welcome', { defaultValue: 'Welcome to the Setlist Builder' })}
                </Text>
                <Text mb={4} color="fg.muted" fontSize="sm">
                  {t('builder.welcomeHint', {
                    defaultValue: 'Load a saved prediction or create a new one to get started.'
                  })}
                </Text>
                <HStack gap={2} justifyContent="center">
                  <Button variant="outline" onClick={() => setLoadOpen(true)}>
                    {loadLabel}
                  </Button>
                  <Button onClick={() => setNewOpen(true)}>{newLabel}</Button>
                </HStack>
              </Box>
            </Stack>
          )}
        </Box>
      </Stack>

      <NewPredictionDialog open={newOpen} onOpenChange={setNewOpen} onConfirm={createNew} />
      <NewPredictionDialog
        mode="change"
        open={changeOpen}
        onOpenChange={setChangeOpen}
        onConfirm={changeEvent}
      />
      <LoadPredictionDialog
        open={loadOpen}
        onOpenChange={setLoadOpen}
        onLoad={open}
        onMark={(p) => {
          flush();
          window.location.href = markHref({ prediction: p.id, live: p.live });
        }}
        onDeleted={(id) => {
          if (current.current?.id !== id) return;
          pending.current = undefined;
          open(undefined);
        }}
      />
    </>
  );
}
