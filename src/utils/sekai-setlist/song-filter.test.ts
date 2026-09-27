import { describe, expect, it } from 'vitest';
import { EMPTY_SONG_FILTERS, filterSongs, songMatchesUnit, songReleaseYears } from './song-filter';
import type { SekaiSong } from '~/types/sekai';

const song = (over: Partial<SekaiSong> & { id: string }): SekaiSong => ({
  title: over.id,
  units: [],
  characters: [],
  assetbundleName: '',
  commissioned: false,
  ...over
});

const SONGS: SekaiSong[] = [
  song({
    id: '1',
    title: 'Tell Your World',
    units: ['virtual_singer'],
    publishedAt: Date.UTC(2020, 8, 30)
  }),
  song({
    id: '2',
    title: 'ロキ',
    englishName: 'ROKI',
    pronunciation: 'ろき',
    units: ['virtual_singer', 'leo_need'],
    publishedAt: Date.UTC(2020, 8, 30)
  }),
  song({
    id: '3',
    title: 'セカイ',
    units: ['nightcord'],
    commissioned: true,
    publishedAt: Date.UTC(2021, 5, 1)
  }),
  song({ id: '4', title: 'Collab', units: [], publishedAt: Date.UTC(2023, 5, 1) })
];

const ids = (songs: SekaiSong[]) => songs.map((s) => s.id);

describe('songMatchesUnit', () => {
  it('matches a unit the song carries', () => {
    expect(songMatchesUnit(SONGS[1], 'leo_need')).toBe(true);
    expect(songMatchesUnit(SONGS[1], 'nightcord')).toBe(false);
  });
  it('"other" matches only songs with no unit', () => {
    expect(songMatchesUnit(SONGS[3], 'other')).toBe(true);
    expect(songMatchesUnit(SONGS[0], 'other')).toBe(false);
  });
});

describe('filterSongs', () => {
  it('empty filters return everything', () => {
    expect(ids(filterSongs(SONGS, EMPTY_SONG_FILTERS))).toEqual(['1', '2', '3', '4']);
  });
  it('searches JP title, reading and English name case-insensitively', () => {
    expect(ids(filterSongs(SONGS, { ...EMPTY_SONG_FILTERS, search: 'roki' }))).toEqual(['2']);
    expect(ids(filterSongs(SONGS, { ...EMPTY_SONG_FILTERS, search: 'ろき' }))).toEqual(['2']);
    expect(ids(filterSongs(SONGS, { ...EMPTY_SONG_FILTERS, search: 'セカイ' }))).toEqual(['3']);
  });
  it('ORs unit filters, including the "other" bucket', () => {
    expect(
      ids(filterSongs(SONGS, { ...EMPTY_SONG_FILTERS, units: ['leo_need', 'nightcord'] }))
    ).toEqual(['2', '3']);
    expect(ids(filterSongs(SONGS, { ...EMPTY_SONG_FILTERS, units: ['other'] }))).toEqual(['4']);
  });
  it('filters commissioned vs cover', () => {
    expect(ids(filterSongs(SONGS, { ...EMPTY_SONG_FILTERS, kind: 'commissioned' }))).toEqual(['3']);
    expect(ids(filterSongs(SONGS, { ...EMPTY_SONG_FILTERS, kind: 'cover' }))).toEqual([
      '1',
      '2',
      '4'
    ]);
  });
  it('combines unit, kind and year filters', () => {
    expect(
      ids(
        filterSongs(SONGS, {
          ...EMPTY_SONG_FILTERS,
          units: ['virtual_singer', 'nightcord'],
          kind: 'cover',
          yearFrom: '2020',
          yearTo: '2020'
        })
      )
    ).toEqual(['1', '2']);
  });
});

describe('songReleaseYears', () => {
  it('returns sorted unique years', () => {
    expect(songReleaseYears(SONGS)).toEqual(['2020', '2021', '2023']);
  });
});
