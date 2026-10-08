import { useState } from 'react';
import { BiMusic } from 'react-icons/bi';
import { Box } from 'styled-system/jsx';
import { cva } from 'styled-system/css';
import type { SekaiLive } from '~/types/sekai';
import { getLiveImage } from '~/utils/sekai-setlist/live-data';

export type LiveVisualSize = 'compact' | 'thumb' | 'poster' | 'banner';

interface LiveVisualProps {
  live: SekaiLive;
  size?: LiveVisualSize;
  alt?: string;
  linkable?: boolean;
}

const SERIES_GRADIENTS: Record<string, string> = {
  colorful_live: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
  thanks_festival: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
  fan_meeting: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
  connect_live: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
  sekai_symphony: 'linear-gradient(135deg, #db2777 0%, #ec4899 100%)'
};

const DEFAULT_GRADIENT = 'linear-gradient(135deg, #475569 0%, #64748b 100%)';

const visualContainer = cva({
  base: {
    position: 'relative',
    flexShrink: 0,
    aspectRatio: '16/9',
    borderColor: 'border.subtle',
    borderWidth: '1px',
    backgroundColor: 'bg.subtle',
    overflow: 'hidden'
  },
  variants: {
    size: {
      compact: {
        borderRadius: 'md',
        width: { base: '56px', sm: '72px' }
      },
      thumb: {
        borderRadius: 'md',
        width: { base: '80px', sm: '112px', md: '136px' }
      },
      poster: {
        borderRadius: 'xl',
        width: { base: '100%', md: '280px', lg: '320px' },
        boxShadow: 'sm'
      },
      banner: {
        borderRadius: 'xl',
        width: '100%',
        boxShadow: 'sm'
      }
    },
    linkable: {
      true: {
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        _hover: {
          transform: 'scale(1.02)',
          boxShadow: 'md'
        }
      }
    }
  },
  defaultVariants: {
    size: 'thumb'
  }
});

/**
 * Key visual poster / thumbnail for Project Sekai live concerts.
 * Loads optimized visual assets with referer protection and graceful fallback.
 */
export function LiveVisual({ live, size = 'thumb', alt, linkable = false }: LiveVisualProps) {
  const [broken, setBroken] = useState(false);
  const imageUrl = broken ? undefined : getLiveImage(live);
  const gradient = SERIES_GRADIENTS[live.series] ?? DEFAULT_GRADIENT;

  const content = imageUrl ? (
    <img
      src={imageUrl}
      alt={alt ?? live.name}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        display: 'block'
      }}
    />
  ) : (
    <Box
      data-live-visual-fallback
      aria-hidden
      style={{
        width: '100%',
        height: '100%',
        background: gradient,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff'
      }}
    >
      <BiMusic size={size === 'poster' || size === 'banner' ? 36 : 18} />
    </Box>
  );

  const container = (
    <div data-live-visual className={visualContainer({ size, linkable })}>
      {content}
    </div>
  );

  if (linkable && imageUrl) {
    return (
      <a
        href={imageUrl}
        target="_blank"
        rel="noopener noreferrer"
        title={live.name}
        style={{ display: 'inline-block', flexShrink: 0, textDecoration: 'none' }}
      >
        {container}
      </a>
    );
  }

  return container;
}
