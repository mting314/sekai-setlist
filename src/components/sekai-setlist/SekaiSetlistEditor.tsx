/**
 * Sekai setlist editor: user-written title, the live being predicted, saved predictions
 * (localStorage) and an lz-string share URL around the SetlistBuilder. No backend.
 */
import { useEffect, useState } from 'react';
import i18next from 'i18next';
import { useTranslation } from 'react-i18next';
import { BiCheckDouble, BiFolderOpen, BiLink, BiPlus, BiSave, BiTrash } from 'react-icons/bi';
import { Box, HStack, Stack, Wrap } from 'styled-system/jsx';
import { LiveSelect } from './LiveSelect';
import { SetlistBuilder } from './SetlistBuilder';
import { Button } from '~/components/ui/styled/button';
import { Input } from '~/components/ui/styled/input';
import { Text } from '~/components/ui/styled/text';
import { useToaster } from '~/context/ToasterContext';
import { getSekaiLive, sekaiLiveName } from '~/utils/sekai-setlist/live-data';
import { usePredictions } from '~/hooks/usePredictions';
import { fromSetlistState, toSetlistState } from '~/utils/sekai-setlist/prediction';
import {
  deletePrediction,
  getPrediction,
  savePrediction
} from '~/utils/sekai-setlist/predictions-store';
import { liveParam, markHref, predictionParam } from '~/utils/sekai-setlist/routes';
import { EMPTY_STATE, decodeShare, shareUrl, type SetlistState } from '~/utils/sekai-setlist/share';

/** Default title for a prediction of the given live (i18next's global instance, so effects can call it). */
function predictionTitle(id: string) {
  const live = getSekaiLive(id);
  const name = live ? sekaiLiveName(live, i18next.language ?? 'en') : id;
  return i18next.t('game.predictionTitle', { name, defaultValue: `My ${name} prediction` });
}

const clearHash = () =>
  history.replaceState(null, '', window.location.pathname + window.location.search);

