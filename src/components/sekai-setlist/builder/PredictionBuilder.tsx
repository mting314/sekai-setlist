/**
 * The setlist builder: name bar, then song search + Quick Add | the setlist | stats and actions.
 * Below md the search is a left drawer plus a floating + button; below lg the actions are a
 * right drawer. Controlled — the page owns the prediction and autosaves it.
 */
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  TouchSensor,
  closestCenter,
  defaultDropAnimationSideEffects,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type DropAnimation
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useTranslation } from 'react-i18next';
import { BiCheckDouble, BiDotsVerticalRounded, BiImport, BiPlus, BiSlider } from 'react-icons/bi';
import { MdDragIndicator } from 'react-icons/md';
import { AddItemDrawer } from './AddItemDrawer';
import { DraggableQuickAddItem } from './DraggableQuickAddItem';
import { EditItemDialog } from './EditItemDialog';
import { ExportShareTools } from './ExportShareTools';
import { ImportDialog } from './ImportDialog';
import { QUICK_ADD_TYPES, newQuickAddItem, type QuickAddType } from './quick-add';
import { ItemColorBar, ItemSummary } from './setlist-editor/ItemSummary';
import { END_DROP_ZONE } from './setlist-editor/SetlistEndDropZone';
import { DROP_ZONE, SetlistEditorPanel, type DropIndicator } from './SetlistEditorPanel';
import { SongSearchPanel } from './SongSearchPanel';
import { Box, HStack, Stack } from 'styled-system/jsx';
import { Drawer } from '~/components/ui/drawer';
import { Menu } from '~/components/ui/menu';
import { Button } from '~/components/ui/styled/button';
import { IconButton } from '~/components/ui/styled/icon-button';
import { Input } from '~/components/ui/styled/input';
import { Text } from '~/components/ui/styled/text';
import { getSekaiLive, performedSongIds } from '~/utils/sekai-setlist/live-data';
import { itemId, songItem } from '~/utils/sekai-setlist/prediction';
import { markHref } from '~/utils/sekai-setlist/routes';
import type { SongVersion } from '~/types/sekai';
import type { PredictionItem, SekaiPrediction } from '~/types/sekai-prediction';
import { isSongRow } from '~/types/sekai-prediction';

export type PredictionUpdate = (update: (p: SekaiPrediction) => SekaiPrediction) => void;

export interface PredictionBuilderProps {
  prediction: SekaiPrediction;
  onChange: PredictionUpdate;
  /** Persist now (before leaving for Mark). */
  onSaveNow: () => void;
}

type DragData =
  | { type: 'search-result'; songId: string }
  | { type: 'quick-add-item'; itemType: QuickAddType }
  | { type: 'setlist-item'; item: PredictionItem };

/** The row a drag would produce (or moves), for the overlay and the drop ghost. */
function draggedItem(data: DragData | undefined): PredictionItem | undefined {
  switch (data?.type) {
    case 'search-result':
      return { id: 'preview', type: 'song', songId: data.songId };
    case 'quick-add-item':
      return { ...newQuickAddItem(data.itemType), id: 'preview' };
    case 'setlist-item':
      return data.item;
    default:
      return undefined;
  }
}

const isEndZone = (id: string | number) => id === DROP_ZONE || id === END_DROP_ZONE;

function DragPreview({ item }: { item: PredictionItem | undefined }) {
  if (!item) return null;
  return (
    <Box
      cursor="grabbing"
      position="relative"
      borderRadius="md"
      minW="250px"
      py={2}
      px={3}
      bgColor="bg.default"
      opacity={0.95}
      shadow="lg"
      overflow="hidden"
    >
      <ItemColorBar item={item} />
      <HStack gap={2} alignItems="flex-start">
        <Box flexShrink={0} pt={0.5}>
          <MdDragIndicator size={16} />
        </Box>
        <ItemSummary item={item} />
      </HStack>
    </Box>
  );
}

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } })
};

const measuring = {
  droppable: { strategy: MeasuringStrategy.WhileDragging },
  draggable: { measure: (element: HTMLElement) => element.getBoundingClientRect() }
};

function SideDrawer({
  side,
  open,
  onOpenChange,
  title,
  children
}: {
  side: 'left' | 'right';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <Drawer.Root
      variant={side}
      open={open}
      onOpenChange={(d) => onOpenChange(d.open)}
      lazyMount
      unmountOnExit
    >
      <Drawer.Backdrop />
      <Drawer.Positioner>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>{title}</Drawer.Title>
          </Drawer.Header>
          <Drawer.Body>{children}</Drawer.Body>
        </Drawer.Content>
      </Drawer.Positioner>
    </Drawer.Root>
  );
}

