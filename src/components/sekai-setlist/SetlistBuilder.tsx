/**
 * Sekai setlist builder — a controlled component with two modes (mirrors the ll-predictions
 * builder, minus cross-series collab guests, which Sekai setlists don't use):
 *   • BAG mode   (ordered=false): unordered Main set / ✦ Encore lists, per-song encore toggle.
 *   • ORDER mode (ordered=true):  drag-reorder list with a single ✦ Encore divider; songs
 *     at/after the divider are the encore (contiguous trailing block).
 * All structure lives in the wire shape (songs[] + encore positions); the pure helpers in
 * utils/sekai-setlist/setlist-items own the mode conversions.
 */
import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BiPlus, BiStar, BiSolidStar, BiX } from 'react-icons/bi';
import { MdDragIndicator } from 'react-icons/md';
import { Box, HStack, Stack } from 'styled-system/jsx';
import { SongJacket } from './SongJacket';
import { KindBadge, VocalistIcons } from './SongMeta';
import { SongSearchDialog } from './SongSearchDialog';
import { Button } from '~/components/ui/styled/button';
import { IconButton } from '~/components/ui/styled/icon-button';
import { Text } from '~/components/ui/styled/text';
import { Switch } from '~/components/ui/switch';
import {
  getSekaiSong,
  sekaiSongColors,
  sekaiSongName,
  colorBarBackground
} from '~/utils/sekai-setlist/catalog';
import {
  predictionToItems,
  itemsToPrediction,
  enterOrdered,
  leaveOrdered,
  dividerToFlags,
  type SetlistItem
} from '~/utils/sekai-setlist/setlist-items';

export interface SetlistBuilderProps {
  songs: string[];
  encore: number[];
  ordered: boolean;
  maxSongs?: number;
  onChange: (songs: string[], encore: number[], ordered: boolean) => void;
}

const DIVIDER = '__divider__';
// A song token carries its position in `items`; `key` is `song:<id>:<nth occurrence>` so the
// same song can appear twice (e.g. an encore reprise) without colliding dnd-kit ids.
type Token = { kind: 'song'; id: string; pos: number; key: string } | { kind: 'divider' };
const tokenKey = (t: Token) => (t.kind === 'divider' ? DIVIDER : t.key);

export function SetlistBuilder({
  songs,
  encore,
  ordered,
  maxSongs = 50,
  onChange
}: SetlistBuilderProps) {
  const { t } = useTranslation();
  const [searchOpen, setSearchOpen] = useState(false);
  const items = predictionToItems({ songs, guests: {}, encore, ordered });
  const full = items.length >= maxSongs;
  const addedIds = useMemo(() => new Set(songs), [songs]);

  // Serialize items → wire shape and bubble up.
  const emit = (next: SetlistItem[], nextOrdered: boolean) => {
    const wire = itemsToPrediction(next);
    onChange(wire.songs, wire.encore, nextOrdered);
  };

  const setOrdered = (next: boolean) =>
    emit(next ? enterOrdered(items) : leaveOrdered(items), next);

  const addSong = (id: string) => {
    if (full) return;
    emit([...items, { songId: id, guests: [], encore: false }], ordered);
  };
  const removeAt = (i: number) =>
    emit(
      items.filter((_, idx) => idx !== i),
      ordered
    );
  const toggleEncoreAt = (i: number) =>
    emit(
      items.map((it, idx) => (idx === i ? { ...it, encore: !it.encore } : it)),
      ordered
    );

  return (
    <Stack gap={4}>
      <HStack gap={3} justifyContent="space-between" flexWrap="wrap">
        <HStack gap={3}>
          <Button size="sm" disabled={full} onClick={() => setSearchOpen(true)}>
            <BiPlus /> {t('sekaiSetlist.addSongs', { defaultValue: 'Add songs' })}
          </Button>
          <Text color="fg.muted" fontSize="sm">
            {t('sekaiSetlist.songCount', {
              count: items.length,
              max: maxSongs,
              defaultValue: `${items.length}/${maxSongs} songs`
            })}
          </Text>
        </HStack>
        <Switch checked={ordered} onCheckedChange={(e) => setOrdered(e.checked)}>
          {t('sekaiSetlist.orderedToggle', { defaultValue: 'Exact order (drag to reorder)' })}
        </Switch>
      </HStack>

      {items.length === 0 ? (
        <EmptyHint onAdd={() => setSearchOpen(true)} />
      ) : ordered ? (
        <OrderMode items={items} onReorder={emit} onRemove={removeAt} />
      ) : (
        <BagMode items={items} onRemove={removeAt} onToggleEncore={toggleEncoreAt} />
      )}

      <SongSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onPick={addSong}
        addedIds={addedIds}
      />
    </Stack>
  );
}

