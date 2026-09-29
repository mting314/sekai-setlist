import { describe, expect, it } from 'vitest';
import { audioLabel, audioUrl, imagesPath, pickAudio, songAudio } from './song-audio';

// File names as the wiki API lists them on the song pages.
const file = (song: string, label: string) => `File:${song} (Game Version - ${label}).ogg`;
const files = (song: string, labels: string[]) =>
  labels.map((l): [string, string] => [file(song, l), `x/xy/${l}.ogg`]);

describe('audioLabel', () => {
  it('reads the version from a Game Version file', () => {
    expect(audioLabel(file('Gunjou Sanka', 'SEKAI'))).toEqual({ kind: 'sekai' });
    expect(audioLabel('Tell_Your_World_(Game_Version_-_VIRTUAL_SINGER).ogg')).toEqual({
      kind: 'virtual_singer'
    });
    expect(audioLabel(file('Gunjou Sanka', 'VIRTUAL SINGER 2'))).toEqual({
      kind: 'numbered_vs',
      n: 2
    });
    expect(audioLabel(file('Senbonzakura', 'VIRTUAL SINGER (3)'))).toEqual({
      kind: 'numbered_vs',
      n: 3
    });
  });

  it('skips Another Vocals, full versions and instrumentals', () => {
    expect(audioLabel(file('Gunjou Sanka', 'Ichika'))).toBeUndefined();
    expect(audioLabel(file('Gunjou Sanka', 'All Original Units'))).toBeUndefined();
    expect(audioLabel('File:Gunjou Sanka (Full Version - SEKAI).ogg')).toBeUndefined();
    expect(audioLabel('File:Gunjou Sanka (Instrumental - SEKAI).ogg')).toBeUndefined();
  });
});

describe('songAudio', () => {
  it('keeps the Sekai ver. and VS ver. recordings (群青讃歌)', () => {
    const labels = ['VIRTUAL SINGER', 'VIRTUAL SINGER 2', 'SEKAI', 'Ichika', 'Kanade'];
    expect(songAudio(files('Gunjou Sanka', labels))).toEqual({
      sekai: 'x/xy/SEKAI.ogg',
      virtual_singer: 'x/xy/VIRTUAL SINGER.ogg'
    });
  });

  it('takes a second VS recording as the original only when the song lists one', () => {
    const labels = ['VIRTUAL SINGER', 'VIRTUAL SINGER (3)', 'VIRTUAL SINGER (2)'];
    expect(songAudio(files('Senbonzakura', labels), true)).toEqual({
      virtual_singer: 'x/xy/VIRTUAL SINGER.ogg',
      original: 'x/xy/VIRTUAL SINGER (2).ogg'
    });
    expect(songAudio(files('Senbonzakura', labels))).toEqual({
      virtual_singer: 'x/xy/VIRTUAL SINGER.ogg'
    });
  });

  it('uses a lone unit recording for a song without a SEKAI one', () => {
    expect(songAudio(files('X', ['Leo-need', 'VIRTUAL SINGER']))).toEqual({
      sekai: 'x/xy/Leo-need.ogg',
      virtual_singer: 'x/xy/VIRTUAL SINGER.ogg'
    });
    expect(songAudio(files('X', ['Leo-need', 'MORE MORE JUMP!']))).toEqual({});
  });
});

describe('pickAudio', () => {
  it('plays the version asked for, else the nearest one', () => {
    const both = { sekai: 's.ogg', virtual_singer: 'v.ogg' };
    expect(pickAudio(both)).toBe('s.ogg');
    expect(pickAudio(both, 'virtual_singer')).toBe('v.ogg');
    expect(pickAudio(both, 'original')).toBe('s.ogg');
    expect(pickAudio({ virtual_singer: 'v.ogg' })).toBe('v.ogg'); // a VS-only cover
    expect(pickAudio({ sekai: 's.ogg' }, 'virtual_singer')).toBe('s.ogg');
    expect(pickAudio(undefined)).toBeUndefined();
    expect(pickAudio({})).toBeUndefined();
  });
});

it('keeps only the images path of a file URL', () => {
  const url =
    'https://static.wikia.nocookie.net/projectsekai/images/8/87/Tell_Your_World_%28Game_Version_-_VIRTUAL_SINGER%29.ogg/revision/latest?cb=20220301052335';
  const path = imagesPath(url)!;
  expect(path).toBe('8/87/Tell_Your_World_%28Game_Version_-_VIRTUAL_SINGER%29.ogg');
  expect(audioUrl(path)).toBe(url.replace(/\?.*$/, ''));
  expect(imagesPath('https://example.com/a.ogg')).toBeUndefined();
});
