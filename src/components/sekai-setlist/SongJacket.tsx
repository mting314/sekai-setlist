import { useState } from 'react';
import { Box } from 'styled-system/jsx';
import { colorBarBackground, getSekaiSong, sekaiSongColors } from '~/utils/sekai-setlist/catalog';
import { jacketUrl } from '~/utils/sekai-setlist/assets';

/**
 * Square song thumbnail: the sekai.best jacket, falling back to a unit-colored tile when the
 * song has no art or the image fails to load.
 */
export function SongJacket({ id, size = 44 }: { id: string; size?: number }) {
  const [broken, setBroken] = useState(false);
  const url = broken ? undefined : jacketUrl(getSekaiSong(id)?.assetbundleName);

  if (url) {
    return (
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        // sekai.best 403s requests that carry a third-party Referer.
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        style={{ flexShrink: 0, borderRadius: '6px', objectFit: 'cover' }}
      />
    );
  }
  return (
    <Box
      aria-hidden
      style={{ width: size, height: size, background: colorBarBackground(sekaiSongColors(id)) }}
      flexShrink={0}
      rounded="md"
    />
  );
}
