import { beforeEach, describe, expect, it } from 'vitest';
import { newPrediction } from './prediction';
import {
  deletePrediction,
  getLastPredictionId,
  getPrediction,
  listPredictions,
  migrateSlots,
  savePrediction,
  setLastPredictionId
} from './predictions-store';

beforeEach(() => localStorage.clear());

describe('predictions store', () => {
  it('upserts by id, lists newest first and filters by live', () => {
    const a = newPrediction({ name: 'a', live: 'x' });
    const b = newPrediction({ name: 'b' });
    savePrediction(a, '2026-01-01T00:00:00.000Z');
    savePrediction(b, '2026-01-02T00:00:00.000Z');
    savePrediction({ ...a, name: 'a2' }, '2026-01-03T00:00:00.000Z');
    expect(listPredictions().map((p) => p.name)).toEqual(['a2', 'b']);
    expect(listPredictions('x').map((p) => p.name)).toEqual(['a2']);
    expect(getPrediction(a.id)?.updatedAt).toBe('2026-01-03T00:00:00.000Z');
  });

  it('deletes, forgetting it as the last opened', () => {
    const a = savePrediction(newPrediction({ name: 'a' }));
    setLastPredictionId(a.id);
    deletePrediction(a.id);
    expect(getPrediction(a.id)).toBeUndefined();
    expect(getLastPredictionId()).toBeUndefined();
  });

  it('treats corrupt storage as empty', () => {
    localStorage.setItem('sekai-setlist:predictions', '{not json');
    expect(listPredictions()).toEqual([]);
  });
});

describe('migrateSlots', () => {
  const SLOTS = [
    {
      name: 'slot a',
      savedAt: Date.UTC(2025, 0, 1),
      state: { title: '', songs: ['1', '2'], encore: [1], ordered: true, live: 'x' }
    },
    {
      name: 'slot b',
      savedAt: 2,
      state: { title: 'Titled', songs: [], encore: [], ordered: false }
    },
    { name: 'broken' }
  ];

  it('imports each slot once and keeps the old key', () => {
    localStorage.setItem('sekai-setlist:slots', JSON.stringify(SLOTS));
    const list = listPredictions(); // reading migrates
    expect(list.map((p) => p.name)).toEqual(['slot a', 'Titled']);
    expect(list[0].live).toBe('x');
    expect(list[0].updatedAt).toBe('2025-01-01T00:00:00.000Z');
    expect(list[0].items.map((i) => i.type)).toEqual(['song', 'encore', 'song']);
    expect(migrateSlots()).toBe(0);
    expect(listPredictions()).toHaveLength(2);
    expect(localStorage.getItem('sekai-setlist:slots')).not.toBeNull();
  });
});
