/**
 * My Lives (/me): the shows you logged, stats (lives, shows, songs heard, per unit, what you
 * haven't heard yet) filtered by how you attended, and your data: export / import / share link.
 * A #a= share link shows someone else's log read-only, with an option to merge it into yours.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BiDownload, BiLinkAlt, BiTrash, BiUpload } from 'react-icons/bi';
import { Box, Grid, HStack, Stack, Wrap, styled } from 'styled-system/jsx';
import { Card, Stat } from './LiveSummaryCard';
import { HowFilter, useHowLabel } from './ShowAttendance';
import { SongJacket } from './SongJacket';
import { UnitBadge } from './SongMeta';
import { NicknameChips } from './song-info/NicknameChips';
import { SongInfoButton } from './song-info/SongInfoButton';
import { Badge } from '~/components/ui/styled/badge';
import { Button } from '~/components/ui/styled/button';
import { Link } from '~/components/ui/link';
import { Text } from '~/components/ui/styled/text';
import { useToaster } from '~/context/ToasterContext';
import { useAttendance } from '~/hooks/useAttendance';
import { attendanceStats, attendedShows } from '~/utils/sekai-setlist/attendance-stats';
import {
  attendedShowCount,
  decodeAttendance,
  encodeAttendance,
  exportJson,
  importJson,
  mergeAttendance,
  EMPTY_ATTENDANCE,
  type Attendance
} from '~/utils/sekai-setlist/attendance';
import {
  getSekaiSong,
  sekaiSongName,
  sekaiUnitColor,
  sekaiUnits
} from '~/utils/sekai-setlist/catalog';
import { sekaiLiveName, sekaiLives } from '~/utils/sekai-setlist/live-data';
import { EMPTY_LIVE_FILTERS, songStats } from '~/utils/sekai-setlist/lives';
import { liveHref, livesHref, meHref, songHref } from '~/utils/sekai-setlist/routes';
import type { AttendanceHow } from '~/types/sekai';

const TOP_SONGS = 10;

// Every song performed at any live, most-played first, and how many per unit.
const performed = songStats(sekaiLives, EMPTY_LIVE_FILTERS, getSekaiSong);
const performedByUnit: Record<string, number> = {};
for (const s of performed) {
  const units = getSekaiSong(s.songId)?.units ?? [];
  for (const u of units.length ? units : ['other'])
    performedByUnit[u] = (performedByUnit[u] ?? 0) + 1;
}

const TimelineRow = styled('div', {
  base: {
    display: 'flex',
    gap: '3',
    alignItems: 'center',
    borderTopWidth: '1px',
    py: '2',
    _first: { borderTopWidth: 0 },
    '&[data-dim=true]': { opacity: 0.5 }
  }
});

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text fontSize="lg" fontWeight="bold">
      {children}
    </Text>
  );
}

function SongRow({ id, right }: { id: string; right: React.ReactNode }) {
  const { i18n } = useTranslation();
  return (
    <HStack gap={2.5} py={1}>
      <SongJacket id={id} size={32} />
      <HStack flex={1} gap={1.5} minW={0}>
        <Link
          href={songHref(id)}
          minW={0}
          fontSize="sm"
          textOverflow="ellipsis"
          overflow="hidden"
          whiteSpace="nowrap"
        >
          {sekaiSongName(id, i18n.language)}
        </Link>
        <NicknameChips songId={id} />
        <SongInfoButton songId={id} />
      </HStack>
      <Text flexShrink={0} color="fg.muted" fontSize="xs">
        {right}
      </Text>
    </HStack>
  );
}

export function MyLives() {
  const { t, i18n } = useTranslation();
  const { toast } = useToaster();
  const howLabel = useHowLabel();
  const { attendance: mine, ready, replace } = useAttendance();
  const [shared, setShared] = useState<Attendance>();
  const [hows, setHows] = useState<AttendanceHow[]>(['in_person']);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const read = () => setShared(decodeAttendance(window.location.hash));
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);

  const attendance = shared ?? mine;
  const all = useMemo(() => attendedShows(attendance, sekaiLives), [attendance]);
  const stats = useMemo(() => attendanceStats(all, hows, getSekaiSong), [all, hows]);
  const mostHeard = useMemo(
    () =>
      [...stats.songsHeard]
        .toSorted((a, b) => b[1] - a[1] || Number(a[0]) - Number(b[0]))
        .slice(0, TOP_SONGS),
    [stats]
  );
  const notHeard = useMemo(
    () => performed.filter((s) => !stats.songsHeard.has(s.songId)).slice(0, TOP_SONGS),
    [stats]
  );

  const leaveShared = () => {
    history.replaceState(null, '', window.location.pathname);
    setShared(undefined);
  };
  const addSharedToMine = () => {
    if (!shared) return;
    replace(mergeAttendance(mine, shared));
    leaveShared();
    toast({
      title: t('attendance.merged', { defaultValue: 'Added to your log' }),
      type: 'success'
    });
  };

  const doExport = () => {
    const blob = new Blob([exportJson(mine)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'sekai-setlists-my-lives.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const doImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const next = importJson(await file.text(), mine, 'merge');
      replace(next);
      toast({
        title: t('attendance.imported', {
          count: attendedShowCount(next),
          defaultValue: `Imported — ${attendedShowCount(next)} shows in your log`
        }),
        type: 'success'
      });
    } catch {
      toast({
        title: t('attendance.importFailed', {
          defaultValue: "That file isn't a Sekai Setlists export"
        }),
        type: 'error'
      });
    }
  };
  const doShare = async () => {
    const url = `${window.location.origin}${meHref()}#${encodeAttendance(mine)}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: t('sekaiSetlist.linkCopied', { defaultValue: 'Share link copied!' }),
        type: 'success'
      });
    } catch {
      history.replaceState(null, '', url);
      toast({
        title: t('sekaiSetlist.linkInAddressBar', {
          defaultValue: 'Copy the link from the address bar'
        }),
        type: 'info'
      });
    }
  };
  const doClear = () => {
    if (
      window.confirm(
        t('attendance.clearConfirm', {
          defaultValue: 'Remove every show from your log? Export first if you want a backup.'
        })
      )
    )
      replace(EMPTY_ATTENDANCE);
  };

  const empty = ready && all.length === 0;

  return (
    <Stack gap={8}>
      <Stack gap={2}>
        <Text as="h1" fontSize={{ base: '2xl', md: '3xl' }} fontWeight="bold">
          {shared
            ? t('attendance.sharedTitle', { defaultValue: "Someone's lives" })
            : t('attendance.title', { defaultValue: 'My Lives' })}
        </Text>
        <Text color="fg.muted">
          {t('attendance.description', {
            defaultValue:
              'Log the shows you went to from any live page. Your log stays in this browser — export it or share a link to keep it.'
          })}
        </Text>
        {shared && (
          <Card>
            <HStack gap={3} justifyContent="space-between" flexWrap="wrap">
              <Text fontSize="sm">
                {t('attendance.sharedBanner', {
                  count: attendedShowCount(shared),
                  defaultValue: `You're viewing a shared log (${attendedShowCount(shared)} shows).`
                })}
              </Text>
              <HStack gap={2}>
                <Button size="xs" variant="outline" onClick={leaveShared}>
                  {t('attendance.backToMine', { defaultValue: 'Back to my log' })}
                </Button>
                <Button size="xs" onClick={addSharedToMine}>
                  {t('attendance.addToMine', { defaultValue: 'Add to my log' })}
                </Button>
              </HStack>
            </HStack>
          </Card>
        )}
      </Stack>

      {empty ? (
        <Card>
          <Stack gap={2} alignItems="flex-start">
            <Text>
              {t('attendance.empty', {
                defaultValue: "You haven't logged any shows yet."
              })}
            </Text>
            <Text color="fg.muted" fontSize="sm">
              {t('attendance.emptyHint', {
                defaultValue:
                  'Open a live, find "Were you there?" and mark each show you saw in person, at a live viewing or on stream.'
              })}
            </Text>
            <Button asChild size="sm">
              <a href={livesHref()}>
                {t('attendance.browseLives', { defaultValue: 'Find a live' })}
              </a>
            </Button>
          </Stack>
        </Card>
      ) : (
        <>
          <Stack gap={3}>
            <HStack gap={3} justifyContent="space-between" flexWrap="wrap">
              <SectionTitle>{t('attendance.stats', { defaultValue: 'Stats' })}</SectionTitle>
              <HowFilter value={hows} onChange={setHows} />
            </HStack>
            <Grid gap={2} gridTemplateColumns={{ base: '1fr 1fr', md: 'repeat(3, 1fr)' }}>
              <Stat
                label={t('attendance.statLives', { defaultValue: 'Lives' })}
                value={stats.lives}
              />
              <Stat
                label={t('attendance.statShows', { defaultValue: 'Shows' })}
                value={stats.shows.length}
              />
              <Stat
                label={t('attendance.statSongs', { defaultValue: 'Songs heard' })}
                value={stats.songsHeard.size}
              />
            </Grid>
            {stats.unrecorded > 0 && (
              <Text color="fg.muted" fontSize="xs">
                {t('attendance.unrecordedNote', {
                  count: stats.unrecorded,
                  defaultValue: `${stats.unrecorded} of these shows have no recorded setlist, so their songs aren't counted.`
                })}
              </Text>
            )}
          </Stack>

          {stats.songsHeard.size > 0 && (
            <Stack gap={2}>
              <SectionTitle>
                {t('attendance.byUnit', { defaultValue: 'Songs heard by unit' })}
              </SectionTitle>
              <Card>
                <Stack gap={2}>
                  {sekaiUnits.map((u) => {
                    const heard = stats.byUnit[u.id] ?? 0;
                    const total = performedByUnit[u.id] ?? 0;
                    return (
                      <Stack key={u.id} gap={1}>
                        <HStack gap={2} justifyContent="space-between">
                          <UnitBadge unit={u.id} link />
                          <Text color="fg.muted" fontSize="xs" fontVariantNumeric="tabular-nums">
                            {t('attendance.heardOf', {
                              heard,
                              total,
                              defaultValue: `${heard} / ${total} performed`
                            })}
                          </Text>
                        </HStack>
                        <Box borderRadius="full" h="1.5" bgColor="bg.muted" overflow="hidden">
                          <Box
                            style={{
                              width: `${total ? (100 * heard) / total : 0}%`,
                              backgroundColor: sekaiUnitColor(u.id)
                            }}
                            h="full"
                          />
                        </Box>
                      </Stack>
                    );
                  })}
                </Stack>
              </Card>
            </Stack>
          )}

          <Grid gap={6} gridTemplateColumns={{ base: '1fr', md: '1fr 1fr' }}>
            {mostHeard.length > 0 && (
              <Stack gap={2}>
                <SectionTitle>
                  {t('attendance.mostHeard', { defaultValue: 'Most heard' })}
                </SectionTitle>
                <Stack gap={0}>
                  {mostHeard.map(([id, n]) => (
                    <SongRow key={id} id={id} right={`${n}×`} />
                  ))}
                </Stack>
              </Stack>
            )}
            <Stack gap={2}>
              <SectionTitle>
                {t('attendance.notHeard', { defaultValue: "Haven't heard live yet" })}
              </SectionTitle>
              <Stack gap={0}>
                {notHeard.map((s) => (
                  <SongRow
                    key={s.songId}
                    id={s.songId}
                    right={t('sekaiSetlist.lives.livesCount', {
                      count: s.lives.length,
                      defaultValue: `${s.lives.length} lives`
                    })}
                  />
                ))}
              </Stack>
            </Stack>
          </Grid>

          <Stack gap={2}>
            <SectionTitle>{t('attendance.timeline', { defaultValue: 'Shows' })}</SectionTitle>
            <Stack gap={0}>
              {all.map((s) => {
                const counted = hows.includes(s.entry.how);
                return (
                  <TimelineRow key={`${s.live.id}/${s.show.id}`} data-dim={!counted}>
                    <Text
                      flexShrink={0}
                      w="6.5rem"
                      color="fg.muted"
                      fontSize="xs"
                      fontVariantNumeric="tabular-nums"
                    >
                      {s.show.date ?? s.live.startDate}
                    </Text>
                    <Stack flex={1} gap={0} minW={0}>
                      <Link href={liveHref(s.live.id)} fontSize="sm" fontWeight="medium">
                        {sekaiLiveName(s.live, i18n.language)}
                      </Link>
                      <Text color="fg.muted" fontSize="xs">
                        {s.show.label}
                      </Text>
                    </Stack>
                    <Badge variant={counted ? 'solid' : 'outline'} size="sm" flexShrink={0}>
                      {howLabel(s.entry.how)}
                    </Badge>
                  </TimelineRow>
                );
              })}
            </Stack>
          </Stack>
        </>
      )}

      {!shared && ready && (
        <Stack gap={2}>
          <SectionTitle>{t('attendance.yourData', { defaultValue: 'Your data' })}</SectionTitle>
          <Wrap gap={2}>
            <Button size="sm" variant="outline" onClick={doExport} disabled={empty}>
              <BiDownload /> {t('attendance.export', { defaultValue: 'Export' })}
            </Button>
            <Button size="sm" variant="outline" onClick={() => fileInput.current?.click()}>
              <BiUpload /> {t('attendance.import', { defaultValue: 'Import' })}
            </Button>
            <Button size="sm" variant="outline" onClick={doShare} disabled={empty}>
              <BiLinkAlt /> {t('attendance.share', { defaultValue: 'Copy share link' })}
            </Button>
            <Button size="sm" variant="ghost" onClick={doClear} disabled={empty}>
              <BiTrash /> {t('attendance.clear', { defaultValue: 'Clear' })}
            </Button>
          </Wrap>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              void doImport(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <Text color="fg.subtle" fontSize="xs">
            {t('attendance.importHint', {
              defaultValue:
                'Importing merges the file into your log; shows in both take the file’s value.'
            })}
          </Text>
        </Stack>
      )}
    </Stack>
  );
}