function StatsBox({ items }: { items: PredictionItem[] }) {
  const { t } = useTranslation();
  const songs = items.filter(isSongRow).length;
  const mcs = items.filter((i) => i.type === 'mc').length;
  const catalog = items.flatMap((i) => (i.type === 'song' ? [i.songId] : []));
  const performed = catalog.filter((id) => performedSongIds.has(id)).length;
  const neverPerformed = catalog.length - performed;
  const custom = songs - catalog.length;

  return (
    <Box data-builder-stats borderRadius="md" borderWidth="1px" p={3} bgColor="bg.muted">
      <Stack gap={1}>
        <Text fontSize="sm" fontWeight="medium">
          {t('builder.stats', { defaultValue: 'Stats' })}
        </Text>
        <Text fontSize="xs">
          {t('builder.songCount', { count: songs, defaultValue: `${songs} songs` })}
        </Text>
        <Text fontSize="xs">
          {t('builder.mcCount', { count: mcs, defaultValue: `${mcs} MCs` })}
        </Text>
        <Text fontSize="xs">
          {t('builder.performedBefore', {
            count: performed,
            defaultValue: `${performed} performed at a past live`
          })}
        </Text>
        <Text fontSize="xs">
          {t('builder.neverPerformed', {
            count: neverPerformed,
            defaultValue: `${neverPerformed} never performed live`
          })}
        </Text>
        {custom > 0 && (
          <Text fontSize="xs">
            {t('builder.customCount', { count: custom, defaultValue: `${custom} custom songs` })}
          </Text>
        )}
      </Stack>
    </Box>
  );
}

function ActionsPanel({
  prediction,
  onSaveNow
}: {
  prediction: SekaiPrediction;
  onSaveNow: () => void;
}) {
  const { t } = useTranslation();
  const live = getSekaiLive(prediction.live);
  return (
    <Stack gap={4}>
      <StatsBox items={prediction.items} />
      {live && live.performances.length > 0 && (
        <Button asChild variant="outline">
          <a
            href={markHref({ prediction: prediction.id, live: live.id })}
            onClick={() => onSaveNow()}
          >
            <BiCheckDouble />{' '}
            {t('builder.markAgainst', { defaultValue: 'Mark against the real setlist' })}
          </a>
        </Button>
      )}
      <ExportShareTools prediction={prediction} />
      <Box borderRadius="md" borderWidth="1px" p={3} bgColor="bg.emphasized">
        <Text color="fg.muted" fontSize="xs">
          {t('builder.help', {
            defaultValue:
              'Drag songs from the left panel to build your prediction, and drag rows to reorder them. Songs after the ENCORE divider are the encore. Changes are saved automatically in this browser.'
          })}
        </Text>
      </Box>
    </Stack>
  );
}

