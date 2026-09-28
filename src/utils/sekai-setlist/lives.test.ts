import { describe, expect, it } from 'vitest';
import {
  EMPTY_LIVE_FILTERS,
  filterLives,
  liveSongMatches,
  liveSongVersion,
  performanceToItems,
  performanceToState,
  songHistory,
  songStats
} from './lives';
import type { SekaiLive, SekaiLiveSong, SekaiSong } from '~/types/sekai';

const song = (id: string, units: SekaiSong['units'], commissioned: boolean): SekaiSong => ({
  id,
  title: `song${id}`,
  units,
  characters: [],
  assetbundleName: '',
  commissioned
});
const SONGS = new Map(
  [
    song('1', ['leo_need'], true),
    song('2', ['nightcord'], false),
    song('3', ['virtual_singer'], false)
  ].map((s) => [s.id, s])
);
const getSong = (id: string) => SONGS.get(id);

const live = (id: string, series: SekaiLive['series'], startDate: string, sets: string[][]) =>
  ({
    id,
    series,
    name: id,
    date: startDate,
    startDate,
    notes: [],
    source: '',
    performances: sets.map((ids, i) => ({
      name: sets.length > 1 ? `Day ${i + 1}` : '',
      markers: [],
      songs: ids.map((s) => (s.startsWith('x') ? { title: s } : { songId: s, title: `song${s}` }))
    }))
  }) satisfies SekaiLive;

const LIVES: SekaiLive[] = [
  live('cl1', 'colorful_live', '2022-01-28', [['1', '2', '1']]),
  live('tf2', 'thanks_festival', '2022-09-23', [['2', '3'], ['2']]),
  live('ss', 'sekai_symphony', '2021-10-16', [['3', 'xBGM']]),
  live('up', 'colorful_live', '2026-12-25', [])
];
const ids = (ms: { live: SekaiLive }[]) => ms.map((m) => m.live.id);

describe('liveSongMatches', () => {
  it('uses the catalog song for unit and kind filters', () => {
    const item = { songId: '1', title: 'song1' };
    expect(liveSongMatches(item, { ...EMPTY_LIVE_FILTERS, units: ['leo_need'] }, getSong)).toBe(
      true
    );
    expect(liveSongMatches(item, { ...EMPTY_LIVE_FILTERS, kind: 'cover' }, getSong)).toBe(false);
  });
  it('matches non-catalog entries only by title search', () => {
    const item = { title: 'New Landscape' };
    expect(liveSongMatches(item, { ...EMPTY_LIVE_FILTERS, search: 'landscape' }, getSong)).toBe(
      true
    );
    expect(liveSongMatches(item, { ...EMPTY_LIVE_FILTERS, kind: 'cover' }, getSong)).toBe(false);
  });
});

describe('filterLives', () => {
  it('lists every live newest first when no filter is set', () => {
    expect(ids(filterLives(LIVES, EMPTY_LIVE_FILTERS, getSong))).toEqual([
      'up',
      'tf2',
      'cl1',
      'ss'
    ]);
  });
  it('filters by series', () => {
    const f = { ...EMPTY_LIVE_FILTERS, series: ['colorful_live' as const] };
    expect(ids(filterLives(LIVES, f, getSong))).toEqual(['up', 'cl1']);
  });
  it('keeps only lives with a matching song, counting each song once', () => {
    const f = { ...EMPTY_LIVE_FILTERS, units: ['leo_need' as const] };
    expect(filterLives(LIVES, f, getSong).map((m) => [m.live.id, m.matches])).toEqual([['cl1', 1]]);
    const covers = filterLives(LIVES, { ...EMPTY_LIVE_FILTERS, kind: 'cover' }, getSong);
    expect(covers.map((m) => [m.live.id, m.matches])).toEqual([
      ['tf2', 2],
      ['cl1', 1],
      ['ss', 1]
    ]);
  });
});

describe('songStats', () => {
  it('counts lives and setlists per song, reprises once', () => {
    expect(songStats(LIVES, EMPTY_LIVE_FILTERS, getSong)).toEqual([
      { songId: '2', lives: ['tf2', 'cl1'], performances: 3 },
      { songId: '3', lives: ['tf2', 'ss'], performances: 2 },
      { songId: '1', lives: ['cl1'], performances: 1 }
    ]);
  });
  it('respects series and song filters', () => {
    const f = {
      ...EMPTY_LIVE_FILTERS,
      series: ['thanks_festival' as const],
      units: ['virtual_singer' as const]
    };
    expect(songStats(LIVES, f, getSong)).toEqual([
      { songId: '3', lives: ['tf2'], performances: 1 }
    ]);
  });
});

