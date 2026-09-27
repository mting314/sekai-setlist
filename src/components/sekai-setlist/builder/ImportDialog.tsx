/**
 * Replace the setlist with one imported from a past live, pasted text (one song per line;
 * unmatched lines become custom songs) or a JSON export. A preview shows what will be imported.
 */
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SetlistView } from '../SetlistView';
import { css } from 'styled-system/css';
import { Box, Grid, HStack, Stack } from 'styled-system/jsx';
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
import { Input } from '~/components/ui/styled/input';
import { Text } from '~/components/ui/styled/text';
import { Textarea } from '~/components/ui/styled/textarea';
import { sekaiSongs } from '~/utils/sekai-setlist/catalog';
import { getSekaiLive, livesWithSetlists, sekaiLiveName } from '~/utils/sekai-setlist/live-data';
import { performanceTitle, performanceToItems } from '~/utils/sekai-setlist/lives';
import { newPrediction, parsePrediction } from '~/utils/sekai-setlist/prediction';
import { buildTitleIndex, parseSetlistItems } from '~/utils/sekai-setlist/setlist-text';
import type { SekaiLive, SekaiLivePerformance } from '~/types/sekai';
import type { PredictionItem } from '~/types/sekai-prediction';

type Tab = 'live' | 'text' | 'json';
const MAX_SETLISTS = 40;

interface Setlist {
  key: string;
  live: SekaiLive;
  perf: SekaiLivePerformance;
}
const SETLISTS: Setlist[] = livesWithSetlists.flatMap((live) =>
  live.performances.map((perf, i) => ({ key: `${live.id}#${i}`, live, perf }))
);

let titleIndex: Map<string, string> | undefined;
const getTitleIndex = () => (titleIndex ??= buildTitleIndex(sekaiSongs));

export interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (items: PredictionItem[]) => void;
  /** The prediction's live; setlists from the same series are listed first. */
  liveId?: string;
}

function parseJson(text: string): PredictionItem[] | string {
  try {
    const p = parsePrediction(JSON.parse(text));
    return p ? p.items : 'invalid';
  } catch {
    return 'invalid';
  }
}