export function PredictionBuilder({ prediction, onChange, onSaveNow }: PredictionBuilderProps) {
  const { t } = useTranslation();
  const items = prediction.items;
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingId, setEditingId] = useState<string>();
  const editing = items.find((i) => i.id === editingId);
  const [active, setActive] = useState<DragData>();
  const [overId, setOverId] = useState<string>();

  const setItems = useCallback(
    (fn: (items: PredictionItem[]) => PredictionItem[]) =>
      onChange((p) => ({ ...p, items: fn(p.items) })),
    [onChange]
  );
  const insertAt = useCallback(
    (item: PredictionItem, at?: number) =>
      setItems((list) => {
        const i = at ?? list.length;
        return [...list.slice(0, i), item, ...list.slice(i)];
      }),
    [setItems]
  );
  const addSong = useCallback(
    (songId: string, at?: number) => insertAt({ id: itemId(), type: 'song', songId }, at),
    [insertAt]
  );
  const addCustomSong = useCallback(
    (name: string) => insertAt({ id: itemId(), type: 'custom', name }),
    [insertAt]
  );
  const addQuickItem = useCallback(
    (type: QuickAddType, at?: number) => insertAt(newQuickAddItem(type), at),
    [insertAt]
  );
  const removeItem = (id: string) => setItems((list) => list.filter((i) => i.id !== id));
  const move = (from: number, to: number) =>
    setItems((list) => (to < 0 || to >= list.length ? list : arrayMove(list, from, to)));
  const clear = () => {
    if (items.length === 0) return;
    if (
      !window.confirm(
        t('builder.confirmClear', { defaultValue: 'Remove every row from this setlist?' })
      )
    )
      return;
    setItems(() => []);
  };
  const replaceItem = (item: PredictionItem) =>
    setItems((list) => list.map((i) => (i.id === item.id ? item : i)));
  const setVersion = (id: string, version: SongVersion) =>
    setItems((list) =>
      list.map((i) =>
        i.id === id && i.type === 'song'
          ? songItem(i.id, i.songId, i.remarks, version === 'virtual_singer')
          : i
      )
    );

  // Where a search result / quick-add row would land: above the row it's over, or after the
  // last row over the end zones. Reorders get their feedback from the sortable list itself.
  const dropIndicator = useMemo((): DropIndicator | null => {
    if (!active || !overId || active.type === 'setlist-item') return null;
    const item = draggedItem(active)!;
    if (isEndZone(overId))
      return { itemId: items.at(-1)?.id, position: 'bottom', draggedItem: item };
    return items.some((i) => i.id === overId)
      ? { itemId: overId, position: 'top', draggedItem: item }
      : null;
  }, [active, overId, items]);

  const handleDragStart = (e: DragStartEvent) => setActive(e.active.data.current as DragData);
  const handleDragOver = (e: DragOverEvent) => setOverId(e.over ? String(e.over.id) : undefined);
  const handleDragEnd = ({ active: a, over }: DragEndEvent) => {
    setActive(undefined);
    setOverId(undefined);
    if (!over) return;
    const data = a.data.current as DragData | undefined;
    const overIndex = items.findIndex((i) => i.id === over.id);
    const at = isEndZone(over.id) || overIndex === -1 ? items.length : overIndex;
    if (data?.type === 'search-result') addSong(data.songId, at);
    else if (data?.type === 'quick-add-item') addQuickItem(data.itemType, at);
    else if (data?.type === 'setlist-item') {
      const from = items.findIndex((i) => i.id === data.item.id);
      if (from !== -1 && overIndex !== -1 && from !== overIndex) move(from, overIndex);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 0, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const searchAndQuickAdd = (idSuffix: string) => (
    <Stack gap={3}>
      <SongSearchPanel
        idPrefix={`search-${idSuffix}`}
        onAddSong={addSong}
        onAddCustomSong={addCustomSong}
      />
      <Stack gap={2}>
        <Text fontSize="sm" fontWeight="medium">
          {t('builder.quickAdd', { defaultValue: 'Quick add' })}
        </Text>
        <Text color="fg.muted" fontSize="xs">
          {t('builder.quickAddHint', {
            defaultValue: 'Drag into the setlist, or double-click to add to the bottom'
          })}
        </Text>
        {QUICK_ADD_TYPES.map((type) => (
          <DraggableQuickAddItem
            key={type}
            type={type}
            idSuffix={idSuffix}
            onAdd={() => addQuickItem(type)}
          />
        ))}
      </Stack>
    </Stack>
  );

  const songSearchLabel = t('builder.songSearch', { defaultValue: 'Song search' });
  const actionsLabel = t('builder.actions', { defaultValue: 'Actions' });

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActive(undefined);
        setOverId(undefined);
      }}
      measuring={measuring}
    >
      <Stack gap={0} w="full" h="full">
        {/* Name bar */}
        <Box
          zIndex={20}
          position="sticky"
          top={0}
          borderBottomWidth="1px"
          p={{ base: 2, md: 4 }}
          bgColor="bg.muted"
        >
          <HStack gap={2} alignItems="center">
            <IconButton
              variant="ghost"
              size="sm"
              onClick={() => setLeftOpen(true)}
              aria-label={songSearchLabel}
              hideFrom="md"
            >
              <BiPlus size={20} />
            </IconButton>
            <Input
              value={prediction.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const name = e.target.value;
                onChange((p) => ({ ...p, name }));
              }}
              placeholder={t('builder.namePlaceholder', { defaultValue: 'Name your prediction…' })}
              aria-label={t('builder.nameLabel', { defaultValue: 'Prediction name' })}
              size={{ base: 'sm', md: 'md' }}
              flex={1}
            />
            <Button variant="outline" onClick={() => setImportOpen(true)} hideBelow="md">
              <BiImport /> {t('builder.import', { defaultValue: 'Import' })}
            </Button>
            <Button variant="subtle" onClick={clear} disabled={!items.length} hideBelow="md">
              {t('builder.clear', { defaultValue: 'Clear' })}
            </Button>
            <Button
              variant="outline"
              onClick={() => setRightOpen(true)}
              hideFrom="lg"
              hideBelow="md"
            >
              <BiSlider /> {actionsLabel}
            </Button>
            <Box hideFrom="md">
              <Menu.Root
                positioning={{ placement: 'bottom-end' }}
                onSelect={({ value }) =>
                  value === 'clear'
                    ? clear()
                    : value === 'import'
                      ? setImportOpen(true)
                      : setRightOpen(true)
                }
              >
                <Menu.Trigger asChild>
                  <IconButton
                    variant="ghost"
                    size="sm"
                    aria-label={t('builder.more', { defaultValue: 'More' })}
                  >
                    <BiDotsVerticalRounded size={20} />
                  </IconButton>
                </Menu.Trigger>
                <Menu.Positioner>
                  <Menu.Content>
                    <Menu.Item value="actions">{actionsLabel}</Menu.Item>
                    <Menu.Item value="import">
                      {t('builder.import', { defaultValue: 'Import' })}
                    </Menu.Item>
                    <Menu.Item value="clear" color="fg.error">
                      {t('builder.clear', { defaultValue: 'Clear' })}
                    </Menu.Item>
                  </Menu.Content>
                </Menu.Positioner>
              </Menu.Root>
            </Box>
          </HStack>
        </Box>

        <HStack
          position="relative"
          flex={1}
          gap={0}
          alignItems="stretch"
          minH={0}
          overflow="hidden"
        >
          {/* Left: song search + Quick Add */}
          <Box
            data-builder-panel="search"
            hideBelow="md"
            flexShrink={0}
            borderRightWidth="1px"
            w="300px"
            p={4}
            bgColor="bg.default"
            overflow="auto"
          >
            {searchAndQuickAdd('panel')}
          </Box>
          <SideDrawer
            side="left"
            open={leftOpen}
            onOpenChange={setLeftOpen}
            title={songSearchLabel}
          >
            {searchAndQuickAdd('drawer')}
          </SideDrawer>

          {/* Centre: the setlist */}
          <Box flex={1} minW={0} bgColor="bg.subtle" overflow="auto">
            <SetlistEditorPanel
              items={items}
              onRemove={removeItem}
              onMoveUp={(i) => move(i, i - 1)}
              onMoveDown={(i) => move(i, i + 1)}
              onEdit={setEditingId}
              onVersionChange={setVersion}
              onOpenImport={() => setImportOpen(true)}
              dropIndicator={dropIndicator}
            />
            <Box hideFrom="md" zIndex={100} position="fixed" right={6} bottom={6}>
              <IconButton
                size="lg"
                onClick={() => setAddOpen(true)}
                aria-label={t('builder.addItem', { defaultValue: 'Add item' })}
                borderRadius="full"
                color="accent.fg"
                bgColor="accent.default"
                shadow="lg"
                _hover={{ bgColor: 'accent.emphasized' }}
              >
                <BiPlus size={24} />
              </IconButton>
            </Box>
          </Box>

          {/* Right: stats and actions */}
          <Box
            data-builder-panel="actions"
            hideBelow="lg"
            flexShrink={0}
            borderLeftWidth="1px"
            w="300px"
            p={4}
            bgColor="bg.default"
            overflow="auto"
          >
            <Stack gap={4}>
              <Text fontSize="lg" fontWeight="bold">
                {actionsLabel}
              </Text>
              <ActionsPanel prediction={prediction} onSaveNow={onSaveNow} />
            </Stack>
          </Box>
          <SideDrawer
            side="right"
            open={rightOpen}
            onOpenChange={setRightOpen}
            title={actionsLabel}
          >
            <ActionsPanel prediction={prediction} onSaveNow={onSaveNow} />
          </SideDrawer>
        </HStack>
      </Stack>

      <DragOverlay dropAnimation={dropAnimation}>
        {active ? <DragPreview item={draggedItem(active)} /> : null}
      </DragOverlay>

      <AddItemDrawer
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        onAddSong={addSong}
        onAddCustomSong={addCustomSong}
        onAddQuickItem={addQuickItem}
      />

      {editing && (
        <EditItemDialog
          key={editing.id}
          open
          onOpenChange={(open) => !open && setEditingId(undefined)}
          item={editing}
          onSave={replaceItem}
        />
      )}
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={(imported) => setItems(() => imported)}
        liveId={prediction.live}
      />
    </DndContext>
  );
}
