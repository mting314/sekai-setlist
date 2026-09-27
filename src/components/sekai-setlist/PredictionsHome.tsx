/**
 * Predictions hub (/predict): how the game works, lives still waiting on a setlist (predict them), your
 * saved predictions (edit / mark) and the latest setlists to mark against.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BiCheckDouble, BiEdit, BiLink, BiListOl } from 'react-icons/bi';
import { Grid, HStack, Stack, Wrap } from 'styled-system/jsx';
import { Card, LiveSummaryCard as LiveCard } from './LiveSummaryCard';
import { Button } from '~/components/ui/styled/button';
import { Link } from '~/components/ui/link';
import { Text } from '~/components/ui/styled/text';
import {
  awaitingLives,
  getSekaiLive,
  livesWithSetlists,
  sekaiLiveName
} from '~/utils/sekai-setlist/live-data';
import { builderHref, livesHref, markHref } from '~/utils/sekai-setlist/routes';
import { listSlots, type SavedSlot } from '~/utils/sekai-setlist/storage';

const RECENT_LIVES = 3;

const awaiting = awaitingLives;
const recent = livesWithSetlists.slice(0, RECENT_LIVES);

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text fontSize="lg" fontWeight="bold">
      {children}
    </Text>
  );
}

export function PredictionsHome() {
  const { t, i18n } = useTranslation();
  const [slots, setSlots] = useState<SavedSlot[]>([]);
  useEffect(() => setSlots(listSlots()), []);

  const steps = [
    {
      icon: <BiListOl />,
      title: t('game.how.predict', { defaultValue: 'Predict' }),
      body: t('game.how.predictBody', {
        defaultValue: 'Pick an upcoming live and build the setlist you expect, encore and all.'
      })
    },
    {
      icon: <BiLink />,
      title: t('game.how.share', { defaultValue: 'Share' }),
      body: t('game.how.shareBody', {
        defaultValue:
          'Save it on this device or copy a link. The whole prediction lives in the URL.'
      })
    },
    {
      icon: <BiCheckDouble />,
      title: t('game.how.mark', { defaultValue: 'Mark' }),
      body: t('game.how.markBody', {
        defaultValue:
          'Once the setlist is out, score your prediction: points for exact positions, near misses and the right opener, closer and encore.'
      })
    }
  ];

  return (
    <Stack gap={8}>
      <Stack gap={3}>
        <Text fontSize={{ base: '2xl', md: '4xl' }} fontWeight="bold">
          {t('game.homeTitle', { defaultValue: 'Project Sekai Setlist Predictions' })}
        </Text>
        <Text color="fg.muted" fontSize={{ base: 'md', md: 'lg' }}>
          {t('game.homeDescription', {
            defaultValue:
              "Guess what'll be performed at the next COLORFUL LIVE, Thanks Festival or fan meeting, then see how close you got."
          })}
        </Text>
        <Wrap gap={2}>
          <Button asChild>
            <a href={builderHref()}>
              <BiEdit /> {t('game.start', { defaultValue: 'Start a prediction' })}
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={markHref()}>
              <BiCheckDouble /> {t('game.markTitle', { defaultValue: 'Mark a Prediction' })}
            </a>
          </Button>
        </Wrap>
      </Stack>

      <Grid gap={3} gridTemplateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }}>
        {steps.map((s, i) => (
          <Card key={i}>
            <Stack gap={1.5}>
              <HStack gap={2} color="accent.text" fontWeight="bold">
                {s.icon}
                <span>
                  {i + 1}. {s.title}
                </span>
              </HStack>
              <Text color="fg.muted" fontSize="sm">
                {s.body}
              </Text>
            </Stack>
          </Card>
        ))}
      </Grid>

      {slots.length > 0 && (
        <Stack gap={3}>
          <SectionTitle>
            {t('game.yourPredictions', { defaultValue: 'Your predictions' })}
          </SectionTitle>
          {slots.map((s) => {
            const live = getSekaiLive(s.state.live);
            return (
              <Card key={s.name}>
                <HStack gap={3} justifyContent="space-between" flexWrap="wrap">
                  <Stack gap={0.5} minW={0}>
                    <Text fontWeight="semibold">{s.name}</Text>
                    <Text color="fg.muted" fontSize="xs">
                      {[
                        live && sekaiLiveName(live, i18n.language),
                        t('game.songCount', {
                          count: s.state.songs.length,
                          defaultValue: `${s.state.songs.length} songs`
                        })
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </Stack>
                  <HStack gap={2}>
                    <Button asChild size="xs" variant="outline">
                      <a href={builderHref(s.state)}>
                        <BiEdit /> {t('game.edit', { defaultValue: 'Edit' })}
                      </a>
                    </Button>
                    <Button
                      asChild
                      size="xs"
                      variant={live?.performances.length ? 'solid' : 'outline'}
                    >
                      <a href={markHref(s.state)}>
                        <BiCheckDouble /> {t('game.mark', { defaultValue: 'Mark' })}
                      </a>
                    </Button>
                  </HStack>
                </HStack>
              </Card>
            );
          })}
        </Stack>
      )}

      <Stack gap={3}>
        <SectionTitle>
          {t('game.awaitingSetlist', { defaultValue: 'Setlist not out yet' })}
        </SectionTitle>
        {awaiting.length === 0 && (
          <Text color="fg.muted" fontSize="sm">
            {t('game.noneAwaiting', {
              defaultValue: 'No announced lives are waiting on a setlist right now.'
            })}
          </Text>
        )}
        {awaiting.map((live) => (
          <LiveCard
            key={live.id}
            live={live}
            action={
              <Button asChild size="sm" flexShrink={0}>
                <a href={builderHref(undefined, live.id)}>
                  <BiEdit /> {t('game.predict', { defaultValue: 'Predict' })}
                </a>
              </Button>
            }
          />
        ))}
      </Stack>

      <Stack gap={3}>
        <SectionTitle>{t('game.recentSetlists', { defaultValue: 'Latest setlists' })}</SectionTitle>
        {recent.map((live) => (
          <LiveCard
            key={live.id}
            live={live}
            action={
              <Button asChild size="sm" variant="outline" flexShrink={0}>
                <a href={markHref(undefined, live.id)}>
                  <BiCheckDouble /> {t('game.mark', { defaultValue: 'Mark' })}
                </a>
              </Button>
            }
          />
        ))}
        <Link href={livesHref()} fontSize="sm">
          {t('game.allSetlists', { defaultValue: 'All past setlists →' })}
        </Link>
      </Stack>
    </Stack>
  );
}