export function SekaiSetlistEditor() {
  const { t } = useTranslation();
  const { toast } = useToaster();
  const [state, setState] = useState<SetlistState>(EMPTY_STATE);
  const [savedId, setSavedId] = useState<string>();
  const { predictions } = usePredictions();

  useEffect(() => {
    const id = predictionParam();
    const saved = id ? getPrediction(id) : undefined;
    if (saved) {
      setState(toSetlistState(saved));
      setSavedId(saved.id);
      return;
    }
    const shared = decodeShare(window.location.hash);
    const fromHash = shared && { ...toSetlistState(shared.prediction), ordered: shared.ordered };
    const live = getSekaiLive(fromHash?.live ?? liveParam());
    if (fromHash) {
      setState({ ...fromHash, live: live?.id });
    } else if (live) {
      setState({
        ...EMPTY_STATE,
        live: live.id,
        title: predictionTitle(live.id)
      });
    }
  }, []);

  const update = (partial: Partial<SetlistState>) => setState((s) => ({ ...s, ...partial }));
  const live = getSekaiLive(state.live);

  const pickLive = (id: string | undefined) =>
    update({
      live: id,
      // Retitle an untouched default title along with the live.
      ...(id && (!state.title || (state.live && state.title === predictionTitle(state.live)))
        ? { title: predictionTitle(id) }
        : {})
    });

  const doSave = () => {
    const name = (state.title || 'Untitled').trim();
    const next = fromSetlistState({ ...state, title: name });
    const prev = savedId ? getPrediction(savedId) : undefined;
    const saved = savePrediction(
      prev ? { ...prev, name, live: next.live, items: next.items } : next
    );
    setSavedId(saved.id);
    toast({
      title: t('sekaiSetlist.saved', { name, defaultValue: `Saved “${name}”` }),
      type: 'success'
    });
  };
  const doLoad = (id: string) => {
    const loaded = getPrediction(id);
    if (!loaded) return;
    setState(toSetlistState(loaded));
    setSavedId(id);
    clearHash();
  };
  const doDelete = (id: string) => {
    if (!window.confirm(t('common.confirmDelete', { defaultValue: 'Are you sure?' }))) return;
    deletePrediction(id);
    if (id === savedId) setSavedId(undefined);
  };
  const doNew = () => {
    setState(
      live ? { ...EMPTY_STATE, live: live.id, title: predictionTitle(live.id) } : EMPTY_STATE
    );
    setSavedId(undefined);
    clearHash();
  };
  const doShare = async () => {
    const url = shareUrl(state);
    history.replaceState(null, '', '#' + url.split('#')[1]);
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: t('sekaiSetlist.linkCopied', { defaultValue: 'Share link copied!' }),
        type: 'success'
      });
    } catch {
      // Clipboard blocked — the link is in the address bar regardless.
      toast({
        title: t('sekaiSetlist.linkInAddressBar', {
          defaultValue: 'Copy the link from the address bar'
        }),
        type: 'info'
      });
    }
  };

  return (
    <Stack gap={4}>
      <Box borderRadius="xl" borderWidth="1px" p={{ base: 3, md: 5 }} bgColor="bg.default">
        <Stack gap={3}>
          <Input
            size="lg"
            value={state.title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => update({ title: e.target.value })}
            placeholder={t('sekaiSetlist.titlePlaceholder', {
              defaultValue: 'Setlist title (e.g. My Dream Sekai Live)'
            })}
            fontWeight="bold"
          />
          <Wrap gap={2} alignItems="center">
            <Text color="fg.muted" fontSize="sm">
              {t('game.predictingFor', { defaultValue: 'Predicting:' })}
            </Text>
            <LiveSelect
              value={state.live}
              onChange={pickLive}
              noneLabel={t('game.noLive', { defaultValue: 'No live — a dream setlist' })}
              aria-label={t('game.pickLive', { defaultValue: 'Live to predict' })}
            />
            {live && (
              <Text color="fg.subtle" fontSize="xs">
                {[live.date, live.venue].filter(Boolean).join(' · ')}
              </Text>
            )}
          </Wrap>
          <Wrap gap={2} alignItems="center">
            <Button size="sm" variant="outline" onClick={doNew}>
              <BiPlus /> {t('common.new', { defaultValue: 'New' })}
            </Button>
            <Button size="sm" variant="outline" onClick={doSave}>
              <BiSave /> {t('save', { defaultValue: 'Save' })}
            </Button>
            <Button size="sm" variant="outline" onClick={() => void doShare()}>
              <BiLink /> {t('sekaiSetlist.shareLink', { defaultValue: 'Share link' })}
            </Button>
            <Button asChild size="sm" variant={live?.performances.length ? 'solid' : 'outline'}>
              <a href={markHref({ share: fromSetlistState(state) })}>
                <BiCheckDouble /> {t('game.mark', { defaultValue: 'Mark' })}
              </a>
            </Button>
          </Wrap>

          {predictions.length > 0 && (
            <Wrap gap={1.5} alignItems="center">
              <HStack gap={1} color="fg.subtle" fontSize="xs">
                <BiFolderOpen /> {t('sekaiSetlist.savedSlots', { defaultValue: 'Saved:' })}
              </HStack>
              {predictions.map((p) => (
                <HStack key={p.id} gap={0} borderRadius="full" borderWidth="1px" overflow="hidden">
                  <Button size="xs" variant="ghost" onClick={() => doLoad(p.id)} borderRadius="0">
                    {p.name || t('game.untitled', { defaultValue: 'Untitled prediction' })}
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    aria-label={t('sekaiSetlist.deleteSlot', {
                      name: p.name,
                      defaultValue: `Delete ${p.name}`
                    })}
                    onClick={() => doDelete(p.id)}
                    borderRadius="0"
                    color="fg.subtle"
                  >
                    <BiTrash />
                  </Button>
                </HStack>
              ))}
            </Wrap>
          )}
        </Stack>
      </Box>

      <Box borderRadius="xl" borderWidth="1px" p={{ base: 3, md: 5 }} bgColor="bg.default">
        <SetlistBuilder
          songs={state.songs}
          encore={state.encore}
          ordered={state.ordered}
          onChange={(songs, encore, ordered) => update({ songs, encore, ordered })}
        />
      </Box>

      <Text color="fg.subtle" fontSize="xs" textAlign="center">
        {t('sekaiSetlist.credit', {
          defaultValue: 'Song data and jackets from sekai.best / Sekai master DB.'
        })}
      </Text>
    </Stack>
  );
}
