/**
 * Small per-song decorations shared by the search dialog and the setlist rows:
 * commissioned/cover badge and the vocalist character icons.
 */
import { useTranslation } from 'react-i18next';
import { HStack } from 'styled-system/jsx';
import { Badge } from '~/components/ui/styled/badge';
import { getSekaiSong, sekaiCharacterName } from '~/utils/sekai-setlist/catalog';
import { characterIconUrl } from '~/utils/sekai-setlist/assets';

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
