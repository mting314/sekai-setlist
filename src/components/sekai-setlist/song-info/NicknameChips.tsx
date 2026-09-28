/**
 * Event nicknames ("saki1", "wl3-4") as small chips tinted with the song's unit colour. Fans
 * name event songs after their event, so these sit next to song titles everywhere.
 */
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from 'styled-system/jsx';
import { getSekaiSong, sekaiSongColors } from '~/utils/sekai-setlist/catalog';

const Chip = styled('span', {
  base: {
    display: 'inline-flex',
    flexShrink: 0,
    alignItems: 'center',
    borderColor: 'var(--chip-color)',
    borderRadius: 'sm',
    borderWidth: '1px',
    px: '1',
    color: 'fg.default',
    fontSize: 'xs',
    fontWeight: 'bold',
    lineHeight: '1.3',
    bgColor: 'color-mix(in srgb, var(--chip-color) 20%, transparent)',
    whiteSpace: 'nowrap'
  }
});

export function NicknameChip({ nickname, songId }: { nickname: string; songId: string }) {
  const { t } = useTranslation();
  return (
    <Chip
      data-nickname={nickname}
      title={t('songInfo.eventSong', { defaultValue: 'Event song' })}
      style={{ '--chip-color': sekaiSongColors(songId)[0] } as CSSProperties}
    >
      {nickname}
    </Chip>
  );
}

/** The song's event nicknames, or nothing when it wasn't an event song. */
export function NicknameChips({ songId }: { songId: string }) {
  const nicknames = getSekaiSong(songId)?.nicknames;
  if (!nicknames?.length) return null;
  return (
    <>
      {nicknames.map((n) => (
        <NicknameChip key={n} nickname={n} songId={songId} />
      ))}
    </>
  );
}