function EmptyHint({ onAdd }: { onAdd: () => void }) {
  const { t } = useTranslation();
  return (
    <Box
      onClick={onAdd}
      cursor="pointer"
      borderColor="border.default"
      borderRadius="xl"
      borderWidth="2px"
      p={10}
      color="fg.muted"
      textAlign="center"
      borderStyle="dashed"
      _hover={{ borderColor: 'border.accent', color: 'fg.default' }}
    >
      {t('sekaiSetlist.empty', {
        defaultValue: 'No songs yet — click “Add songs” to start building your setlist.'
      })}
    </Box>
  );
}

/* ---------- BAG mode ---------- */

function BagMode({
  items,
  onRemove,
  onToggleEncore
}: {
  items: SetlistItem[];
  onRemove: (i: number) => void;
  onToggleEncore: (i: number) => void;
}) {
  const { t } = useTranslation();
  const rows = items.map((it, i) => ({ it, i }));
  const section = (title: string, sectionRows: { it: SetlistItem; i: number }[]) => (
    <Stack gap={2}>
      <SectionLabel>{title}</SectionLabel>
      {sectionRows.length === 0 ? (
        <Text color="fg.subtle" fontSize="sm" fontStyle="italic">
          —
        </Text>
      ) : (
        <Stack gap={1.5}>
          {sectionRows.map(({ it, i }) => (
            <SongRow
              key={`${it.songId}-${i}`}
              id={it.songId}
              right={
                <>
                  <IconButton
                    variant="ghost"
                    size="xs"
                    aria-label={
                      it.encore
                        ? t('sekaiSetlist.moveToMain', { defaultValue: 'Move to main set' })
                        : t('sekaiSetlist.moveToEncore', { defaultValue: 'Move to encore' })
                    }
                    title={
                      it.encore
                        ? t('sekaiSetlist.moveToMain', { defaultValue: 'Move to main set' })
                        : t('sekaiSetlist.moveToEncore', { defaultValue: 'Move to encore' })
                    }
                    onClick={() => onToggleEncore(i)}
                  >
                    {it.encore ? <BiSolidStar /> : <BiStar />}
                  </IconButton>
                  <RemoveButton onClick={() => onRemove(i)} />
                </>
              }
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
  return (
    <Stack gap={5}>
      {section(
        t('sekaiSetlist.mainSet', { defaultValue: 'Main set' }),
        rows.filter(({ it }) => !it.encore)
      )}
      {section(
        t('sekaiSetlist.encore', { defaultValue: '✦ Encore' }),
        rows.filter(({ it }) => it.encore)
      )}
    </Stack>
  );
}

/* ---------- ORDER mode ---------- */

function OrderMode({
  items,
  onReorder,
  onRemove
}: {
  items: SetlistItem[];
  onReorder: (next: SetlistItem[], ordered: boolean) => void;
  onRemove: (i: number) => void;
}) {
  // Songs, with a single divider before the first encore song (or at the end when there's no
  // encore, so the user can drag songs below it to create one).
  const firstEnc = items.findIndex((it) => it.encore);
  const seen = new Map<string, number>();
  const tokens: Token[] = [];
  items.forEach((it, i) => {
    if (i === firstEnc) tokens.push({ kind: 'divider' });
    const nth = seen.get(it.songId) ?? 0;
    seen.set(it.songId, nth + 1);
    tokens.push({ kind: 'song', id: it.songId, pos: i, key: `song:${it.songId}:${nth}` });
  });
  if (firstEnc === -1) tokens.push({ kind: 'divider' });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const keys = tokens.map(tokenKey);
    const from = keys.indexOf(String(active.id));
    const to = keys.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    const moved = arrayMove(tokens, from, to);
    const dividerPos = moved.findIndex((tk) => tk.kind === 'divider');
    const songsBefore = moved.slice(0, dividerPos).filter((tk) => tk.kind === 'song').length;
    const newItems: SetlistItem[] = moved
      .filter((tk) => tk.kind === 'song')
      .map((tk) => ({ songId: tk.id, guests: [], encore: false }));
    onReorder(dividerToFlags(newItems, songsBefore), true);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={tokens.map(tokenKey)} strategy={verticalListSortingStrategy}>
        <Stack gap={1.5}>
          {tokens.map((tk) =>
            tk.kind === 'divider' ? (
              <SortableDivider key={DIVIDER} />
            ) : (
              <SortableSong key={tk.key} token={tk} onRemove={onRemove} />
            )
          )}
        </Stack>
      </SortableContext>
    </DndContext>
  );
}

function SortableSong({
  token,
  onRemove
}: {
  token: Extract<Token, { kind: 'song' }>;
  onRemove: (i: number) => void;
}) {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: token.key });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1
      }}
    >
      <SongRow
        id={token.id}
        left={
          <HStack gap={1} flexShrink={0}>
            <Box
              ref={setActivatorNodeRef}
              {...attributes}
              {...listeners}
              aria-label={t('sekaiSetlist.dragToReorder', { defaultValue: 'Drag to reorder' })}
              style={{ touchAction: 'none' }}
              cursor="grab"
              color="fg.subtle"
              _hover={{ color: 'fg.muted' }}
            >
              <MdDragIndicator size={18} />
            </Box>
            <Text w="5" color="fg.subtle" fontSize="xs" textAlign="right">
              {token.pos + 1}
            </Text>
          </HStack>
        }
        right={<RemoveButton onClick={() => onRemove(token.pos)} />}
      />
    </div>
  );
}

