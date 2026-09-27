/**
 * Edit one setlist row: swap a song for another (or link a custom song to the catalog), rename
 * a custom song, retitle an MC or divider, and set remarks such as "VIRTUAL SINGER Ver.".
 * Mount it with `key={item.id}` so its fields start from the row being edited.
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SongJacket } from '../SongJacket';
import { Box, HStack, Stack, Wrap, styled } from 'styled-system/jsx';
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
import { sekaiSongName, sekaiSongSubName, sekaiSongs } from '~/utils/sekai-setlist/catalog';
import { DIVIDER_TITLES, itemName } from '~/utils/sekai-setlist/prediction';
import { EMPTY_SONG_FILTERS, filterSongs } from '~/utils/sekai-setlist/song-filter';
import type { PredictionItem } from '~/types/sekai-prediction';
import { isSongRow } from '~/types/sekai-prediction';

const MAX_RESULTS = 20;
export const REMARK_SUGGESTIONS = ['VIRTUAL SINGER Ver.', 'Game Ver.', 'Short Ver.'];

export interface EditItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: PredictionItem;
  onSave: (item: PredictionItem) => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box>
      <Text mb={2} fontSize="sm" fontWeight="medium">
        {label}
      </Text>
      {children}
    </Box>
  );
}

export function EditItemDialog({ open, onOpenChange, item, onSave }: EditItemDialogProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const songRow = isSongRow(item);
  const [search, setSearch] = useState('');
  const [songId, setSongId] = useState(item.type === 'song' ? item.songId : undefined);
  const [customName, setCustomName] = useState(item.type === 'custom' ? item.name : '');
  const [title, setTitle] = useState(songRow ? '' : (item.title ?? ''));
  const [remarks, setRemarks] = useState(songRow ? (item.remarks ?? '') : '');

  const results = useMemo(
    () =>
      search.trim()
        ? filterSongs(sekaiSongs, { ...EMPTY_SONG_FILTERS, search }).slice(0, MAX_RESULTS)
        : [],
    [search]
  );
  const staged = songId && songId !== (item.type === 'song' ? item.songId : undefined);

  const save = () => {
    const r = remarks.trim();
    const withRemarks = r ? { remarks: r } : {};
    let next: PredictionItem;
    switch (item.type) {
      case 'song':
        next = { id: item.id, type: 'song', songId: songId ?? item.songId, ...withRemarks };
        break;
      case 'custom':
        next = songId
          ? { id: item.id, type: 'song', songId, ...withRemarks }
          : { id: item.id, type: 'custom', name: customName.trim() || item.name, ...withRemarks };
        break;
      case 'mc':
        next = { id: item.id, type: 'mc', title: title.trim() || 'MC' };
        break;
      default:
        next = { id: item.id, type: item.type, ...(title.trim() ? { title: title.trim() } : {}) };
    }
    onSave(next);
    onOpenChange(false);
  };

  return (
    <DialogRoot
      open={open}
      onOpenChange={(details: { open: boolean }) => onOpenChange(details.open)}
      lazyMount
      unmountOnExit
    >
      <DialogBackdrop />
      <DialogPositioner>
        <DialogContent w="full" maxW="600px" maxH="90vh" overflow="auto">
          <Stack gap={4} p={6}>
            <DialogTitle>{t('builder.editItemTitle', { defaultValue: 'Edit item' })}</DialogTitle>
            <DialogDescription>
              <Text color="fg.muted" fontSize="sm">
                {songRow
                  ? t('builder.editSongDescription', {
                      defaultValue: 'Change the song or add remarks such as a version.'
                    })
                  : t('builder.editOtherDescription', { defaultValue: 'Change the title.' })}
              </Text>
            </DialogDescription>

            {songRow && (
              <Box borderRadius="md" borderWidth="1px" p={3} bgColor="bg.muted">
                <Text mb={1} fontSize="sm" fontWeight="medium">
                  {t('builder.currentSong', { defaultValue: 'Current song' })}
                </Text>
                <Text
                  data-current-song
                  textDecoration={staged ? 'line-through' : undefined}
                  fontSize="sm"
                >
                  {itemName(item, lang)}
                </Text>
              </Box>
            )}

            {item.type === 'custom' && !songId && (
              <Field label={t('builder.customSongName', { defaultValue: 'Custom song name' })}>
                <Input
                  value={customName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCustomName(e.target.value)
                  }
                  aria-label={t('builder.customSongName', { defaultValue: 'Custom song name' })}
                />
              </Field>
            )}

            {songRow && (
              <Field
                label={
                  item.type === 'custom'
                    ? t('builder.linkSong', { defaultValue: 'Link to a catalog song' })
                    : t('builder.changeSong', { defaultValue: 'Change song' })
                }
              >
                {staged ? (
                  <Box
                    data-staged-song={songId}
                    borderColor="border.accent"
                    borderRadius="md"
                    borderWidth="2px"
                    p={3}
                    bgColor="bg.subtle"
                  >
                    <HStack gap={3} justifyContent="space-between">
                      <SongJacket id={songId} size={40} />
                      <Stack flex={1} gap={0.5} minW={0}>
                        <Text fontSize="sm" fontWeight="bold">
                          {sekaiSongName(songId, lang)}
                        </Text>
                        {sekaiSongSubName(songId, lang) && (
                          <Text color="fg.muted" fontSize="xs">
                            {sekaiSongSubName(songId, lang)}
                          </Text>
                        )}
                      </Stack>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSongId(item.type === 'song' ? item.songId : undefined);
                          setSearch('');
                        }}
                      >
                        {t('builder.clear', { defaultValue: 'Clear' })}
                      </Button>
                    </HStack>
                  </Box>
                ) : (
                  <>
                    <Input
                      value={search}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setSearch(e.target.value)
                      }
                      placeholder={t('builder.searchSongs', {
                        defaultValue: 'Search by title or reading…'
                      })}
                      aria-label={t('builder.searchReplacement', {
                        defaultValue: 'Search for a replacement song'
                      })}
                      mb={2}
                    />
                    {search.trim() && (
                      <Box
                        borderRadius="md"
                        borderWidth="1px"
                        maxH="220px"
                        bgColor="bg.default"
                        overflow="auto"
                      >
                        {results.length === 0 ? (
                          <Text p={3} color="fg.muted" fontSize="sm" textAlign="center">
                            {t('builder.noSongsFound', { defaultValue: 'No songs found' })}
                          </Text>
                        ) : (
                          results.map((s) => (
                            <styled.button
                              key={s.id}
                              type="button"
                              data-replacement={s.id}
                              onClick={() => setSongId(s.id)}
                              cursor="pointer"
                              display="flex"
                              gap={2}
                              alignItems="center"
                              borderBottomWidth="1px"
                              w="full"
                              p={2}
                              textAlign="left"
                              _hover={{ bgColor: 'bg.subtle' }}
                            >
                              <SongJacket id={s.id} size={28} />
                              <Stack gap={0} minW={0}>
                                <Text fontSize="sm" fontWeight="medium">
                                  {sekaiSongName(s.id, lang)}
                                </Text>
                                {sekaiSongSubName(s.id, lang) && (
                                  <Text color="fg.muted" fontSize="xs">
                                    {sekaiSongSubName(s.id, lang)}
                                  </Text>
                                )}
                              </Stack>
                            </styled.button>
                          ))
                        )}
                      </Box>
                    )}
                  </>
                )}
              </Field>
            )}

            {!songRow && (
              <Field label={t('builder.itemTitle', { defaultValue: 'Title' })}>
                <Input
                  value={title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                  placeholder={item.type === 'mc' ? 'MC' : DIVIDER_TITLES[item.type]}
                  aria-label={t('builder.itemTitle', { defaultValue: 'Title' })}
                />
              </Field>
            )}

            {songRow && (
              <Field label={t('builder.remarks', { defaultValue: 'Version / remarks' })}>
                <Input
                  value={remarks}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRemarks(e.target.value)}
                  placeholder={t('builder.remarksPlaceholder', {
                    defaultValue: 'VIRTUAL SINGER Ver., Short Ver., notes…'
                  })}
                  aria-label={t('builder.remarks', { defaultValue: 'Version / remarks' })}
                />
                <Wrap gap={1} mt={2}>
                  {REMARK_SUGGESTIONS.map((s) => (
                    <Button key={s} size="xs" variant="outline" onClick={() => setRemarks(s)}>
                      {s}
                    </Button>
                  ))}
                </Wrap>
                <Text mt={1} color="fg.muted" fontSize="xs">
                  {t('builder.remarksHint', {
                    defaultValue: 'Remarks replace the vocalist icons in the setlist.'
                  })}
                </Text>
              </Field>
            )}

            <HStack gap={2} justifyContent="flex-end" pt={2}>
              <DialogCloseTrigger asChild>
                <Button variant="outline">{t('common.cancel', { defaultValue: 'Cancel' })}</Button>
              </DialogCloseTrigger>
              <Button onClick={save}>{t('builder.save', { defaultValue: 'Save' })}</Button>
            </HStack>
          </Stack>
        </DialogContent>
      </DialogPositioner>
    </DialogRoot>
  );
}