describe('performanceToState', () => {
  it('keeps catalog songs in order and remaps the encore after dropped entries', () => {
    const l: SekaiLive = {
      ...live('x', 'colorful_live', '2022-01-01', []),
      performances: [
        {
          name: 'Day 1',
          markers: [{ at: 2, label: 'Encore' }],
          songs: [
            { songId: '1', title: '' },
            { title: 'BGM' },
            { songId: '2', title: '' },
            { songId: '1', title: '' }
          ]
        }
      ]
    };
    expect(performanceToState(l, l.performances[0])).toEqual({
      title: 'x (Day 1)',
      songs: ['1', '2', '1'],
      encore: [1, 2],
      ordered: true
    });
  });
});

describe('performanceToItems', () => {
  it('keeps dividers, off-catalog songs and notes', () => {
    const items = performanceToItems({
      name: '',
      markers: [
        { at: 1, label: 'Intermission' },
        { at: 2, label: 'Instrumental Medley' },
        { at: 3, label: 'Encore' }
      ],
      songs: [
        { songId: '1', title: '', note: '(Short ver.)' },
        { title: 'Collab' },
        { songId: '2', title: '' },
        { songId: '1', title: '' }
      ]
    });
    expect(items.map(({ id: _, ...rest }) => rest)).toEqual([
      { type: 'song', songId: '1', remarks: 'Short ver.' },
      { type: 'intermission' },
      { type: 'custom', name: 'Collab' },
      { type: 'intermission', title: 'Instrumental Medley' },
      { type: 'song', songId: '2' },
      { type: 'encore' },
      { type: 'song', songId: '1' }
    ]);
  });
});

const hasVs = (id: string) => id === '76';

describe('liveSongVersion', () => {
  const v = (s: Partial<SekaiLiveSong>) =>
    liveSongVersion({ songId: '76', title: '', ...s }, hasVs);
  it('reads the version from the performers', () => {
    expect(v({ performers: ['VIRTUAL SINGER'] })).toBe('virtual_singer');
    expect(v({ performers: ['Kagamine Rin', 'Kagamine Len', 'Instrumental'] })).toBe(
      'virtual_singer'
    );
    expect(v({ performers: ['Leo/need', 'Hatsune Miku'] })).toBe('sekai');
  });
  it('reads the version from the note', () => {
    expect(v({ note: '(VIRTUAL SINGER Ver.)' })).toBe('virtual_singer');
    expect(v({ note: '(VIRTUAL SINGER; Game Ver.)' })).toBe('virtual_singer');
    expect(v({ note: '(Rin & Len ver.)' })).toBe('virtual_singer');
    expect(v({ note: '(by Hatsune Miku)' })).toBe('virtual_singer');
    expect(v({ note: '(Short ver.)' })).toBeUndefined();
  });
  it('is undefined for songs with one version or no performers', () => {
    expect(v({})).toBeUndefined();
    expect(v({ songId: '1', performers: ['VIRTUAL SINGER'] })).toBeUndefined();
    expect(v({ songId: undefined, performers: ['VIRTUAL SINGER'] })).toBeUndefined();
  });
  it('marks VS performances in past setlists', () => {
    const perf = {
      name: '',
      markers: [],
      songs: [
        { songId: '76', title: '', performers: ['Leo/need'] },
        { songId: '76', title: '', note: '(VIRTUAL SINGER; Game Ver.)' }
      ]
    };
    expect(performanceToItems(perf).map(({ id: _, ...rest }) => rest)).toEqual([
      { type: 'song', songId: '76' },
      { type: 'song', songId: '76', remarks: 'Game Ver.', version: 'virtual_singer' }
    ]);
    const l = { ...live('x', 'colorful_live', '2022-01-01', []), performances: [perf] };
    expect(performanceToState(l, perf).vs).toEqual([1]);
    expect(songHistory('76', [l]).map((p) => p.version)).toEqual(['sekai', 'virtual_singer']);
  });
});

describe('songHistory', () => {
  it('lists every appearance newest first, reprises included', () => {
    const h = songHistory('2', LIVES).map((p) => [p.live.id, p.perf.name, p.position]);
    expect(h).toEqual([
      ['tf2', 'Day 1', 1],
      ['tf2', 'Day 2', 1],
      ['cl1', '', 2]
    ]);
    expect(songHistory('1', LIVES).map((p) => p.position)).toEqual([1, 3]);
  });
  it('flags encore songs and keeps notes', () => {
    const l: SekaiLive = {
      ...live('x', 'colorful_live', '2022-01-01', []),
      performances: [
        {
          name: '',
          markers: [{ at: 1, label: 'Encore' }],
          songs: [
            { songId: '1', title: '' },
            { songId: '1', title: '', note: '(Short ver.)' }
          ]
        }
      ]
    };
    expect(
      songHistory('1', [l]).map(({ position, encore, note }) => ({ position, encore, note }))
    ).toEqual([
      { position: 1, encore: false, note: undefined },
      { position: 2, encore: true, note: '(Short ver.)' }
    ]);
  });
  it('is empty for a song never performed', () => {
    expect(songHistory('99', LIVES)).toEqual([]);
  });
});
