/**
 * The facts about a song shared by the song-info dialog and the song page: its event(s) with
 * nicknames, credits, release dates, vocal versions, and how often you heard it live.
 */
import { Fragment, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { NicknameChip } from './NicknameChips';
import { useSongDetails } from './useSongDetails';
import { useHowLabel } from '../ShowAttendance';
import { CharacterIcons } from '../SongMeta';
import { Box, Grid, HStack, Stack, Wrap } from 'styled-system/jsx';
import { Text } from '~/components/ui/styled/text';
import { useAttendance } from '~/hooks/useAttendance';
import { ATTENDANCE_HOWS } from '~/utils/sekai-setlist/attendance';
import { attendedShows, timesHeard } from '~/utils/sekai-setlist/attendance-stats';
import { getSekaiSong } from '~/utils/sekai-setlist/catalog';
import { sekaiLives } from '~/utils/sekai-setlist/live-data';
import type { SekaiSongEvent, SekaiSongVersion, SekaiVersionKind } from '~/types/sekai';

// Game dates are Japan time: a JST-midnight release would otherwise show as the day before.
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const isoDate = (ms: number) => new Date(ms + JST_OFFSET_MS).toISOString().slice(0, 10);

const eventName = (e: SekaiSongEvent, lang: string) =>
  lang.startsWith('en') ? (e.nameEn ?? e.name) : e.name;

const KIND_ORDER: SekaiVersionKind[] = ['sekai', 'virtual_singer', 'original', 'another_vocal'];

/** A version's singers: character icons, then any singer without one (flower, GUMI…) by name. */
function VersionSingers({ version }: { version: SekaiSongVersion }) {
  return (
    <HStack gap={1.5} minW={0}>
      <CharacterIcons characters={version.characters} max={12} />
      {version.others && (
        <Text color="fg.muted" fontSize="xs">
          {version.others.join(', ')}
        </Text>
      )}
    </HStack>
  );
}

/**
 * A song's vocal versions with their singers: Sekai ver., VIRTUAL SINGER ver., unit and collab
 * versions, then every Another Vocal on one line, each outlined. Nothing for a song with a
 * single version.
 */
export function SongVersions({ versions }: { versions?: SekaiSongVersion[] }) {
  const { t } = useTranslation();
  if (!versions || versions.length < 2) return null;
  const label = (v: SekaiSongVersion) =>
    v.caption ??
    (v.kind === 'sekai'
      ? t('version.sekai', { defaultValue: 'Sekai ver.' })
      : v.kind === 'original'
        ? t('version.original', { defaultValue: 'Original ver.' })
        : t('version.virtualSinger', { defaultValue: 'VIRTUAL SINGER ver.' }));
  const sorted = versions.toSorted(
    (a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind)
  );
  const main = sorted.filter((v) => v.kind !== 'another_vocal');
  const another = sorted.filter((v) => v.kind === 'another_vocal');
  return (
    <Stack data-song-versions gap={1}>
      <Text color="fg.muted" fontSize="xs">
        {t('version.versions', { defaultValue: 'Versions' })}
      </Text>
      <Grid
        columnGap={4}
        rowGap={1.5}
        alignItems="center"
        gridTemplateColumns="auto 1fr"
        fontSize="sm"
      >
        {main.map((v, i) => (
          <Fragment key={i}>
            <Text data-version={v.kind}>{label(v)}</Text>
            <VersionSingers version={v} />
          </Fragment>
        ))}
        {another.length > 0 && (
          <>
            <Text data-version="another_vocal">
              {t('version.anotherVocals', {
                count: another.length,
                defaultValue: `Another Vocal (${another.length})`
              })}
            </Text>
            <Wrap gap={1.5}>
              {another.map((v, i) => (
                <Box key={i} borderRadius="full" borderWidth="1px" py={0.5} px={1}>
                  <VersionSingers version={v} />
                </Box>
              ))}
            </Wrap>
          </>
        )}
      </Grid>
    </Stack>
  );
}

/** "You heard this live 3× (In person 1, Stream 2)", or nothing if you never did. */
export function HeardLive({ songId }: { songId: string }) {
  const { t } = useTranslation();
  const { attendance } = useAttendance();
  const howLabel = useHowLabel();
  const heard = useMemo(
    () => timesHeard(attendedShows(attendance, sekaiLives), songId),
    [attendance, songId]
  );
  const total = heard.in_person + heard.viewing + heard.stream;
  if (total === 0) return null;
  return (
    <Text fontSize="sm" fontWeight="semibold">
      {t('attendance.youHeard', { count: total, defaultValue: `You heard this live ${total}×` })}{' '}
      <Text as="span" color="fg.muted" fontWeight="normal">
        (
        {ATTENDANCE_HOWS.filter((h) => heard[h] > 0)
          .map((h) => `${howLabel(h)} ${heard[h]}`)
          .join(', ')}
        )
      </Text>
    </Text>
  );
}

export function SongDetailsSection({ songId }: { songId: string }) {
  const { t, i18n } = useTranslation();
  const details = useSongDetails(songId);
  const publishedAt = getSekaiSong(songId)?.publishedAt;

  const rows: [string, React.ReactNode][] = [];
  const add = (label: string, value?: React.ReactNode) => value && rows.push([label, value]);
  add(t('songInfo.lyricist', { defaultValue: 'Lyrics' }), details?.lyricist);
  add(t('songInfo.composer', { defaultValue: 'Music' }), details?.composer);
  add(t('songInfo.arranger', { defaultValue: 'Arrangement' }), details?.arranger);
  add(
    t('songInfo.released', { defaultValue: 'Released' }),
    details?.releasedAt && isoDate(details.releasedAt)
  );
  add(
    t('songInfo.addedToGame', { defaultValue: 'Added to the game' }),
    publishedAt && isoDate(publishedAt)
  );

  return (
    <Stack data-song-details gap={3}>
      {details?.events?.map((e) => (
        <Stack key={e.id} data-song-event={e.id} gap={0.5}>
          <Text color="fg.muted" fontSize="xs">
            {e.type === 'world_bloom'
              ? t('songInfo.worldLinkSong', { defaultValue: 'World Link event song' })
              : e.type === 'cheerful_carnival'
                ? t('songInfo.cheerfulCarnivalSong', {
                    defaultValue: 'Cheerful Carnival event song'
                  })
                : t('songInfo.eventSong', { defaultValue: 'Event song' })}
          </Text>
          <HStack gap={2} flexWrap="wrap">
            {e.nickname && <NicknameChip nickname={e.nickname} songId={songId} />}
            <Text fontSize="sm" fontWeight="medium">
              {eventName(e, i18n.language)}
            </Text>
            <Text color="fg.muted" fontSize="xs">
              {isoDate(e.startedAt)}
            </Text>
          </HStack>
        </Stack>
      ))}
      {rows.length > 0 && (
        <Grid columnGap={4} rowGap={1} gridTemplateColumns="auto 1fr" fontSize="sm">
          {rows.map(([label, value]) => (
            <Fragment key={label}>
              <Text color="fg.muted">{label}</Text>
              <Text>{value}</Text>
            </Fragment>
          ))}
        </Grid>
      )}
      <SongVersions versions={details?.versions} />
      <HeardLive songId={songId} />
    </Stack>
  );
}
