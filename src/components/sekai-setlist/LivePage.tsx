/**
 * One live: series, dates, venue and notes, every setlist, and the prediction actions (predict
 * while the setlist is out, mark once it is) plus your saved predictions for it.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BiCheckDouble, BiEdit, BiLinkExternal } from 'react-icons/bi';
import { HStack, Stack, Wrap } from 'styled-system/jsx';
import { Card } from './LiveSummaryCard';
import { PerformanceList } from './PerformanceList';
import { Badge } from '~/components/ui/styled/badge';
import { Button } from '~/components/ui/styled/button';
import { Link } from '~/components/ui/link';
import { Text } from '~/components/ui/styled/text';
import { sekaiLiveName } from '~/utils/sekai-setlist/live-data';
import { builderHref, livesHref, markHref } from '~/utils/sekai-setlist/routes';
import { listSlots, type SavedSlot } from '~/utils/sekai-setlist/storage';
import type { SekaiLive } from '~/types/sekai';

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text fontSize="lg" fontWeight="bold">
      {children}
    </Text>
  );
}

export function LivePage({ live }: { live: SekaiLive }) {
  const { t, i18n } = useTranslation();
  const [slots, setSlots] = useState<SavedSlot[]>([]);
  useEffect(() => setSlots(listSlots().filter((s) => s.state.live === live.id)), [live.id]);

  const noSetlist = live.performances.length === 0;
  const name = sekaiLiveName(live, i18n.language);
  const altName = name === live.name ? live.nameJa : live.name;

  return (
    <Stack gap={6}>
      <Stack gap={2}>
        <Link href={livesHref()} fontSize="sm">
          {t('live.allLives', { defaultValue: '← All lives' })}
        </Link>
        <Wrap gap={1.5}>
          <Badge variant="outline" size="sm">
            {t(`sekaiSetlist.lives.series.${live.series}`, { defaultValue: live.series })}
          </Badge>
          {noSetlist && (
            <Badge variant="subtle" size="sm">
              {t('sekaiSetlist.lives.noSetlist', { defaultValue: 'No setlist yet' })}
            </Badge>
          )}
        </Wrap>
        <Stack gap={0.5}>
          <Text as="h1" fontSize={{ base: '2xl', md: '3xl' }} fontWeight="bold" lineHeight="tight">
            {name}
          </Text>
          {altName && altName !== name && <Text color="fg.muted">{altName}</Text>}
        </Stack>
        <Stack gap={0.5} color="fg.muted" fontSize="sm">
          <Text>{live.date}</Text>
          {live.venue && <Text>{live.venue}</Text>}
        </Stack>
        {live.notes.map((n) => (
          <Text key={n} color="fg.muted" fontSize="xs">
            {n}
          </Text>
        ))}
        <Wrap gap={2} pt={1}>
          {noSetlist ? (
            <Button asChild size="sm">
              <a href={builderHref(undefined, live.id)}>
                <BiEdit /> {t('game.predictLive', { defaultValue: 'Predict this setlist' })}
              </a>
            </Button>
          ) : (
            <Button asChild size="sm" variant="outline">
              <a href={markHref(undefined, live.id)}>
                <BiCheckDouble /> {t('game.markLive', { defaultValue: 'Mark a prediction' })}
              </a>
            </Button>
          )}
        </Wrap>
      </Stack>

      {slots.length > 0 && (
        <Stack gap={2}>
          <SectionTitle>
            {t('live.yourPredictions', { defaultValue: 'Your predictions for this live' })}
          </SectionTitle>
          {slots.map((s) => (
            <Card key={s.name}>
              <HStack gap={3} justifyContent="space-between" flexWrap="wrap">
                <Stack gap={0.5} minW={0}>
                  <Text fontWeight="semibold">{s.name}</Text>
                  <Text color="fg.muted" fontSize="xs">
                    {t('game.songCount', {
                      count: s.state.songs.length,
                      defaultValue: `${s.state.songs.length} songs`
                    })}
                  </Text>
                </Stack>
                <HStack gap={2}>
                  <Button asChild size="xs" variant="outline">
                    <a href={builderHref(s.state)}>
                      <BiEdit /> {t('game.edit', { defaultValue: 'Edit' })}
                    </a>
                  </Button>
                  {!noSetlist && (
                    <Button asChild size="xs">
                      <a href={markHref(s.state)}>
                        <BiCheckDouble /> {t('game.mark', { defaultValue: 'Mark' })}
                      </a>
                    </Button>
                  )}
                </HStack>
              </HStack>
            </Card>
          ))}
        </Stack>
      )}

      <Stack gap={3}>
        <SectionTitle>{t('live.setlists', { defaultValue: 'Setlists' })}</SectionTitle>
        {noSetlist ? (
          <Text color="fg.muted" fontSize="sm">
            {t('live.setlistPending', {
              defaultValue: "The setlist hasn't been published yet."
            })}
          </Text>
        ) : (
          live.performances.map((perf, i) => (
            <Card key={i}>
              <PerformanceList live={live} perf={perf} />
            </Card>
          ))
        )}
      </Stack>

      <Link
        href={live.source}
        target="_blank"
        rel="noopener noreferrer"
        color="fg.muted"
        fontSize="xs"
      >
        {t('sekaiSetlist.lives.source', {
          site: new URL(live.source).hostname,
          defaultValue: `Source: ${new URL(live.source).hostname}`
        })}
        <BiLinkExternal />
      </Link>
    </Stack>
  );
}
