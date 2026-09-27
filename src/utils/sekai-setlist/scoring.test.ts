import { describe, expect, it } from 'vitest';
import { scorePrediction } from './scoring';
import type { SetlistState } from './share';

const state = (songs: string[], encore: number[] = [], ordered = true): SetlistState => ({
  title: '',
  songs,
  encore,
  ordered
});

describe('scorePrediction (ordered)', () => {
  it('gives full marks for a perfect prediction', () => {
    const actual = state(['1', '2', '3', '4'], [3]);
    const r = scorePrediction(actual, actual);
    expect(r.songs.map((s) => s.kind)).toEqual(['exact', 'exact', 'exact', 'exact']);
    expect(r.bonuses).toEqual({ opener: true, closer: true, encoreBreak: true });
    expect(r.total).toBe(4 * 15 + 15);
    expect(r.max).toBe(r.total);
    expect(r.accuracy).toBe(1);
  });

  it('scores close and present landings and lists missed songs', () => {
    const actual = state(['1', '2', '3', '4', '5', '6']);
    // '6' lands 3 off (present), '3' lands 2 off (close), '9' was never played.
    const r = scorePrediction(state(['1', '9', '6', '4', '3']), actual);
    expect(r.songs.map((s) => [s.kind, s.points, s.actualAt])).toEqual([
      ['exact', 15, 0],
      ['miss', 0, undefined],
      ['present', 3, 5],
      ['exact', 15, 3],
      ['close', 8, 2]
    ]);
    expect(r.missed).toEqual([1, 4]);
    expect(r.bonuses).toEqual({ opener: true, closer: false, encoreBreak: undefined });
    expect(r.total).toBe(15 + 3 + 15 + 8 + 5);
    expect(r.max).toBe(6 * 15 + 10);
  });

  it('credits a reprise only as often as it was played', () => {
    const r = scorePrediction(state(['1', '1', '1']), state(['1', '2', '1']));
    expect(r.songs.map((s) => s.kind)).toEqual(['exact', 'miss', 'exact']);
  });

  it('prefers the exact landing over an earlier close one', () => {
    const r = scorePrediction(state(['2', '1']), state(['1', '1']));
    expect(r.songs.map((s) => [s.kind, s.actualAt])).toEqual([
      ['miss', undefined],
      ['exact', 1]
    ]);
    expect(r.songs[0].points).toBe(0);
  });

  it('only awards the encore bonus for a divider at the same position', () => {
    const actual = state(['1', '2', '3'], [2]);
    expect(scorePrediction(state(['1', '2', '3'], [1, 2]), actual).bonuses.encoreBreak).toBe(false);
    expect(scorePrediction(state(['1', '2', '3']), actual).bonuses.encoreBreak).toBe(false);
  });

  it('scores zero out of zero against an empty setlist', () => {
    const r = scorePrediction(state(['1']), state([]));
    expect([r.total, r.max, r.accuracy]).toEqual([0, 0, 0]);
  });
});

describe('scorePrediction (unordered)', () => {
  it('counts each performed song once, with no position or bonus points', () => {
    const r = scorePrediction(state(['3', '1', '9', '1'], [], false), state(['1', '2', '3']));
    expect(r.songs.map((s) => s.points)).toEqual([10, 10, 0, 0]);
    expect(r.missed).toEqual([1]);
    expect([r.total, r.max]).toEqual([20, 30]);
  });
});
