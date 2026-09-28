import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
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
      { id: 'f', type: 'song', songId: '74' },
      { id: 'g', type: 'song', songId: '76', version: 'virtual_singer' },
      { id: 'h', type: 'song', songId: '178', remarks: 'Short ver.', version: 'virtual_singer' }
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

  it('moves a VIRTUAL SINGER ver. remark from older links into the version', () => {
    const p = newPrediction({
      items: [
        { id: 'a', type: 'song', songId: '76', remarks: 'VIRTUAL SINGER Ver.' },
        { id: 'b', type: 'song', songId: '141', remarks: 'VIRTUAL SINGER; Game Ver.' },
        { id: 'c', type: 'song', songId: '1', remarks: 'VIRTUAL SINGER Ver.' }
      ]
    });
    expect(decodeShare(encodePrediction(p))!.prediction.items.map(({ id: _, ...r }) => r)).toEqual([
      { type: 'song', songId: '76', version: 'virtual_singer' },
      { type: 'song', songId: '141', remarks: 'Game Ver.', version: 'virtual_singer' },
      // Tell Your World has no VS ver. to switch to, so the remark stays
      { type: 'song', songId: '1', remarks: 'VIRTUAL SINGER Ver.' }
    ]);
  });

  it('marks VIRTUAL SINGER ver. rows with a flag older builds ignore, and reads early v rows', () => {
    const wire = (hash: string) =>
      JSON.parse(decompressFromEncodedURIComponent(hash.slice(2))) as { i: unknown[] };
    const p = newPrediction({
      items: [{ id: 'a', type: 'song', songId: '76', version: 'virtual_singer' }]
    });
    expect(wire(encodePrediction(p)).i).toEqual([['s', '76', '', 1]]);
    const early =
      'p=' + compressToEncodedURIComponent(JSON.stringify({ v: 2, n: '', i: [['v', '76']] }));
    expect(decodeShare(early)!.prediction.items[0]).toMatchObject({ version: 'virtual_singer' });
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
