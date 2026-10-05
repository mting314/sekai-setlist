import { describe, expect, it } from 'vitest';
import { credit, sekaiBestEventUrl, songEventsById } from './song-events';

const ev = (over: Partial<Parameters<typeof songEventsById>[0][number]>) => ({
  event_id: 1,
  name: '雨上がりの一番星',
  event_type: 'marathon',
  started_at: 1000,
  song_id: 64,
  nickname: 'saki1',
  ...over
});

describe('songEventsById', () => {
  it('keys events by song, oldest first, with the EN name when it differs', () => {
    const byId = songEventsById(
      [
        ev({ event_id: 3, started_at: 3000, nickname: 'saki2' }),
        ev({}),
        ev({ event_id: 2, song_id: 62, nickname: 'mafu1', name: '囚われのマリオネット' })
      ],
      new Map([
        [1, 'The Brightest Star After the Rain'],
        [2, '囚われのマリオネット']
      ])
    );
    expect(byId.get('64')?.map((e) => e.nickname)).toEqual(['saki1', 'saki2']);
    expect(byId.get('64')?.[0]).toEqual({
      id: 1,
      name: '雨上がりの一番星',
      nameEn: 'The Brightest Star After the Rain',
      nickname: 'saki1',
      type: 'marathon',
      startedAt: 1000
    });
    expect(byId.get('62')?.[0].nameEn).toBeUndefined();
  });

  it('uses the World Link alias as the nickname and skips events without a song', () => {
    const byId = songEventsById([
      ev({
        event_id: 200,
        song_id: 739,
        nickname: null,
        wl_alias: 'wl3-1',
        event_type: 'world_bloom'
      }),
      ev({ event_id: 112, song_id: null, nickname: 'wl1-1' }),
      ev({ event_id: 4, song_id: 90, nickname: null })
    ]);
    expect(byId.get('739')?.[0].nickname).toBe('wl3-1');
    expect(byId.get('90')?.[0]).not.toHaveProperty('nickname');
    expect(byId.size).toBe(2);
  });

  it('maps banner, unit, focus character and endedAt when present', () => {
    const byId = songEventsById([
      ev({
        event_id: 69,
        song_id: 236,
        ended_at: 2000,
        unit: 'leo_need',
        focus_character: '日野森志歩',
        focus_character_id: 4,
        banner_url: 'https://storage.sekai.best/banner.webp'
      })
    ]);
    const event = byId.get('236')?.[0];
    expect(event).toMatchObject({
      id: 69,
      endedAt: 2000,
      unit: 'leo_need',
      focusCharacter: '日野森志歩',
      focusCharacterId: 4,
      bannerUrl: 'https://storage.sekai.best/banner.webp'
    });
  });
});

describe('sekaiBestEventUrl', () => {
  it('generates the canonical event URL on sekai.best', () => {
    expect(sekaiBestEventUrl(1)).toBe('https://sekai.best/event/1');
    expect(sekaiBestEventUrl(69)).toBe('https://sekai.best/event/69');
  });
});

describe('credit', () => {
  it('drops empty and "-" credits', () => {
    expect(credit(' kz ')).toBe('kz');
    expect(credit('-')).toBeUndefined();
    expect(credit('')).toBeUndefined();
    expect(credit(null)).toBeUndefined();
  });
});
