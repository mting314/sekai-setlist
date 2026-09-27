/**
 * Small per-song decorations shared by the search dialog, setlist rows and song pages:
 * commissioned/cover badge, unit badges and the vocalist character icons.
 */
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { HStack, styled } from 'styled-system/jsx';
import { Badge } from '~/components/ui/styled/badge';
import {
  getSekaiSong,
  getSekaiUnit,
  sekaiCharacterName,
  sekaiUnitColor
} from '~/utils/sekai-setlist/catalog';
import { characterIconUrl, unitIconUrl } from '~/utils/sekai-setlist/assets';
import { unitHref } from '~/utils/sekai-setlist/routes';

const unitPill = {
  base: {
    display: 'inline-flex',
    gap: '1.5',
    flexShrink: 0,
    alignItems: 'center',
    borderColor: 'var(--unit-color)',
    borderRadius: 'full',
    borderWidth: '1px',
    py: '0.5',
    px: '2',
    fontSize: 'xs',
    fontWeight: 'semibold',
    whiteSpace: 'nowrap'
  }
} as const;
const UnitPill = styled('span', unitPill);
const UnitPillLink = styled('a', {
  base: {
    ...unitPill.base,
    _hover: { color: '#111', bgColor: 'var(--unit-color)' },
    '&[aria-current=page]': { color: '#111', bgColor: 'var(--unit-color)' }
  }
});

/** A unit (or "Other") as a pill in its unit color; `link` makes it go to the unit page. */
export function UnitBadge({
  unit,
  link,
  current
}: {
  unit: string;
  link?: boolean;
  current?: boolean; // the unit page being viewed
}) {
  const { t } = useTranslation();
  const content = (
    <>
      {unit !== 'other' && (
        <img
          src={unitIconUrl(unit)}
          alt=""
          width={14}
          height={14}
          style={{ objectFit: 'contain' }}
        />
      )}
      {t(`sekaiSetlist.units.${unit}`, { defaultValue: getSekaiUnit(unit)?.name ?? unit })}
    </>
  );
  const style = { '--unit-color': sekaiUnitColor(unit) } as CSSProperties;
  return link ? (
    <UnitPillLink href={unitHref(unit)} style={style} aria-current={current ? 'page' : undefined}>
      {content}
    </UnitPillLink>
  ) : (
    <UnitPill style={style}>{content}</UnitPill>
  );
}

export function KindBadge({ commissioned }: { commissioned: boolean }) {
  const { t } = useTranslation();
  return (
    <Badge
      title={
        commissioned
          ? t('sekaiSetlist.commissionedHint', {
              defaultValue: 'Commissioned — written for Project Sekai'
            })
          : t('sekaiSetlist.coverHint', { defaultValue: 'Cover of an existing song' })
      }
      variant={commissioned ? 'solid' : 'outline'}
      size="sm"
      flexShrink={0}
    >
      {commissioned
        ? t('sekaiSetlist.commissioned', { defaultValue: 'Commissioned' })
        : t('sekaiSetlist.cover', { defaultValue: 'Cover' })}
    </Badge>
  );
}

/** Vocalist icons for a song (game characters from musicVocals), overlapping when crowded. */
export function VocalistIcons({
  id,
  size = 20,
  max = 6
}: {
  id: string;
  size?: number;
  max?: number;
}) {
  const { i18n } = useTranslation();
  const characters = getSekaiSong(id)?.characters ?? [];
  if (characters.length === 0) return null;
  const shown = characters.slice(0, max);
  const hidden = characters.length - shown.length;
  const names = characters.map((c) => sekaiCharacterName(c, i18n.language)).join(', ');

  return (
    <HStack title={names} gap={0} flexShrink={0}>
      {shown.map((c, i) => (
        <img
          key={c}
          src={characterIconUrl(c)}
          alt={sekaiCharacterName(c, i18n.language)}
          width={size}
          height={size}
          loading="lazy"
          style={{ marginLeft: i === 0 ? 0 : -size / 4, borderRadius: '9999px' }}
        />
      ))}
      {hidden > 0 && (
        <span style={{ marginLeft: 2, fontSize: '0.7rem', opacity: 0.7 }}>+{hidden}</span>
      )}
    </HStack>
  );
}
