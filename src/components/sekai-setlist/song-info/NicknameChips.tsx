/**
 * Event nicknames ("saki1", "wl3-4") as small chips tinted with the song's unit colour. Fans
 * name event songs after their event, so these sit next to song titles everywhere.
 */
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from 'styled-system/jsx';
import { getSekaiSong, sekaiSongColors } from '~/utils/sekai-setlist/catalog';
import { sekaiBestEventUrl } from '~/utils/sekai-setlist/song-events';

const chipBase = {
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
  whiteSpace: 'nowrap',
  textDecoration: 'none'
} as const;

const ChipLink = styled('a', {
  base: {
    ...chipBase,
    cursor: 'pointer',
    transition: 'background-color 0.15s, border-color 0.15s, transform 0.1s',
    _active: {
      transform: 'scale(0.96)'
    },
    _hover: {
      borderColor: 'var(--chip-color)',
      color: 'fg.default',
      textDecoration: 'none',
      bgColor: 'color-mix(in srgb, var(--chip-color) 35%, transparent)'
    }
  }
});

const ChipSpan = styled('span', { base: chipBase });

export function NicknameChip({
  nickname,
  songId,
  eventId
}: {
  nickname: string;
  songId: string;
  eventId?: number;
}) {
  const { t } = useTranslation();
  const resolvedEventId =
    eventId ??
    (() => {
      const song = getSekaiSong(songId);
      const idx = song?.nicknames?.indexOf(nickname);
      return idx != null && idx !== -1 ? song?.eventIds?.[idx] : undefined;
    })();

  const style = { '--chip-color': sekaiSongColors(songId)[0] } as CSSProperties;
  const title = resolvedEventId
    ? t('songInfo.viewEventOnSekaiBest', {
        nickname,
        defaultValue: `View event ${nickname} on sekai.best ↗`
      })
    : t('songInfo.eventSong', { defaultValue: 'Event song' });

  if (resolvedEventId) {
    return (
      <ChipLink
        href={sekaiBestEventUrl(resolvedEventId)}
        target="_blank"
        rel="noopener noreferrer"
        data-nickname={nickname}
        title={title}
        style={style}
        onClick={(e) => e.stopPropagation()}
      >
        {nickname}
      </ChipLink>
    );
  }

  return (
    <ChipSpan data-nickname={nickname} title={title} style={style}>
      {nickname}
    </ChipSpan>
  );
}

/** The song's event nicknames, or nothing when it wasn't an event song. */
export function NicknameChips({ songId }: { songId: string }) {
  const song = getSekaiSong(songId);
  const nicknames = song?.nicknames;
  if (!nicknames?.length) return null;
  return (
    <>
      {nicknames.map((n, i) => (
        <NicknameChip key={n} nickname={n} songId={songId} eventId={song?.eventIds?.[i]} />
      ))}
    </>
  );
}
