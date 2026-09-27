import { describe, expect, it } from 'vitest';
import { sekaiLives } from './live-data';
import { curatedShows, defaultShows, liveShows, showPerformance } from './shows';
import type { SekaiLive } from '~/types/sekai';

const live = (date: string, names: string[]): SekaiLive => ({
  id: 'x',
  series: 'colorful_live',
  name: 'X',
  date,
  startDate: '2024-01-26',
  notes: [],
  source: '',
  performances: names.map((name) => ({ name, songs: [], markers: [] }))
});

describe('defaultShows', () => {
  it('derives one show per setlist, dated only for single-day lives', () => {
    expect(
      defaultShows(live('June 15, 2024', ['Daytime Performance', 'Nighttime Performance']))
    ).toEqual([
      {
        id: 'daytime-performance',
        label: 'Daytime Performance',
        performance: 'Daytime Performance',
        date: '2024-01-26'
      },
      {
        id: 'nighttime-performance',
        label: 'Nighttime Performance',
        performance: 'Nighttime Performance',
        date: '2024-01-26'
      }
    ]);
    expect(defaultShows(live('January 26-28, 2024', ['']))).toEqual([
      { id: 'main', label: 'January 26-28, 2024', performance: '' }
    ]);
  });

  it('gives a live with no setlist a single main show with no performance', () => {
    const [show] = defaultShows(live('May 10, 2026', []));
    expect(show).toEqual({ id: 'main', label: 'May 10, 2026', date: '2024-01-26' });
    expect(showPerformance(live('May 10, 2026', []), show)).toBeUndefined();
  });

  it('keeps ids unique when names slug the same', () => {
    expect(defaultShows(live('x', ['', 'Main'])).map((s) => s.id)).toEqual(['main', 'main-2']);
  });
});

describe('liveShows', () => {
  it('prefers curated shows', () => {
    const l = live('x', ['']);
    const curated = { x: [{ id: 'd1', label: 'Day 1', performance: '' }] };
    expect(liveShows(l, curated)).toBe(curated.x);
    expect(showPerformance(l, curated.x[0])).toBe(l.performances[0]);
    expect(liveShows(l, {})[0].id).toBe('main');
  });
});

describe('data/sekai/shows.json', () => {
  const byId = new Map(sekaiLives.map((l) => [l.id, l]));

  it.each(Object.entries(curatedShows))('%s is consistent with lives.json', (id, shows) => {
    const l = byId.get(id);
    expect(l, `unknown live ${id}`).toBeDefined();
    expect(new Set(shows.map((s) => s.id)).size).toBe(shows.length);
    for (const s of shows) {
      if (s.date) expect(s.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (s.performance !== undefined)
        expect(showPerformance(l!, s), `${id}/${s.id} → "${s.performance}"`).toBeDefined();
    }
  });

  it('covers every setlist of a curated live', () => {
    for (const [id, shows] of Object.entries(curatedShows)) {
      const used = new Set(shows.map((s) => s.performance));
      for (const p of byId.get(id)!.performances)
        expect(used, `${id}: "${p.name}"`).toContain(p.name);
    }
  });
});
