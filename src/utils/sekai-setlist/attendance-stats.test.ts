import { describe, expect, it } from 'vitest';
import { attendanceStats, attendedShows, timesHeard } from './attendance-stats';
import type { Attendance } from './attendance';
import type { SekaiLive, SekaiLiveShow, SekaiSong } from '~/types/sekai';

const SONGS = new Map<string, SekaiSong>(
  [
    ['1', ['leo_need']],
    ['2', ['nightcord', 'virtual_singer']],
    ['3', []]
  ].map(([id, units]) => [
    id as string,
    {
      id: id as string,
      title: `song${id}`,
      units: units as SekaiSong['units'],
      characters: [],
      assetbundleName: '',
      commissioned: true
    }
  ])
);
const getSong = (id: string) => SONGS.get(id);

const live = (id: string, startDate: string, sets: Record<string, string[]>): SekaiLive => ({
  id,
  series: 'colorful_live',
  name: id,
  date: startDate,
  startDate,
  notes: [],
  source: '',
  performances: Object.entries(sets).map(([name, ids]) => ({
    name,
    markers: [],
    songs: ids.map((songId) => (songId === '?' ? { title: 'collab' } : { songId, title: songId }))
  }))
});

const CL = live('cl', '2024-01-26', { Day: ['1', '2', '?'], Night: ['1', '3'] });
const SS = live('ss', '2025-06-15', { '': ['2'] });
const SHOWS: Record<string, SekaiLiveShow[]> = {
  cl: [
    { id: 'd1-day', label: 'Day 1 · Daytime', date: '2024-01-26', performance: 'Day' },
    { id: 'd1-night', label: 'Day 1 · Night', date: '2024-01-26', performance: 'Night' },
    { id: 'tokyo', label: 'Tokyo', date: '2024-03-01' } // setlist not recorded
  ],
  ss: [{ id: 'main', label: 'June 15, 2025', performance: '' }]
};
const showsOf = (l: SekaiLive) => SHOWS[l.id];

const LOG: Attendance = {
  v: 1,
  shows: {
    cl: {
      'd1-day': { how: 'in_person' },
      'd1-night': { how: 'stream' },
      tokyo: { how: 'in_person' }
    },
    ss: { main: { how: 'viewing' }, gone: { how: 'in_person' } }
  }
};

describe('attendedShows', () => {
  const shows = attendedShows(LOG, [CL, SS], showsOf);

  it('lists shows newest first with their setlists, keeping unknown show ids', () => {
    expect(shows.map((s) => `${s.live.id}/${s.show.id}`)).toEqual([
      'ss/gone',
      'ss/main',
      'cl/tokyo',
      'cl/d1-day',
      'cl/d1-night'
    ]);
    expect(shows.find((s) => s.show.id === 'd1-night')?.perf?.name).toBe('Night');
    expect(shows.find((s) => s.show.id === 'tokyo')?.perf).toBeUndefined();
    expect(shows.find((s) => s.show.id === 'gone')?.show.label).toBe('gone');
  });

  it('computes stats for in-person only', () => {
    const st = attendanceStats(shows, ['in_person'], getSong);
    expect(st.shows).toHaveLength(3);
    expect(st.lives).toBe(2);
    expect(st.unrecorded).toBe(2); // cl/tokyo and ss/gone
    expect([...st.songsHeard]).toEqual([
      ['1', 1],
      ['2', 1]
    ]);
    expect(st.byUnit).toEqual({ leo_need: 1, nightcord: 1, virtual_singer: 1 });
  });

  it('widens with every way of attending', () => {
    const st = attendanceStats(shows, ['in_person', 'viewing', 'stream'], getSong);
    expect(st.shows).toHaveLength(5);
    expect(st.songsHeard.get('1')).toBe(2);
    expect(st.songsHeard.get('2')).toBe(2);
    expect(st.byUnit.other).toBe(1);
  });

  it('counts times heard per way of attending', () => {
    expect(timesHeard(shows, '2')).toEqual({ in_person: 1, viewing: 1, stream: 0 });
    expect(timesHeard(shows, '9')).toEqual({ in_person: 0, viewing: 0, stream: 0 });
  });
});