function SortableDivider() {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: DIVIDER
  });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}>
      <HStack
        {...attributes}
        {...listeners}
        style={{ touchAction: 'none' }}
        cursor="grab"
        gap={2}
        borderRadius="md"
        py={1.5}
        px={2}
        color="accent.fg"
        fontSize="xs"
        fontWeight="bold"
        letterSpacing="0.06em"
        textTransform="uppercase"
        bgColor="accent.default"
      >
        <BiSolidStar />
        {t('sekaiSetlist.encoreDivider', { defaultValue: 'Encore — drag songs below this line' })}
      </HStack>
    </div>
  );
}

/* ---------- shared bits ---------- */

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <Text
      color="fg.muted"
      fontSize="xs"
      fontWeight="bold"
      letterSpacing="0.05em"
      textTransform="uppercase"
    >
      {children}
    </Text>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <IconButton
      variant="ghost"
      size="xs"
      aria-label={t('sekaiSetlist.remove', { defaultValue: 'Remove' })}
      title={t('sekaiSetlist.remove', { defaultValue: 'Remove' })}
      onClick={onClick}
    >
      <BiX />
    </IconButton>
  );
}

function SongRow({ id, left, right }: { id: string; left?: ReactNode; right?: ReactNode }) {
  const { i18n } = useTranslation();
  const song = getSekaiSong(id);
  return (
    <HStack
      data-song-id={id}
      position="relative"
      gap={2}
      borderColor="border.subtle"
      borderRadius="lg"
      borderWidth="1px"
      py={1.5}
      pl={2.5}
      pr={1}
      bgColor="bg.default"
      overflow="hidden"
    >
      <Box
        aria-hidden
        style={{ background: colorBarBackground(sekaiSongColors(id)) }}
        position="absolute"
        top={0}
        left={0}
        bottom={0}
        w="4px"
      />
      {left}
      <SongJacket id={id} size={40} />
      <Stack flex={1} gap={0.5} minW={0}>
        <Text
          fontSize="sm"
          fontWeight="medium"
          textOverflow="ellipsis"
          overflow="hidden"
          whiteSpace="nowrap"
        >
          {sekaiSongName(id, i18n.language)}
        </Text>
        <HStack gap={2} minW={0}>
          <VocalistIcons id={id} size={16} />
          {song && <KindBadge commissioned={song.commissioned} />}
        </HStack>
      </Stack>
      <HStack gap={0} flexShrink={0}>
        {right}
      </HStack>
    </HStack>
  );
}