export function ImportDialog({ open, onOpenChange, onImport, liveId }: ImportDialogProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [tab, setTab] = useState<Tab>('live');
  const [search, setSearch] = useState('');
  const [selectedKey, setSelectedKey] = useState<string>();
  const [text, setText] = useState('');
  const [json, setJson] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const setlists = useMemo(() => {
    const series = getSekaiLive(liveId)?.series;
    const q = search.trim().toLowerCase();
    const matches = SETLISTS.filter(
      (s) =>
        s.live.id !== liveId &&
        (!q ||
          [s.live.name, s.live.nameJa, s.live.venue, s.perf.name].some((x) =>
            x?.toLowerCase().includes(q)
          ))
    );
    const sameSeries = matches.filter((s) => s.live.series === series);
    return [...sameSeries, ...matches.filter((s) => s.live.series !== series)].slice(
      0,
      MAX_SETLISTS
    );
  }, [search, liveId]);

  const selected = SETLISTS.find((s) => s.key === selectedKey);
  const result: PredictionItem[] | string | undefined = useMemo(() => {
    if (tab === 'live') return selected && performanceToItems(selected.perf);
    if (tab === 'text') return text.trim() ? parseSetlistItems(text, getTitleIndex()) : undefined;
    return json.trim() ? parseJson(json) : undefined;
  }, [tab, selected, text, json]);
  const items = Array.isArray(result) ? result : undefined;
  const preview = useMemo(() => items && newPrediction({ name: '', items }), [items]);
  const customCount = items?.filter((i) => i.type === 'custom').length ?? 0;

  const confirm = () => {
    if (!items?.length) return;
    onImport(items);
    onOpenChange(false);
  };

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    const content = await file.text();
    if (file.name.endsWith('.json')) setJson(content);
    else {
      setText(content);
      setTab('text');
    }
  };

  const tabButton = (value: Tab, label: string) => (
    <Button
      size="sm"
      variant={tab === value ? 'solid' : 'outline'}
      aria-pressed={tab === value}
      onClick={() => setTab(value)}
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
          maxW="1000px"
          maxH="90vh"
          overflow="hidden"
        >
          <Stack flex={1} gap={4} minH={0} p={6} overflow="hidden">
            <DialogTitle>
              {t('builder.importSetlist', { defaultValue: 'Import setlist' })}
            </DialogTitle>
            <DialogDescription>
              <Text fontSize="sm">
                {t('builder.importDescription', {
                  defaultValue:
                    'Start from a past live, pasted text or a JSON export. This replaces the current setlist.'
                })}
              </Text>
            </DialogDescription>

            <HStack gap={2} flexWrap="wrap">
              {tabButton('live', t('builder.fromLive', { defaultValue: 'From a live' }))}
              {tabButton('text', t('builder.textList', { defaultValue: 'Text' }))}
              {tabButton('json', 'JSON')}
            </HStack>

            <Grid flex={1} gap={4} minH={0} overflow="auto" columns={{ base: 1, md: 2 }}>
              <Stack gap={3} minH={0}>
                {tab === 'live' && (
                  <>
                    <Input
                      value={search}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setSearch(e.target.value)
                      }
                      placeholder={t('builder.searchLives', { defaultValue: 'Search lives…' })}
                      aria-label={t('builder.searchLivesLabel', { defaultValue: 'Search lives' })}
                    />
                    <Box
                      flex={1}
                      borderRadius="md"
                      borderWidth="1px"
                      minH="200px"
                      maxH="50vh"
                      bgColor="bg.default"
                      overflow="auto"
                    >
                      {setlists.length === 0 && (
                        <Text p={3} color="fg.muted" fontSize="sm" textAlign="center">
                          {t('builder.noLivesFound', { defaultValue: 'No lives found' })}
                        </Text>
                      )}
                      {setlists.map((s) => {
                        const n = s.perf.songs.length;
                        return (
                          <Box
                            className={css({
                              '&[data-selected=true]': { bgColor: 'bg.emphasized' }
                            })}
                            key={s.key}
                            data-setlist-option={s.key}
                            data-selected={selectedKey === s.key}
                            role="option"
                            aria-selected={selectedKey === s.key}
                            tabIndex={0}
                            onClick={() => setSelectedKey(s.key)}
                            onDoubleClick={() => {
                              onImport(performanceToItems(s.perf));
                              onOpenChange(false);
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && setSelectedKey(s.key)}
                            cursor="pointer"
                            borderBottomWidth="1px"
                            p={2}
                            _hover={{ bgColor: 'bg.subtle' }}
                          >
                            <Text fontSize="sm" fontWeight="medium">
                              {s.perf.name
                                ? `${sekaiLiveName(s.live, lang)} (${s.perf.name})`
                                : sekaiLiveName(s.live, lang)}
                            </Text>
                            <Text color="fg.muted" fontSize="xs">
                              {[
                                s.live.date,
                                t('builder.songCount', { count: n, defaultValue: `${n} songs` })
                              ].join(' · ')}
                            </Text>
                          </Box>
                        );
                      })}
                    </Box>
                  </>
                )}

                {tab === 'text' && (
                  <Textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    aria-label={t('builder.pasteSetlistLabel', { defaultValue: 'Setlist text' })}
                    placeholder={t('builder.pasteSetlist', {
                      defaultValue:
                        'One song per line, for example:\nM01 セカイ\nMC\nM02 Tell Your World (Short Ver.)\n━━ ENCORE ━━\nEN01 群青讃歌'
                    })}
                    rows={14}
                  />
                )}

                {tab === 'json' && (
                  <>
                    <Textarea
                      value={json}
                      onChange={(e) => setJson(e.target.value)}
                      aria-label={t('builder.pasteJsonLabel', { defaultValue: 'Prediction JSON' })}
                      placeholder={t('builder.pasteJson', {
                        defaultValue: 'Paste an exported prediction (JSON)…'
                      })}
                      rows={12}
                    />
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".json,.txt"
                      hidden
                      onChange={(e) => void readFile(e.target.files?.[0])}
                    />
                    <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                      {t('builder.chooseFile', { defaultValue: 'Choose a file…' })}
                    </Button>
                  </>
                )}
              </Stack>

              <Stack gap={2} minH={0}>
                <Text fontSize="sm" fontWeight="bold">
                  {t('builder.preview', { defaultValue: 'Preview' })}
                </Text>
                {result === 'invalid' ? (
                  <Box borderRadius="md" p={3} bgColor="bg.error">
                    <Text color="fg.error" fontSize="sm">
                      {t('builder.invalidJson', {
                        defaultValue: 'That isn’t a prediction exported from this site.'
                      })}
                    </Text>
                  </Box>
                ) : preview?.items.length ? (
                  <Box
                    data-import-preview
                    flex={1}
                    borderRadius="md"
                    borderWidth="1px"
                    minH={0}
                    maxH="50vh"
                    p={3}
                    bgColor="bg.subtle"
                    overflow="auto"
                  >
                    {tab === 'live' && selected && (
                      <Text mb={2} fontSize="sm" fontWeight="medium">
                        {performanceTitle(selected.live, selected.perf)}
                      </Text>
                    )}
                    {customCount > 0 && (
                      <Text mb={2} color="fg.muted" fontSize="xs">
                        {t('builder.unmatchedLines', {
                          count: customCount,
                          defaultValue: `${customCount} lines didn’t match a song and will be added as custom songs.`
                        })}
                      </Text>
                    )}
                    <SetlistView prediction={preview} showHeader={false} compact />
                  </Box>
                ) : (
                  <Box
                    display="flex"
                    flex={1}
                    justifyContent="center"
                    alignItems="center"
                    borderRadius="md"
                    borderWidth="1px"
                    minH="120px"
                    p={4}
                    bgColor="bg.subtle"
                  >
                    <Text color="fg.muted" fontSize="sm" textAlign="center">
                      {tab === 'live'
                        ? t('builder.selectLiveToPreview', {
                            defaultValue: 'Select a setlist to preview it'
                          })
                        : t('builder.nothingToImport', { defaultValue: 'Nothing to import yet' })}
                    </Text>
                  </Box>
                )}
              </Stack>
            </Grid>

            <Box display="flex" gap={2} justifyContent="flex-end" borderTopWidth="1px" pt={4}>
              <DialogCloseTrigger asChild>
                <Button variant="outline">{t('common.cancel', { defaultValue: 'Cancel' })}</Button>
              </DialogCloseTrigger>
              <Button onClick={confirm} disabled={!items?.length}>
                {t('builder.import', { defaultValue: 'Import' })}
              </Button>
            </Box>
          </Stack>
        </DialogContent>
      </DialogPositioner>
    </DialogRoot>
  );
}
