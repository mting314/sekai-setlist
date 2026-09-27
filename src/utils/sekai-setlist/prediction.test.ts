import { describe, expect, it } from 'vitest';
import { getSekaiSong } from './catalog';
import { getSekaiLive, sekaiLiveName } from './live-data';
import {
  exportText,
  fromSetlistState,
  newPrediction,
  numberItems,
  parsePrediction,
  songCount,
  toSetlistState
} from './prediction';
import { scorePrediction } from './scoring';
import { decodeShare, encodeState, type SetlistState } from './share';
import type { PredictionItem } from '~/types/sekai-prediction';

const song = (id: string, songId: string, remarks?: string): PredictionItem => ({
  id,
  type: 'song',
  songId,
  ...(remarks ? { remarks } : {})
});

const ITEMS: PredictionItem[] = [
  song('a', '1'),
  { id: 'b', type: 'mc', title: 'MC' },
  { id: 'c', type: 'custom', name: 'Collab song' },
  { id: 'd', type: 'intermission' },
  song('e', '2', 'Short Ver.'),
  { id: 'f', type: 'mc', title: 'Talk' },
  { id: 'g', type: 'encore' },
  song('h', '3'),
  song('i', '1')
];
const P = newPrediction({ name: 'Test', live: 'go-hoppin-parade', items: ITEMS });

describe('numberItems', () => {
  it('numbers songs M/EN around the first encore, MCs with circled numbers', () => {
    expect(numberItems(ITEMS)).toEqual([
      'M01',
      'MC①',
      'M02',
      undefined,
      'M03',
      'MC②',
      undefined,
      'EN01',
      'EN02'
    ]);
  });

  it('falls back to (n) past ⑳', () => {
    const mcs = Array.from(
      { length: 21 },
      (_, i): PredictionItem => ({
        id: String(i),
        type: 'mc',
        title: 'MC'
      })
    );
    expect(numberItems(mcs).slice(19)).toEqual(['MC⑳', 'MC(21)']);
  });
});

describe('SetlistState conversion', () => {
  it('keeps catalog songs and the encore for scoring', () => {
    expect(toSetlistState(P)).toEqual({
      title: 'Test',
      songs: ['1', '2', '3', '1'],
      encore: [2, 3],
      ordered: true,
      live: 'go-hoppin-parade'
    });
    expect(songCount(P)).toBe(5);
  });

  it('round-trips a state through rows', () => {
    const state: SetlistState = { title: 'x', songs: ['1', '2', '3'], encore: [2], ordered: true };
    const p = fromSetlistState(state);
    expect(p.items.map((i) => i.type)).toEqual(['song', 'song', 'encore', 'song']);
    expect(toSetlistState(p)).toEqual(state);
  });

  it('scores a prediction like its state', () => {
    const actual: SetlistState = { title: '', songs: ['1', '2', '3'], encore: [2], ordered: true };
    const r = scorePrediction(toSetlistState(P), actual);
    expect(r.songs.filter((s) => s.kind === 'exact')).toHaveLength(3);
  });

  it('bag-scores a legacy any-order link', () => {
    const legacy = decodeShare(
      encodeState({ title: '', songs: ['3', '2', '1'], encore: [], ordered: false })
    )!;
    const actual: SetlistState = { title: '', songs: ['1', '2', '3'], encore: [], ordered: true };
    const ordered = { ...toSetlistState(legacy.prediction), ordered: legacy.ordered };
    expect(ordered.ordered).toBe(false);
    expect(scorePrediction(ordered, actual).total).toBe(30);
  });
});

describe('parsePrediction', () => {
  it('drops bad rows and fills ids and dates', () => {
    const p = parsePrediction({
      name: 'x',
      items: [{ type: 'song', songId: 7 }, { type: 'song' }, { type: 'nope' }, { type: 'encore' }]
    })!;
    expect(p.items.map(({ id: _, ...rest }) => rest)).toEqual([
      { type: 'song', songId: '7' },
      { type: 'encore' }
    ]);
    expect(p.id).toMatch(/^p-/);
    expect(p.createdAt).toBe(p.updatedAt);
    expect(parsePrediction({ name: 'x' })).toBeUndefined();
  });
});

describe('exportText', () => {
  it('prints names, numbering, remarks and dividers', () => {
    const lines = exportText(P, 'ja').split('\n');
    expect(lines.slice(0, 3)).toEqual([
      'Test',
      sekaiLiveName(getSekaiLive('go-hoppin-parade')!, 'ja'),
      ''
    ]);
    expect(lines[3]).toBe(`M01 ${getSekaiSong('1')!.title}`);
    expect(lines).toContain('M02 Collab song');
    expect(lines).toContain(`M03 ${getSekaiSong('2')!.title} (Short Ver.)`);
    expect(lines).toContain('━━ INTERMISSION ━━');
    expect(lines).toContain('━━ ENCORE ━━');
    expect(lines.at(-1)).toBe(`EN02 ${getSekaiSong('1')!.title}`);
  });
});
