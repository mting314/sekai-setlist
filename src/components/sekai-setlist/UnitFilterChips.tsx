import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { HStack } from 'styled-system/jsx';
import { styled } from 'styled-system/jsx';
import { sekaiUnits } from '~/utils/sekai-setlist/catalog';
import { unitIconUrl } from '~/utils/sekai-setlist/assets';
import type { UnitFilter } from '~/utils/sekai-setlist/song-filter';

const Chip = styled('button', {
  base: {
    cursor: 'pointer',
    display: 'inline-flex',
    gap: '1.5',
    flexShrink: 0,
    alignItems: 'center',
    borderColor: 'var(--unit-color)',
    borderRadius: 'full',
    borderWidth: '1px',
    py: '1',
    px: '2.5',
    fontSize: 'xs',
    fontWeight: 'semibold',
    bgColor: 'transparent',
    whiteSpace: 'nowrap',
    '&[data-active=true]': { color: '#111', bgColor: 'var(--unit-color)' }
  }
});

/**
 * Unit filter chips (the six units plus "Other"), OR-ed together. A single horizontally
 * scrollable row so it never pushes the results list down on narrow screens.
 */
export function UnitFilterChips({
  selected,
  counts,
  onToggle
}: {
  selected: UnitFilter[];
  counts: Record<string, number>;
  onToggle: (unit: UnitFilter) => void;
}) {
  const { t } = useTranslation();
  return (
    <HStack gap="1.5" mx="-1" px="1" pb="1" overflowX="auto" flexWrap="nowrap">
      {sekaiUnits.map((u) => (
        <Chip
          key={u.id}
          type="button"
          data-active={selected.includes(u.id)}
          aria-pressed={selected.includes(u.id)}
          style={{ '--unit-color': u.color } as CSSProperties}
          onClick={() => onToggle(u.id)}
        >
          {u.id !== 'other' && (
            <img
              src={unitIconUrl(u.id)}
              alt=""
              width={16}
              height={16}
              style={{ objectFit: 'contain' }}
            />
          )}
          {t(`sekaiSetlist.units.${u.id}`, { defaultValue: u.name })} ({counts[u.id] ?? 0})
        </Chip>
      ))}
    </HStack>
  );
}
