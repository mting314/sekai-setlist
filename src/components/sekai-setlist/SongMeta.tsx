/**
 * Small per-song decorations shared by the search dialog, setlist rows and song pages:
 * commissioned/cover badge, unit badges, the vocalist character icons and the version badge.
 */
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { HStack, styled } from 'styled-system/jsx';
import { Badge } from '~/components/ui/styled/badge';
import {
  getSekaiUnit,
  sekaiCharacterName,
  sekaiUnitColor,
  songVocalists
} from '~/utils/sekai-setlist/catalog';
import { characterIconUrl, unitIconUrl } from '~/utils/sekai-setlist/assets';
import { unitHref } from '~/utils/sekai-setlist/routes';
import type { SongVersion } from '~/types/sekai';

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

/**
 * "VS ver." for a row or performance that's the VIRTUAL SINGER ver.; nothing for the Sekai ver.,
 * which is the default.
 */
export function VersionBadge({ version }: { version?: SongVersion }) {
  const { t } = useTranslation();
  if (version !== 'virtual_singer') return null;
  return (
    <Badge
      data-version-badge
      title={t('version.virtualSinger', { defaultValue: 'VIRTUAL SINGER ver.' })}
      variant="outline"
      size="sm"
      flexShrink={0}
    >
      {t('version.vsShort', { defaultValue: 'VS ver.' })}
    </Badge>
  );
}

const VersionOption = styled('button', {
  base: {
    cursor: 'pointer',
    h: '6',
    px: '1.5',
    color: 'fg.muted',
    fontSize: 'xs',
    fontWeight: 'medium',
    '&:not([aria-pressed=true]):hover': { color: 'fg.default', bgColor: 'bg.muted' },
    '&[aria-pressed=true]': { cursor: 'default', color: 'bg.default', bgColor: 'fg.default' },
    '&:not(:first-child)': { borderLeftWidth: '1px' }
  }
});

/** A setlist row's Sekai ver. / VS ver. switch, for a song with both versions (`name`). */
export function VersionSwitch({
  name,
  version,
  onChange
}: {
  name: string;
  version?: SongVersion;
  onChange: (version: SongVersion) => void;
}) {
  const { t } = useTranslation();
  const current = version ?? 'sekai';
  const options: [SongVersion, string, string][] = [
    [
      'sekai',
      t('version.sekaiShort', { defaultValue: 'Sekai' }),
      t('version.sekai', { defaultValue: 'Sekai ver.' })
    ],
    [
      'virtual_singer',
      t('version.vsSwitch', { defaultValue: 'VS' }),
      t('version.virtualSinger', { defaultValue: 'VIRTUAL SINGER ver.' })
    ]
  ];
  return (
    <HStack
      role="group"
      aria-label={t('version.versionOf', { name, defaultValue: `Version: ${name}` })}
      data-version-switch={current}
      gap={0}
      flexShrink={0}
      borderRadius="sm"
      borderWidth="1px"
      overflow="hidden"
    >
      {options.map(([value, short, full]) => (
        <VersionOption
          key={value}
          type="button"
          data-version-option={value}
          aria-pressed={current === value}
          title={full}
          onClick={(e) => {
            e.stopPropagation();
            if (current !== value) onChange(value);
          }}
        >
          {short}
        </VersionOption>
      ))}
    </HStack>
  );
}

/** A song's vocalist icons: its Sekai ver. unless `version` is the VIRTUAL SINGER ver. */
export function VocalistIcons({
  id,
  version,
  ...rest
}: {
  id: string;
  version?: SongVersion;
  size?: number;
  max?: number;
}) {
  return <CharacterIcons characters={songVocalists(id, version)} {...rest} />;
}

/** Game-character icons, overlapping when crowded. */
export function CharacterIcons({
  characters,
  size = 20,
  max = 6
}: {
  characters: number[];
  size?: number;
  max?: number;
}) {
  const { i18n } = useTranslation();
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
