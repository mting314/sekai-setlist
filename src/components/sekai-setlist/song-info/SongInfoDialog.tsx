/**
 * Everything about one song in a dialog, like llernote's song details: jacket, units and
 * vocalists, event and credits, then every live performance, newest first.
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NicknameChips } from './NicknameChips';
import { SongDetailsSection } from './SongDetailsSection';
import { Stat } from '../LiveSummaryCard';
import { SongJacket } from '../SongJacket';
import { KindBadge, UnitBadge, VocalistIcons } from '../SongMeta';
import { Box, Grid, HStack, Stack, Wrap } from 'styled-system/jsx';
import { Link } from '~/components/ui/link';
import { Badge } from '~/components/ui/styled/badge';
import { Button } from '~/components/ui/styled/button';
import {
  Backdrop as DialogBackdrop,
  CloseTrigger as DialogCloseTrigger,
  Content as DialogContent,
  Positioner as DialogPositioner,
  Root as DialogRoot,
  Title as DialogTitle
} from '~/components/ui/styled/dialog';
import { Text } from '~/components/ui/styled/text';
import { getSekaiSong, sekaiSongName, sekaiSongSubName } from '~/utils/sekai-setlist/catalog';
import { sekaiLiveName, sekaiLives } from '~/utils/sekai-setlist/live-data';
import { songHistory } from '~/utils/sekai-setlist/lives';
import { liveHref, songHref } from '~/utils/sekai-setlist/routes';

const PREVIEW_ROWS = 8;

export interface SongInfoDialogProps {
  songId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SongInfoDialog({ songId, open, onOpenChange }: SongInfoDialogProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const song = getSekaiSong(songId);
  const history = useMemo(() => songHistory(songId, sekaiLives), [songId]);
  const [showAll, setShowAll] = useState(false);
  if (!song) return null;

  const units = song.units.length ? song.units : ['other'];
  const subName = sekaiSongSubName(songId, lang);
  const liveCount = new Set(history.map((h) => h.live.id)).size;
  const liveDate = (i: number) => history[i].live.startDate ?? history[i].live.date;
  const rows = showAll ? history : history.slice(0, PREVIEW_ROWS);

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
          data-song-info-dialog={songId}
          w="full"
          maxW="560px"
          maxH="85vh"
          overflow="auto"
        >
          <Stack gap={5} p={6}>
            <HStack gap={4} alignItems="flex-start">
              <SongJacket id={songId} size={64} />
              <Stack gap={1.5} minW={0}>
                <Stack gap={0}>
                  <DialogTitle>{sekaiSongName(songId, lang)}</DialogTitle>
                  {subName && (
                    <Text color="fg.muted" fontSize="sm">
                      {subName}
                    </Text>
                  )}
                </Stack>
                <Wrap gap={1.5} alignItems="center">
                  {units.map((u) => (
                    <UnitBadge key={u} unit={u} />
                  ))}
                  <KindBadge commissioned={song.commissioned} />
                  <NicknameChips songId={songId} />
                </Wrap>
                <VocalistIcons id={songId} size={24} max={12} />
              </Stack>
            </HStack>

            <SongDetailsSection songId={songId} />

            <Stack gap={2}>
              <Text fontWeight="bold">
                {t('songInfo.performances', { defaultValue: 'Live performances' })}
              </Text>
              {history.length === 0 ? (
                <Text color="fg.muted" fontSize="sm">
                  {t('song.neverPerformed', { defaultValue: 'Not performed at a live yet.' })}
                </Text>
              ) : (
                <>
                  <Grid gap={2} gridTemplateColumns="repeat(3, 1fr)">
                    <Stat
                      label={t('song.statLives', { defaultValue: 'Lives' })}
                      value={liveCount}
                    />
                    <Stat
                      label={t('song.firstPerformed', { defaultValue: 'First performed' })}
                      value={<Text fontSize="sm">{liveDate(history.length - 1)}</Text>}
                    />
                    <Stat
                      label={t('song.lastPerformed', { defaultValue: 'Last performed' })}
                      value={<Text fontSize="sm">{liveDate(0)}</Text>}
                    />
                  </Grid>
                  <Box borderRadius="md" borderWidth="1px">
                    {rows.map((h, i) => (
                      <HStack
                        key={i}
                        data-performance-row
                        gap={3}
                        borderBottomWidth="1px"
                        py={1.5}
                        px={3}
                        fontSize="sm"
                        _last={{ borderBottomWidth: 0 }}
                      >
                        <Text flexShrink={0} w="88px" color="fg.muted" fontSize="xs">
                          {h.live.date}
                        </Text>
                        <Stack flex={1} gap={0} minW={0}>
                          <Link href={liveHref(h.live.id)} fontWeight="medium">
                            {sekaiLiveName(h.live, lang)}
                          </Link>
                          <Text color="fg.muted" fontSize="xs">
                            {[h.perf.name, `#${h.position}`, h.note].filter(Boolean).join(' · ')}
                          </Text>
                        </Stack>
                        {h.encore && (
                          <Badge variant="subtle" size="sm" flexShrink={0}>
                            {t('sekaiSetlist.lives.markerEncore', { defaultValue: 'Encore' })}
                          </Badge>
                        )}
                      </HStack>
                    ))}
                  </Box>
                  {history.length > PREVIEW_ROWS && (
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => setShowAll((v) => !v)}
                      alignSelf="flex-start"
                    >
                      {showAll
                        ? t('songInfo.showFewer', { defaultValue: 'Show fewer' })
                        : t('songInfo.showAll', {
                            count: history.length,
                            defaultValue: `Show all (${history.length})`
                          })}
                    </Button>
                  )}
                </>
              )}
            </Stack>

            <HStack gap={2} justifyContent="flex-end">
              <Button asChild variant="outline">
                <a href={songHref(songId)}>
                  {t('songInfo.openSongPage', { defaultValue: 'Open song page' })}
                </a>
              </Button>
              <DialogCloseTrigger asChild>
                <Button>{t('common.close', { defaultValue: 'Close' })}</Button>
              </DialogCloseTrigger>
            </HStack>
          </Stack>
        </DialogContent>
      </DialogPositioner>
    </DialogRoot>
  );
}
