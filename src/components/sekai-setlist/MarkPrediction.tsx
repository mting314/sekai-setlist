/**
 * Mark a setlist prediction: pick the prediction (share link, saved prediction) and the real setlist
 * (a performance from lives.json, or a pasted list for lives not in the data yet), then score it
 * with the-sorter's setlist-prediction rules.
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BiEdit, BiFolderOpen } from 'react-icons/bi';
import { Box, HStack, Stack, Wrap, styled } from 'styled-system/jsx';
import { LiveSelect } from './LiveSelect';
import { SongJacket } from './SongJacket';
import { VersionBadge } from './SongMeta';
import { NicknameChips } from './song-info/NicknameChips';
import { SongInfoButton } from './song-info/SongInfoButton';
import { Badge } from '~/components/ui/styled/badge';
import { Button } from '~/components/ui/styled/button';
import { Input } from '~/components/ui/styled/input';
import { Text } from '~/components/ui/styled/text';
import { Textarea } from '~/components/ui/styled/textarea';
import { sekaiSongName, sekaiSongs } from '~/utils/sekai-setlist/catalog';
import { getSekaiLive, sekaiLiveName } from '~/utils/sekai-setlist/live-data';
import { performanceToState } from '~/utils/sekai-setlist/lives';
import { usePredictions } from '~/hooks/usePredictions';
import { toSetlistState } from '~/utils/sekai-setlist/prediction';
import { getPrediction } from '~/utils/sekai-setlist/predictions-store';
import { builderHref, liveParam, predictionParam } from '~/utils/sekai-setlist/routes';
import {
  DEFAULT_SCORING_RULES,
  scorePrediction,
  type MatchKind,
  type ScoreResult
} from '~/utils/sekai-setlist/scoring';
import { buildTitleIndex, parseSetlistText } from '~/utils/sekai-setlist/setlist-text';
import { decodeShare, type SetlistState } from '~/utils/sekai-setlist/share';
import type { SekaiPrediction } from '~/types/sekai-prediction';

type ActualSource = 'live' | 'paste';

interface Picked {
  prediction: SekaiPrediction;
  saved: boolean; // in your predictions (edit by id) vs from a link (edit a copy)
  ordered: boolean; // false only for legacy "any order" links, which are bag-scored
}

const linkHash = (link: string) => link.split('#')[1] ?? '';

const Card = styled('div', {
  base: {
    borderRadius: 'xl',
    borderWidth: '1px',
    p: { base: '3', md: '5' },
    bgColor: 'bg.default'
  }
});

// Only the accent/gray palettes are in the theme, so match colors are plain hex (readable on
// both color modes against a translucent fill).
const KIND_COLOR: Record<MatchKind, string | undefined> = {
  exact: '#16a34a',
  close: '#d97706',
  present: '#2563eb',
  miss: undefined
};

const Pill = styled('span', {
  base: {
    flexShrink: 0,
    borderRadius: 'full',
    borderWidth: '1px',
    py: '0.5',
    px: '2',
    color: 'fg.subtle',
    fontSize: 'xs',
    fontWeight: 'semibold',
    whiteSpace: 'nowrap'
  }
});

const ResultRow = styled('div', {
  base: {
    display: 'flex',
    gap: '2.5',
    alignItems: 'center',
    py: '1',
    '&[data-miss]': { opacity: 0.55 }
  }
});

let titleIndex: Map<string, string> | undefined;
const getTitleIndex = () => (titleIndex ??= buildTitleIndex(sekaiSongs));

export function MarkPrediction() {
  const { t, i18n } = useTranslation();
  const [picked, setPicked] = useState<Picked>();
  const { predictions } = usePredictions();
  const [pastedLink, setPastedLink] = useState('');
  const [source, setSource] = useState<ActualSource>('live');
  const [liveId, setLiveId] = useState<string>();
  const [perfIndex, setPerfIndex] = useState(0);
  const [pastedSetlist, setPastedSetlist] = useState('');

  const pickPrediction = (p: Picked) => {
    setPicked(p);
    const live = getSekaiLive(p.prediction.live);
    if (live?.performances.length) {
      setLiveId(live.id);
      setPerfIndex(0);
    }
  };

  useEffect(() => {
    const id = predictionParam();
    const saved = id ? getPrediction(id) : undefined;
    const shared = saved ? undefined : decodeShare(window.location.hash);
    const p: Picked | undefined = saved
      ? { prediction: saved, saved: true, ordered: true }
      : shared && { ...shared, saved: false };
    const live = getSekaiLive(liveParam() ?? p?.prediction.live);
    if (live?.performances.length) setLiveId(live.id);
    if (p) setPicked(p);
  }, []);

  const prediction: SetlistState | undefined = useMemo(
    () => picked && { ...toSetlistState(picked.prediction), ordered: picked.ordered },
    [picked]
  );
  const live = getSekaiLive(liveId);
  const predictedLive = getSekaiLive(prediction?.live);
  const pasted = useMemo(
    () => (source === 'paste' ? parseSetlistText(pastedSetlist, getTitleIndex()) : undefined),
    [source, pastedSetlist]
  );
  const actual: SetlistState | undefined =
    source === 'paste'
      ? pasted?.state
      : live?.performances[perfIndex] && performanceToState(live, live.performances[perfIndex]);
  const result =
    prediction && actual?.songs.length ? scorePrediction(prediction, actual) : undefined;

  const linkError = pastedLink.trim() !== '' && !decodeShare(linkHash(pastedLink));

  return (
    <Stack gap={4}>
      <Card>
        <Stack gap={3}>
          <Text fontWeight="semibold">
            {t('game.step1', { defaultValue: '1. Your prediction' })}
          </Text>
          {picked && prediction ? (
            <HStack gap={2} justifyContent="space-between" flexWrap="wrap">
              <Stack gap={0}>
                <Text fontWeight="bold">
                  {prediction.title || t('game.untitled', { defaultValue: 'Untitled prediction' })}
                </Text>
                <Text color="fg.muted" fontSize="xs">
                  {t('game.songCount', {
                    count: prediction.songs.length,
                    defaultValue: `${prediction.songs.length} songs`
                  })}
                  {!prediction.ordered &&
                    ` · ${t('game.unordered', { defaultValue: 'any order' })}`}
                </Text>
              </Stack>
              <HStack gap={2}>
                <Button asChild size="xs" variant="outline">
                  <a
                    href={
                      picked.saved
                        ? builderHref({ prediction: picked.prediction.id })
                        : builderHref({ share: picked.prediction })
                    }
                  >
                    <BiEdit /> {t('game.edit', { defaultValue: 'Edit' })}
                  </a>
                </Button>
                <Button size="xs" variant="ghost" onClick={() => setPicked(undefined)}>
                  {t('game.change', { defaultValue: 'Change' })}
                </Button>
              </HStack>
            </HStack>
          ) : (
            <Stack gap={2}>
              <Input
                size="sm"
                value={pastedLink}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setPastedLink(e.target.value);
                  const shared = decodeShare(linkHash(e.target.value));
                  if (shared) pickPrediction({ ...shared, saved: false });
                }}
                placeholder={t('game.pasteLink', {
                  defaultValue: 'Paste a prediction share link'
                })}
                aria-invalid={linkError || undefined}
              />
              {linkError && (
                <Text color="fg.error" fontSize="xs">
                  {t('game.badLink', { defaultValue: 'That link has no setlist in it.' })}
                </Text>
              )}
              {predictions.length > 0 && (
                <Wrap gap={1.5} alignItems="center">
                  <HStack gap={1} color="fg.subtle" fontSize="xs">
                    <BiFolderOpen /> {t('sekaiSetlist.savedSlots', { defaultValue: 'Saved:' })}
                  </HStack>
                  {predictions.map((p) => (
                    <Button
                      key={p.id}
                      size="xs"
                      variant="outline"
                      onClick={() => pickPrediction({ prediction: p, saved: true, ordered: true })}
                    >
                      {p.name || t('game.untitled', { defaultValue: 'Untitled prediction' })}
                    </Button>
                  ))}
                </Wrap>
              )}
              <Text color="fg.subtle" fontSize="xs">
                {t('game.noPrediction', {
                  defaultValue: 'No prediction yet? Make one in the builder and press Mark.'
                })}
              </Text>
            </Stack>
          )}
        </Stack>
      </Card>

      <Card>
        <Stack gap={3}>
          <HStack gap={2} justifyContent="space-between" flexWrap="wrap">
            <Text fontWeight="semibold">
              {t('game.step2', { defaultValue: '2. The real setlist' })}
            </Text>
            <HStack gap={1}>
              {(['live', 'paste'] as const).map((s) => (
                <Button
                  key={s}
                  size="xs"
                  variant={source === s ? 'solid' : 'outline'}
                  onClick={() => setSource(s)}
                >
                  {s === 'live'
                    ? t('game.fromLive', { defaultValue: 'From a past live' })
                    : t('game.pasteSetlist', { defaultValue: 'Paste a setlist' })}
                </Button>
              ))}
            </HStack>
          </HStack>
          {source === 'live' ? (
            <Stack gap={2}>
              <LiveSelect
                value={liveId}
                onChange={(id) => {
                  setLiveId(id);
                  setPerfIndex(0);
                }}
                withSetlist
                noneLabel={t('game.chooseLive', { defaultValue: 'Choose a live…' })}
                aria-label={t('game.actualLive', { defaultValue: 'Live to mark against' })}
              />
              {live && live.performances.length > 1 && (
                <Wrap gap={1}>
                  {live.performances.map((p, i) => (
                    <Button
                      key={i}
                      size="xs"
                      variant={perfIndex === i ? 'solid' : 'outline'}
                      onClick={() => setPerfIndex(i)}
                    >
                      {p.name || i + 1}
                    </Button>
                  ))}
                </Wrap>
              )}
              {predictedLive && predictedLive.performances.length === 0 && (
                <Text color="fg.muted" fontSize="xs">
                  {t('game.notOutYet', {
                    name: sekaiLiveName(predictedLive, i18n.language),
                    defaultValue: `The ${sekaiLiveName(predictedLive, i18n.language)} setlist isn't in the data yet — paste it instead.`
                  })}
                </Text>
              )}
            </Stack>
          ) : (
            <Stack gap={2}>
              <Textarea
                rows={8}
                value={pastedSetlist}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setPastedSetlist(e.target.value)
                }
                placeholder={t('game.pastePlaceholder', {
                  defaultValue:
                    'One song per line (JP or EN titles). Put "Encore" on its own line before the encore.'
                })}
              />
              {pasted && pasted.unresolved.length > 0 && (
                <Text color="fg.error" fontSize="xs">
                  {t('game.unresolved', {
                    lines: pasted.unresolved.join(' / '),
                    defaultValue: `Not recognised (skipped): ${pasted.unresolved.join(' / ')}`
                  })}
                </Text>
              )}
            </Stack>
          )}
        </Stack>
      </Card>

      {result && actual && <ScoreCard result={result} actual={actual} />}
    </Stack>
  );
}

function ScoreCard({ result, actual }: { result: ScoreResult; actual: SetlistState }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const rules = DEFAULT_SCORING_RULES;
  const kindLabel = (kind: MatchKind) =>
    ({
      exact: t('game.kind.exact', { defaultValue: 'Exact' }),
      close: t('game.kind.close', { defaultValue: 'Close' }),
      present: t('game.kind.present', { defaultValue: 'In setlist' }),
      miss: t('game.kind.miss', { defaultValue: 'Miss' })
    })[kind];
  const bonuses = [
    {
      key: 'opener',
      hit: result.bonuses.opener,
      label: t('game.bonus.opener', { defaultValue: 'Opener' }),
      points: rules.opener
    },
    {
      key: 'closer',
      hit: result.bonuses.closer,
      label: t('game.bonus.closer', { defaultValue: 'Closer' }),
      points: rules.closer
    },
    ...(result.bonuses.encoreBreak === undefined
      ? []
      : [
          {
            key: 'encore',
            hit: result.bonuses.encoreBreak,
            label: t('game.bonus.encore', { defaultValue: 'Encore break' }),
            points: rules.encoreBreak
          }
        ])
  ];

  return (
    <Card>
      <Stack gap={4}>
        <HStack gap={4} alignItems="baseline" flexWrap="wrap">
          <Text data-testid="accuracy" fontSize="4xl" fontWeight="bold">
            {Math.round(result.accuracy * 100)}%
          </Text>
          <Text color="fg.muted">
            {t('game.points', {
              total: result.total,
              max: result.max,
              defaultValue: `${result.total} / ${result.max} points`
            })}
          </Text>
        </HStack>

        {result.ordered ? (
          <Wrap gap={1.5}>
            {bonuses.map((b) => (
              <Badge key={b.key} variant={b.hit ? 'solid' : 'outline'} size="sm">
                {b.label} {b.hit ? `+${b.points}` : '✗'}
              </Badge>
            ))}
          </Wrap>
        ) : (
          <Text color="fg.muted" fontSize="xs">
            {t('game.unorderedRules', {
              points: rules.bagHit,
              defaultValue: `Any-order prediction: ${rules.bagHit} points per song that was performed.`
            })}
          </Text>
        )}

        <Stack gap={1}>
          {result.songs.map((s, i) => (
            <ResultRow key={i} data-miss={s.kind === 'miss' || undefined}>
              <Text flexShrink={0} w="6" color="fg.subtle" fontSize="xs" textAlign="right">
                {result.ordered ? i + 1 : '•'}
              </Text>
              <SongJacket id={s.songId} size={36} />
              <HStack flex={1} gap={1.5} minW={0}>
                <Text fontSize="sm" lineClamp={1}>
                  {sekaiSongName(s.songId, lang)}
                </Text>
                <NicknameChips songId={s.songId} />
                {s.actualAt !== undefined && actual.vs?.includes(s.actualAt) && (
                  <VersionBadge version="virtual_singer" />
                )}
                <SongInfoButton songId={s.songId} />
              </HStack>
              {s.actualAt !== undefined && result.ordered && s.kind !== 'exact' && (
                <Text flexShrink={0} color="fg.subtle" fontSize="xs">
                  {t('game.actualAt', {
                    n: s.actualAt + 1,
                    defaultValue: `was #${s.actualAt + 1}`
                  })}
                </Text>
              )}
              <Pill
                style={
                  KIND_COLOR[s.kind]
                    ? {
                        color: KIND_COLOR[s.kind],
                        borderColor: 'transparent',
                        background: `${KIND_COLOR[s.kind]}22`
                      }
                    : undefined
                }
              >
                {kindLabel(s.kind)}
                {s.points > 0 && ` +${s.points}`}
              </Pill>
            </ResultRow>
          ))}
        </Stack>

        {result.missed.length > 0 && (
          <Box>
            <Text mb={1} fontSize="sm" fontWeight="semibold">
              {t('game.missed', { defaultValue: 'Performed but not predicted' })}
            </Text>
            <Stack gap={1}>
              {result.missed.map((j) => (
                <HStack key={j} gap={2.5} py={0.5}>
                  <Text flexShrink={0} w="6" color="fg.subtle" fontSize="xs" textAlign="right">
                    {j + 1}
                  </Text>
                  <SongJacket id={actual.songs[j]} size={28} />
                  <Text color="fg.muted" fontSize="sm" lineClamp={1}>
                    {sekaiSongName(actual.songs[j], lang)}
                  </Text>
                  <NicknameChips songId={actual.songs[j]} />
                  {actual.vs?.includes(j) && <VersionBadge version="virtual_singer" />}
                  <SongInfoButton songId={actual.songs[j]} />
                </HStack>
              ))}
            </Stack>
          </Box>
        )}

        <Text color="fg.subtle" fontSize="xs">
          {t('game.rules', {
            exact: rules.exact,
            range: rules.closeRange,
            close: rules.close,
            present: rules.present,
            bonus: rules.opener,
            defaultValue: `Scoring: right position ${rules.exact}, within ${rules.closeRange} places ${rules.close}, anywhere else ${rules.present}; right opener, closer and encore break +${rules.opener} each. Songs outside the game catalog are left out.`
          })}
        </Text>
      </Stack>
    </Card>
  );
}
