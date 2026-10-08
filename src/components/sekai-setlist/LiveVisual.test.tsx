import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '~/__test__/utils';
import { LiveVisual } from './LiveVisual';
import { getLiveImage, getSekaiLive, sekaiLives } from '~/utils/sekai-setlist/live-data';
import type { SekaiLive } from '~/types/sekai';

describe('getLiveImage', () => {
  it('returns valid visual URL for live by ID and by object', () => {
    const live = getSekaiLive('project-sekai-colorful-live-1st-link')!;
    expect(live).toBeDefined();
    expect(live.image).toBeDefined();
    expect(getLiveImage('project-sekai-colorful-live-1st-link')).toBe(live.image);
    expect(getLiveImage(live)).toBe(live.image);
  });

  it('has key visual images configured for all sekai lives', () => {
    expect(sekaiLives.length).toBeGreaterThan(0);
    for (const live of sekaiLives) {
      const img = getLiveImage(live);
      expect(img).toBeDefined();
      expect(typeof img).toBe('string');
      expect(img!.length).toBeGreaterThan(10);
    }
  });

  it('returns undefined for unknown or undefined inputs', () => {
    expect(getLiveImage(undefined)).toBeUndefined();
    expect(getLiveImage('nonexistent-live-id')).toBeUndefined();
  });
});

describe('LiveVisual component', () => {
  const sampleLive = getSekaiLive('project-sekai-colorful-live-3rd-evolve')!;

  it('renders the live key visual image with referer protection and lazy loading', async () => {
    await render(<LiveVisual live={sampleLive} size="thumb" />);
    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', sampleLive.image);
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveAttribute('referrerPolicy', 'no-referrer');
  });

  it('renders a fallback icon if the image fails to load', async () => {
    const [{ container }] = await render(<LiveVisual live={sampleLive} size="thumb" />);
    const img = screen.getByRole('img');
    fireEvent.error(img);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(container.querySelector('[data-live-visual-fallback]')).toBeInTheDocument();
  });

  it('renders fallback placeholder immediately if live has no image', async () => {
    const liveWithoutImg: SekaiLive = {
      ...sampleLive,
      id: 'custom-live-without-image',
      image: undefined
    };
    const [{ container }] = await render(<LiveVisual live={liveWithoutImg} size="thumb" />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(container.querySelector('[data-live-visual-fallback]')).toBeInTheDocument();
  });

  it('wraps image in an external anchor when linkable is set', async () => {
    const [{ container }] = await render(<LiveVisual live={sampleLive} size="poster" linkable />);
    const link = container.querySelector('[data-live-visual]')?.closest('a');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', sampleLive.image);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
