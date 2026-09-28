import { describe, expect, it } from 'vitest';
import { songVocals, type MusicVocal } from './song-vocals';

const vocal = (
  musicVocalType: string,
  seq: number,
  ids: number[],
  caption?: string
): MusicVocal => ({
  musicId: 1,
  musicVocalType,
  seq,
  caption,
  characters: ids.map((characterId) => ({ characterType: 'game_character', characterId }))
});

describe('songVocals', () => {
  it('keeps the Sekai ver. and VS ver. singers apart (にっこり^^調査隊のテーマ)', () => {
    const v = songVocals([
      vocal('original_song', 1, [22, 23], 'バーチャル・シンガーver.'),
      vocal('sekai', 2, [14, 21, 13, 15, 16], 'セカイver.'),
      vocal('another_vocal', 3, [21, 24], 'アナザーボーカルver.')
    ]);
    expect(v.characters).toEqual([13, 14, 15, 16, 21]);
    expect(v.vsCharacters).toEqual([22, 23]);
    expect(v.versions).toEqual([
      { kind: 'virtual_singer', characters: [22, 23] },
      { kind: 'sekai', characters: [13, 14, 15, 16, 21] },
      { kind: 'another_vocal', characters: [21, 24] }
    ]);
  });

  it('prefers the in-game VS arrangement over the original upload', () => {
    const v = songVocals([
      vocal('original_song', 1, [21]),
      vocal('virtual_singer', 101, [21, 22, 23, 24, 25, 26]),
      vocal('sekai', 2, [1, 13, 17, 21])
    ]);
    expect(v.vsCharacters).toEqual([21, 22, 23, 24, 25, 26]);
  });

  it('defaults to the lowest-seq Sekai ver. and keeps unit and collab captions', () => {
    const v = songVocals([
      vocal('sekai', 1201, [11, 12, 37], 'あんさんぶるスターズ！！コラボver.'),
      vocal('sekai', 3, [11, 12], 'セカイver.'),
      vocal('instrumental', 4, [], 'Inst.ver.')
    ]);
    expect(v.characters).toEqual([11, 12]);
    expect(v.vsCharacters).toBeUndefined();
    expect(v.versions.map((x) => x.caption)).toEqual([
      undefined,
      'あんさんぶるスターズ！！コラボver.'
    ]);
  });

  it('uses the VS ver. for a VS-only song and lists outside characters by name', () => {
    const v = songVocals(
      [
        {
          ...vocal('original_song', 1, [24]),
          characters: [
            { characterType: 'game_character', characterId: 24 },
            { characterType: 'outside_character', characterId: 1 }
          ]
        },
        vocal('another_vocal', 2, [21])
      ],
      new Map([[1, 'GUMI']])
    );
    expect(v.characters).toEqual([24]);
    expect(v.vsCharacters).toBeUndefined();
    expect(v.versions[0]).toEqual({ kind: 'virtual_singer', characters: [24], others: ['GUMI'] });
  });

  it('handles a song with no vocals', () => {
    expect(songVocals([])).toEqual({ characters: [], versions: [] });
  });
});
