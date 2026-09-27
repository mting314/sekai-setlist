import { beforeEach, describe, expect, it } from 'vitest';
import { EMPTY_STATE, decodeHash, encodeState, type SetlistState } from './share';
import { deleteSlot, listSlots, loadSlot, saveSlot } from './storage';

const STATE: SetlistState = {
  title: 'My Sekai Live',
  songs: ['1', '74', '1'],
  encore: [2],
  ordered: true
};

describe('share URL encoding', () => {
  it('round-trips state through the hash, with or without "#"', () => {
    const hash = encodeState(STATE);
    expect(hash.startsWith('s=')).toBe(true);
    expect(decodeHash(hash)).toEqual(STATE);
    expect(decodeHash('#' + hash)).toEqual(STATE);
  });

  it('returns undefined for missing or corrupt hashes', () => {
    expect(decodeHash('')).toBeUndefined();
    expect(decodeHash('#foo=bar')).toBeUndefined();
    expect(decodeHash('#s=not-lz-data')).toBeUndefined();
  });

  it('normalizes loosely-typed payloads', () => {
    const hash = encodeState({ songs: [1, 2], encore: [1, 'x'] } as unknown as SetlistState);
    expect(decodeHash(hash)).toEqual({ title: '', songs: ['1', '2'], encore: [1], ordered: true });
  });
});

describe('save slots', () => {
  beforeEach(() => localStorage.clear());

  it('upserts by name and lists newest first', () => {
    saveSlot('a', STATE, 1);
    saveSlot('b', EMPTY_STATE, 2);
    saveSlot('a', { ...STATE, title: 'updated' }, 3);
    expect(listSlots().map((s) => s.name)).toEqual(['a', 'b']);
    expect(loadSlot('a')?.title).toBe('updated');
  });

  it('deletes slots', () => {
    saveSlot('a', STATE, 1);
    deleteSlot('a');
    expect(loadSlot('a')).toBeUndefined();
    expect(listSlots()).toEqual([]);
  });

  it('treats corrupt storage as empty', () => {
    localStorage.setItem('sekai-setlist:slots', '{not json');
    expect(listSlots()).toEqual([]);
  });
});
