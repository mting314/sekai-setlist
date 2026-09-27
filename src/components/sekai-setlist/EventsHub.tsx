/**
 * Home: a repository of Project Sekai lives. Lives still waiting on a setlist (predict them),
 * the latest setlists, and links into the live and song archives.
 */
import { useTranslation } from 'react-i18next';
import { BiEdit, BiRightArrowAlt } from 'react-icons/bi';
import { Stack, Wrap } from 'styled-system/jsx';
import { LiveSummaryCard } from './LiveSummaryCard';
import { Badge } from '~/components/ui/styled/badge';
import { Button } from '~/components/ui/styled/button';
import { Link } from '~/components/ui/link';
import { Text } from '~/components/ui/styled/text';
import { useToday } from '~/hooks/useToday';
import { awaitingLives, livesWithSetlists, sekaiLives } from '~/utils/sekai-setlist/live-data';
import {
  builderHref,
  liveHref,
  livesHref,
  predictHref,
  songsHref
} from '~/utils/sekai-setlist/routes';
import { sekaiSongs } from '~/utils/sekai-setlist/catalog';

const RECENT_LIVES = 5;

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text fontSize="lg" fontWeight="bold">
      {children}
    </Text>
  );
}

export function EventsHub() {
  const { t } = useTranslation();
  const today = useToday();

  return (
    <Stack gap={8}>
      <Stack gap={3}>
        <Text as="h1" fontSize={{ base: '2xl', md: '4xl' }} fontWeight="bold">
          {t('hub.title', { defaultValue: 'Project Sekai Live Setlists' })}
        </Text>
        <Text color="fg.muted" fontSize={{ base: 'md', md: 'lg' }}>
          {t('hub.description', {
            defaultValue:
              'Every COLORFUL LIVE, Thanks Festival, Sekai Symphony, Connect Live and fan meeting setlist. Look up where a song was played, and predict the next setlist.'
          })}
        </Text>
        <Wrap gap={2}>
          <Button asChild>
            <a href={livesHref()}>
              {t('hub.browseLives', {
                count: sekaiLives.length,
                defaultValue: `Browse ${sekaiLives.length} lives`
              })}
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={songsHref()}>
              {t('hub.browseSongs', {
                count: sekaiSongs.length,
                defaultValue: `Browse ${sekaiSongs.length} songs`
              })}
            </a>
          </Button>
        </Wrap>
      </Stack>

      <Stack gap={3}>
        <SectionTitle>
          {t('game.awaitingSetlist', { defaultValue: 'Setlist not out yet' })}
        </SectionTitle>
        {awaitingLives.length === 0 && (
          <Text color="fg.muted" fontSize="sm">
            {t('game.noneAwaiting', {
              defaultValue: 'No announced lives are waiting on a setlist right now.'
            })}
          </Text>
        )}
        {awaitingLives.map((live) => (
          <LiveSummaryCard
            key={live.id}
            live={live}
            badges={
              today &&
              live.startDate && (
                <Badge variant="subtle" size="sm">
                  {live.startDate >= today
                    ? t('hub.upcoming', { defaultValue: 'Upcoming' })
                    : t('hub.setlistPending', { defaultValue: 'Setlist pending' })}
                </Badge>
              )
            }
            action={
              <Button asChild size="sm" flexShrink={0}>
                <a href={builderHref(undefined, live.id)}>
                  <BiEdit /> {t('game.predict', { defaultValue: 'Predict' })}
                </a>
              </Button>
            }
          />
        ))}
        <Link href={predictHref()} fontSize="sm">
          {t('hub.toPredict', { defaultValue: 'Your predictions and how scoring works →' })}
        </Link>
      </Stack>

      <Stack gap={3}>
        <SectionTitle>{t('game.recentSetlists', { defaultValue: 'Latest setlists' })}</SectionTitle>
        {livesWithSetlists.slice(0, RECENT_LIVES).map((live) => (
          <LiveSummaryCard
            key={live.id}
            live={live}
            action={
              <Button asChild size="sm" variant="outline" flexShrink={0}>
                <a href={liveHref(live.id)}>
                  {t('hub.setlist', { defaultValue: 'Setlist' })} <BiRightArrowAlt />
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
