/**
 * Phone "add" sheet behind the floating + button: Quick Add buttons and song search. Adding
 * anything closes it.
 */
import { useTranslation } from 'react-i18next';
import { BiPlus, BiX } from 'react-icons/bi';
import { QUICK_ADD_TYPES, type QuickAddType } from './quick-add';
import { SongSearchPanel } from './SongSearchPanel';
import { HStack, Stack } from 'styled-system/jsx';
import { Drawer } from '~/components/ui/drawer';
import { Button } from '~/components/ui/styled/button';
import { IconButton } from '~/components/ui/styled/icon-button';
import { Text } from '~/components/ui/styled/text';

interface AddItemDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSong: (songId: string) => void;
  onAddCustomSong: (name: string) => void;
  onAddQuickItem: (type: QuickAddType) => void;
}

const QUICK_LABELS: Record<QuickAddType, string> = {
  mc: 'MC',
  encore: 'Encore',
  intermission: 'Intermission'
};

export function AddItemDrawer({
  isOpen,
  onClose,
  onAddSong,
  onAddCustomSong,
  onAddQuickItem
}: AddItemDrawerProps) {
  const { t } = useTranslation();
  const then =
    <A extends unknown[]>(fn: (...args: A) => void) =>
    (...args: A) => {
      fn(...args);
      onClose();
    };

  return (
    <Drawer.Root
      open={isOpen}
      onOpenChange={(details) => !details.open && onClose()}
      lazyMount
      unmountOnExit
    >
      <Drawer.Backdrop />
      <Drawer.Positioner>
        <Drawer.Content>
          <Stack gap={0} h="full">
            <HStack
              justifyContent="space-between"
              alignItems="center"
              borderBottomWidth="1px"
              p={4}
            >
              <Drawer.Title>{t('builder.addItem', { defaultValue: 'Add item' })}</Drawer.Title>
              <Drawer.CloseTrigger asChild>
                <IconButton
                  variant="ghost"
                  size="sm"
                  aria-label={t('common.close', { defaultValue: 'Close' })}
                >
                  <BiX size={20} />
                </IconButton>
              </Drawer.CloseTrigger>
            </HStack>

            <Stack flex={1} gap={6} minH={0} p={4} overflow="auto">
              <Stack gap={2} flexShrink={0}>
                <Text fontSize="sm" fontWeight="medium">
                  {t('builder.quickAdd', { defaultValue: 'Quick add' })}
                </Text>
                <HStack gap={2} flexWrap="wrap">
                  {QUICK_ADD_TYPES.map((type) => (
                    <Button
                      key={type}
                      variant="outline"
                      size="sm"
                      onClick={then(() => onAddQuickItem(type))}
                    >
                      <BiPlus /> {t(`builder.quick.${type}`, { defaultValue: QUICK_LABELS[type] })}
                    </Button>
                  ))}
                </HStack>
              </Stack>

              <SongSearchPanel
                hideTitle
                idPrefix="add"
                onAddSong={then(onAddSong)}
                onAddCustomSong={then(onAddCustomSong)}
                maxH="calc(100dvh - 360px)"
              />
            </Stack>
          </Stack>
        </Drawer.Content>
      </Drawer.Positioner>
    </Drawer.Root>
  );
}
