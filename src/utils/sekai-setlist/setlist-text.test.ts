import { describe, expect, it } from 'vitest';
import { buildTitleIndex, parseSetlistText } from './setlist-text';
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
