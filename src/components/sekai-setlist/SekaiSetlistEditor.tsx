/**
 * Sekai setlist editor: user-written title, localStorage save slots and an lz-string share URL
 * around the SetlistBuilder. No backend.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BiFolderOpen, BiLink, BiPlus, BiSave, BiTrash } from 'react-icons/bi';
import { Box, HStack, Stack, Wrap } from 'styled-system/jsx';
import { SetlistBuilder } from './SetlistBuilder';
import { Button } from '~/components/ui/styled/button';
import { Input } from '~/components/ui/styled/input';
import { Text } from '~/components/ui/styled/text';
import { useToaster } from '~/context/ToasterContext';
import { EMPTY_STATE, decodeHash, shareUrl, type SetlistState } from '~/utils/sekai-setlist/share';
import {
  listSlots,
  saveSlot,
  loadSlot,
  deleteSlot,
  type SavedSlot
} from '~/utils/sekai-setlist/storage';

const clearHash = () =>
  history.replaceState(null, '', window.location.pathname + window.location.search);

export function SekaiSetlistEditor() {
  const { t } = useTranslation();
  const { toast } = useToaster();
  const [state, setState] = useState<SetlistState>(EMPTY_STATE);
  const [slots, setSlots] = useState<SavedSlot[]>([]);
  const [slotName, setSlotName] = useState('');

  useEffect(() => {
    const fromHash = decodeHash(window.location.hash);
    if (fromHash) {
      setState(fromHash);
      setSlotName(fromHash.title);
    }
    setSlots(listSlots());
  }, []);

  const update = (partial: Partial<SetlistState>) => setState((s) => ({ ...s, ...partial }));

  const doSave = () => {
    const name = (slotName || state.title || 'Untitled').trim();
    saveSlot(name, { ...state, title: state.title || name }, Date.now());
    setSlots(listSlots());
    toast({
      title: t('sekaiSetlist.saved', { name, defaultValue: `Saved “${name}”` }),
      type: 'success'
    });
  };
  const doLoad = (name: string) => {
    const loaded = loadSlot(name);
    if (!loaded) return;
    setState(loaded);
    setSlotName(loaded.title || name);
    clearHash();
  };
  const doDelete = (name: string) => {
    if (!window.confirm(t('common.confirmDelete', { defaultValue: 'Are you sure?' }))) return;
    deleteSlot(name);
    setSlots(listSlots());
  };
  const doNew = () => {
    setState(EMPTY_STATE);
    setSlotName('');
    clearHash();
  };
  const doShare = async () => {
    const url = shareUrl(state);
    history.replaceState(null, '', '#' + url.split('#')[1]);
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: t('sekaiSetlist.linkCopied', { defaultValue: 'Share link copied!' }),
        type: 'success'
      });
    } catch {
      // Clipboard blocked — the link is in the address bar regardless.
      toast({
        title: t('sekaiSetlist.linkInAddressBar', {
          defaultValue: 'Copy the link from the address bar'
        }),
        type: 'info'
      });
    }
  };

  return (
    <Stack gap={4}>
      <Box borderRadius="xl" borderWidth="1px" p={{ base: 3, md: 5 }} bgColor="bg.default">
        <Stack gap={3}>
          <Input
            size="lg"
            value={state.title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => update({ title: e.target.value })}
            placeholder={t('sekaiSetlist.titlePlaceholder', {
              defaultValue: 'Setlist title (e.g. My Dream Sekai Live)'
            })}
            fontWeight="bold"
          />
          <Wrap gap={2} alignItems="center">
            <Button size="sm" variant="outline" onClick={doNew}>
              <BiPlus /> {t('common.new', { defaultValue: 'New' })}
            </Button>
            <HStack gap={1}>
              <Input
                size="sm"
                value={slotName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSlotName(e.target.value)}
                placeholder={t('sekaiSetlist.slotName', { defaultValue: 'Slot name' })}
                w="44"
              />
              <Button size="sm" variant="outline" onClick={doSave}>
                <BiSave /> {t('save', { defaultValue: 'Save' })}
              </Button>
            </HStack>
            <Button size="sm" variant="outline" onClick={() => void doShare()}>
              <BiLink /> {t('sekaiSetlist.shareLink', { defaultValue: 'Share link' })}
            </Button>
          </Wrap>

          {slots.length > 0 && (
            <Wrap gap={1.5} alignItems="center">
              <HStack gap={1} color="fg.subtle" fontSize="xs">
                <BiFolderOpen /> {t('sekaiSetlist.savedSlots', { defaultValue: 'Saved:' })}
              </HStack>
              {slots.map((s) => (
                <HStack
                  key={s.name}
                  gap={0}
                  borderRadius="full"
                  borderWidth="1px"
                  overflow="hidden"
                >
                  <Button size="xs" variant="ghost" onClick={() => doLoad(s.name)} borderRadius="0">
                    {s.name}
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    aria-label={t('sekaiSetlist.deleteSlot', {
                      name: s.name,
                      defaultValue: `Delete ${s.name}`
                    })}
                    onClick={() => doDelete(s.name)}
                    borderRadius="0"
                    color="fg.subtle"
                  >
                    <BiTrash />
                  </Button>
                </HStack>
              ))}
            </Wrap>
          )}
        </Stack>
      </Box>

      <Box borderRadius="xl" borderWidth="1px" p={{ base: 3, md: 5 }} bgColor="bg.default">
        <SetlistBuilder
          songs={state.songs}
          encore={state.encore}
          ordered={state.ordered}
          onChange={(songs, encore, ordered) => update({ songs, encore, ordered })}
        />
      </Box>

      <Text color="fg.subtle" fontSize="xs" textAlign="center">
        {t('sekaiSetlist.credit', {
          defaultValue: 'Song data and jackets from sekai.best / Sekai master DB.'
        })}
      </Text>
    </Stack>
  );
}
