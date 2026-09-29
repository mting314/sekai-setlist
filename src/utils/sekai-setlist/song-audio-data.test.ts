import { expect, it, vi } from 'vitest';

let fail = true;
vi.mock('../../../data/sekai/song-audio.json', () => {
  if (fail) throw new Error('offline');
  return { default: { '1': { virtual_singer: 'v/1.ogg' } } };
});

it('tries loading the audio list again after a failure', async () => {
  const { loadSongAudio } = await import('./song-audio-data');
  await expect(loadSongAudio()).rejects.toThrow();
  fail = false;
  vi.resetModules(); // forget the failed import, as a browser retrying the chunk would
  await expect(loadSongAudio()).resolves.toEqual({ '1': { virtual_singer: 'v/1.ogg' } });
});
