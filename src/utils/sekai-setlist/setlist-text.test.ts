import { describe, expect, it } from 'vitest';
import { sekaiSongs } from './catalog';
import { exportText, newPrediction } from './prediction';
import { buildTitleIndex, parseSetlistItems, parseSetlistText } from './setlist-text';
import type { SekaiSong } from '~/types/sekai';

const song = (id: string, title: string, extra: Partial<SekaiSong> = {}): SekaiSong => ({
  id,
  title,
  units: [],
  characters: [],
  assetbundleName: '',
  commissioned: true,
  ...extra
});

const INDEX = buildTitleIndex([
  song('1', 'セカイ', { englishName: 'Sekai', pronunciation: 'せかい' }),
  song('2', 'ワーワーワールド', { englishName: 'Wah Wah World' }),
  song('3', 'Tell Your World'),
  song('4', '群青讃歌', { englishName: 'Gunjou Sanka' })
]);

describe('parseSetlistText', () => {
  it('resolves JP, EN and kana titles, ignoring numbering, case and punctuation', () => {
    const { state, unresolved } = parseSetlistText(
      '1. セカイ\nM02 wah-wah world\n03) TELL YOUR WORLD\n\nせかい',
      INDEX
    );
    expect(state.songs).toEqual(['1', '2', '3', '1']);
    expect(unresolved).toEqual([]);
  });

  it('marks songs after an encore line or EN numbering as encore', () => {
    expect(
      parseSetlistText('セカイ\n-- Encore --\n群青讃歌\nTell Your World', INDEX).state.encore
    ).toEqual([1, 2]);
    expect(parseSetlistText('セカイ\nEN1 Gunjou Sanka', INDEX).state.encore).toEqual([1]);
  });

  it('strips a trailing version note and reports unknown lines', () => {
    const { state, unresolved } = parseSetlistText(
      'セカイ (Short ver.)\nMC\nワーワーワールド［Rin & Len ver.］',
      INDEX
    );
    expect(state.songs).toEqual(['1', '2']);
    expect(unresolved).toEqual(['MC']);
  });
});

const strip = (items: ReturnType<typeof parseSetlistItems>) =>
  items.map(({ id: _id, ...rest }) => rest);

describe('parseSetlistItems', () => {
  it('keeps song ids, MCs, dividers, remarks and unmatched lines', () => {
    const items = parseSetlistItems(
      '1. セカイ\nMC\nM02 Tell Your World (Short ver.)\n━━ INTERMISSION ━━\nMystery Song\nEN01 群青讃歌\nMC② Thanks',
      INDEX
    );
    expect(strip(items)).toEqual([
      { type: 'song', songId: '1' },
      { type: 'mc', title: 'MC' },
      { type: 'song', songId: '3', remarks: 'Short ver.' },
      { type: 'intermission' },
      { type: 'custom', name: 'Mystery Song' },
      { type: 'encore' },
      { type: 'song', songId: '4' },
      { type: 'mc', title: 'Thanks' }
    ]);
  });

  it('adds one encore row for an encore line followed by EN numbering', () => {
    const items = parseSetlistItems('セカイ\n-- Encore --\nEN1 Gunjou Sanka\nEN2 Sekai', INDEX);
    expect(items.map((i) => i.type)).toEqual(['song', 'encore', 'song', 'song']);
  });

  it('reads exportText output back', () => {
    const p = newPrediction({
      name: '',
      items: [
        { id: 'a', type: 'song', songId: '1', remarks: 'VIRTUAL SINGER Ver.' },
        { id: 'f', type: 'song', songId: '10' },
        { id: 'b', type: 'mc', title: 'MC' },
        { id: 'c', type: 'intermission', title: 'Day 2' },
        { id: 'd', type: 'encore' },
        { id: 'e', type: 'custom', name: 'New song' }
      ]
    });
    const catalog = buildTitleIndex(sekaiSongs);
    expect(strip(parseSetlistItems(exportText(p, 'ja'), catalog))).toEqual(
      p.items.map(({ id: _id, ...rest }) => rest)
    );
  });
});
