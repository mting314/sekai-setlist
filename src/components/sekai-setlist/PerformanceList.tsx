/**
 * One setlist of a live (a day, a day/night show or a city leg): numbered rows with jackets,
 * Encore / Intermission dividers and an "Open in builder" action. Shared by the past-setlists
 * browser and the live page.
 */
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { BiListPlus } from 'react-icons/bi';
import { Box, HStack, Stack, styled } from 'styled-system/jsx';
import { SongJacket } from './SongJacket';
import { CharacterIcons, KindBadge, VersionBadge } from './SongMeta';
import { NicknameChips } from './song-info/NicknameChips';
import { SongPlayButton } from './audio/SongPlayButton';
import { SongInfoButton } from './song-info/SongInfoButton';
import { Button } from '~/components/ui/styled/button';
import { Link } from '~/components/ui/link';
import { Text } from '~/components/ui/styled/text';
import { getSekaiSong, sekaiSongName } from '~/utils/sekai-setlist/catalog';
import {
  hasSongFilters,
  liveSongMatches,
  liveSongVersion,
  noteBesideVersion,
  performanceTitle,
  performanceToItems,
  performerCharacters,
  type LiveFilters
} from '~/utils/sekai-setlist/lives';
import { newPrediction } from '~/utils/sekai-setlist/prediction';
import { builderHref, songHref } from '~/utils/sekai-setlist/routes';
import type { SekaiLive, SekaiLivePerformance } from '~/types/sekai';

const SetlistRow = styled('div', {
  base: {
    display: 'flex',
    gap: '2.5',
    alignItems: 'center',
    py: '1',
    '&[data-dim=true]': { opacity: 0.35 }
  }
});

export function PerformanceList({
  live,
  perf,
  filters,
  title,
  badges
}: {
  live: SekaiLive;
  perf: SekaiLivePerformance;
  filters?: LiveFilters; // dims rows that don't match
  title?: React.ReactNode; // overrides the performance name
  badges?: React.ReactNode; // shown after the name (e.g. "You were here")
}) {
  const { t, i18n } = useTranslation();
  const markerLabel = (label: string) =>
    /^encore$/i.test(label)
      ? t('sekaiSetlist.lives.markerEncore', { defaultValue: 'Encore' })
      : /^intermission$/i.test(label)
        ? t('sekaiSetlist.lives.markerIntermission', { defaultValue: 'Intermission' })
        : label;

  return (
    <Stack gap={1}>
      <HStack gap={2} justifyContent="space-between">
        <HStack gap={2} minW={0} flexWrap="wrap">
          <Text fontSize="sm" fontWeight="semibold">
            {title ??
              (perf.name ||
                t('sekaiSetlist.lives.setlist', {
                  count: perf.songs.length,
                  defaultValue: `Setlist (${perf.songs.length} songs)`
                }))}
          </Text>
          {badges}
        </HStack>
        <Button asChild size="xs" variant="outline" flexShrink={0}>
          <a
            href={builderHref({
              share: newPrediction({
                name: performanceTitle(live, perf),
                items: performanceToItems(perf)
              })
            })}
          >
            <BiListPlus />
            {t('sekaiSetlist.lives.openInBuilder', { defaultValue: 'Open in builder' })}
          </a>
        </Button>
      </HStack>
      <Stack gap={0.5}>
        {perf.songs.map((s, i) => {
          const song = s.songId ? getSekaiSong(s.songId) : undefined;
          const version = liveSongVersion(s);
          const performers = performerCharacters(s);
          const dim =
            filters !== undefined &&
            hasSongFilters(filters) &&
            !liveSongMatches(s, filters, getSekaiSong);
          const markers = perf.markers.filter((m) => m.at === i);
          return (
            <Fragment key={i}>
              {markers.map((m) => (
                <Text
                  key={m.label}
                  borderTopWidth="1px"
                  mt={1}
                  py={1}
                  color="fg.muted"
                  fontSize="xs"
                  fontWeight="semibold"
                  textAlign="center"
                  borderStyle="dashed"
                >
                  {markerLabel(m.label)}
                </Text>
              ))}
              <SetlistRow data-dim={dim}>
                <Text
                  flexShrink={0}
                  w="6"
                  color="fg.subtle"
                  fontSize="xs"
                  fontVariantNumeric="tabular-nums"
                  textAlign="right"
                >
                  {i + 1}
                </Text>
                {song ? (
                  <SongJacket id={song.id} size={32} />
                ) : (
                  <Box flexShrink={0} borderRadius="md" w="32px" h="32px" bgColor="bg.muted" />
                )}
                <Stack flex={1} gap={0} minW={0}>
                  <HStack gap={1.5} minW={0}>
                    {song ? (
                      <>
                        <Link
                          href={songHref(song.id)}
                          fontSize="sm"
                          textOverflow="ellipsis"
                          overflow="hidden"
                          whiteSpace="nowrap"
                        >
                          {sekaiSongName(song.id, i18n.language)}
                        </Link>
                        <NicknameChips songId={song.id} />
                      </>
                    ) : (
                      <Text
                        fontSize="sm"
                        textOverflow="ellipsis"
                        overflow="hidden"
                        whiteSpace="nowrap"
                      >
                        {s.title}
                      </Text>
                    )}
                    <VersionBadge version={version} />
                    {noteBesideVersion(s.note, version) && (
                      <Text flexShrink={0} color="fg.muted" fontSize="xs">
                        {s.note}
                      </Text>
                    )}
                  </HStack>
                  {(performers.characters.length > 0 || performers.others.length > 0) && (
                    <HStack data-performers gap={1.5} minW={0} mt={0.5}>
                      <CharacterIcons characters={performers.characters} max={12} />
                      {performers.others.length > 0 && (
                        <Text
                          color="fg.subtle"
                          fontSize="xs"
                          textOverflow="ellipsis"
                          overflow="hidden"
                          whiteSpace="nowrap"
                        >
                          {performers.others.join(', ')}
                        </Text>
                      )}
                    </HStack>
                  )}
                </Stack>
                <HStack gap={1.5} flexShrink={0} alignItems="center">
                  {song && <KindBadge commissioned={song.commissioned} />}
                  {song && <SongPlayButton songId={song.id} version={version} />}
                  {song && <SongInfoButton songId={song.id} />}
                </HStack>
              </SetlistRow>
            </Fragment>
          );
        })}
      </Stack>
    </Stack>
  );
}
