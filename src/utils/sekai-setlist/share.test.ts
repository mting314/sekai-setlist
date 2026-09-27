import { describe, expect, it } from 'vitest';
import { newPrediction } from './prediction';
import { decodeHash, decodeShare, encodePrediction, encodeState, type SetlistState } from './share';
import type { SekaiPrediction } from '~/types/sekai-prediction';

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

  it('keeps the predicted live id', () => {
    const withLive = { ...STATE, live: 'go-hoppin-parade' };
    expect(decodeHash(encodeState(withLive))).toEqual(withLive);
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

const strip = (p: SekaiPrediction) => ({
  ...p,
  id: '',
  createdAt: '',
  updatedAt: '',
  items: p.items.map((i) => ({ ...i, id: '' }))
});

describe('prediction share links (#p=)', () => {
  const P = newPrediction({
    name: 'My 6th anniv prediction',
    live: 'go-hoppin-parade',
    items: [
      { id: 'a', type: 'song', songId: '1', remarks: 'Short Ver.' },
      { id: 'b', type: 'mc', title: 'MC' },
      { id: 'c', type: 'custom', name: 'Collab song' },
      { id: 'd', type: 'intermission', title: 'Medley' },
      { id: 'e', type: 'encore' },
      { id: 'f', type: 'song', songId: '74' }
    ]
  });
  it('round-trips every row type with a fresh id', () => {
    const hash = encodePrediction(P);
    expect(hash.startsWith('p=')).toBe(true);
    const got = decodeShare('#' + hash);
    expect(got?.ordered).toBe(true);
    expect(got?.prediction.id).not.toBe(P.id);
    expect(strip(got!.prediction)).toEqual(strip(P));
  });

  it('keeps a custom event', () => {
    const p = { ...P, live: undefined, custom: { name: 'Dream live', venue: 'Budokan' } };
    expect(decodeShare(encodePrediction(p))?.prediction.custom).toEqual(p.custom);
  });

  it('reads legacy #s= links, flagging any-order ones', () => {
    const got = decodeShare(encodeState(STATE));
    expect(got?.ordered).toBe(true);
    expect(got?.prediction.name).toBe(STATE.title);
    expect(got?.prediction.items.map((i) => i.type)).toEqual(['song', 'song', 'encore', 'song']);
    expect(decodeShare(encodeState({ ...STATE, ordered: false }))?.ordered).toBe(false);
  });

  it('returns undefined for missing or corrupt hashes', () => {
    expect(decodeShare('')).toBeUndefined();
    expect(decodeShare('#p=not-lz-data')).toBeUndefined();
  });
});
