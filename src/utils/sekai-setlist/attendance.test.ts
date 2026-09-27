import { beforeEach, describe, expect, it } from 'vitest';
import {
  EMPTY_ATTENDANCE,
  attendedShowCount,
  decodeAttendance,
  encodeAttendance,
  exportJson,
  getAttendance,
  importJson,
  mergeAttendance,
  parseAttendance,
  setShowAttendance,
  withShow,
  type Attendance
} from './attendance';

const A: Attendance = {
  v: 1,
  shows: { cl3: { 'tokyo-d1-day': { how: 'in_person' }, 'tokyo-d1-night': { how: 'stream' } } }
};

describe('withShow', () => {
  it('sets and clears shows without mutating, dropping empty lives', () => {
    const a = withShow(EMPTY_ATTENDANCE, 'ss', 'main', { how: 'viewing' });
    expect(a.shows).toEqual({ ss: { main: { how: 'viewing' } } });
    expect(EMPTY_ATTENDANCE.shows).toEqual({});
    expect(withShow(a, 'ss', 'main', undefined).shows).toEqual({});
    expect(attendedShowCount(A)).toBe(2);
  });
});

describe('parseAttendance', () => {
  it('drops malformed entries', () => {
    expect(
      parseAttendance({
        shows: {
          a: { x: { how: 'in_person', note: 'front row' }, y: { how: 'teleport' }, z: null },
          b: 'nope'
        }
      })
    ).toEqual({ v: 1, shows: { a: { x: { how: 'in_person', note: 'front row' } } } });
    expect(parseAttendance(null)).toBeUndefined();
    expect(parseAttendance({ v: 1 })).toBeUndefined();
  });
});

describe('import / export', () => {
  it('round-trips and merges with incoming winning', () => {
    expect(importJson(exportJson(A), EMPTY_ATTENDANCE, 'replace')).toEqual(A);
    const mine = withShow(
      withShow(EMPTY_ATTENDANCE, 'cl3', 'tokyo-d1-day', { how: 'viewing' }),
      'ss',
      'main',
      { how: 'in_person' }
    );
    const merged = importJson(exportJson(A), mine, 'merge');
    expect(merged.shows.cl3['tokyo-d1-day'].how).toBe('in_person');
    expect(merged.shows.ss.main.how).toBe('in_person');
    expect(attendedShowCount(merged)).toBe(3);
    expect(mergeAttendance(mine, EMPTY_ATTENDANCE)).toEqual(mine);
  });

  it('rejects files that are not attendance logs', () => {
    expect(() => importJson('[1,2]', EMPTY_ATTENDANCE, 'merge')).toThrow();
    expect(() => importJson('not json', EMPTY_ATTENDANCE, 'merge')).toThrow();
  });
});

describe('share link', () => {
  it('encodes into a hash and decodes back', () => {
    const hash = encodeAttendance(A);
    expect(hash.startsWith('a=')).toBe(true);
    expect(decodeAttendance(`#${hash}`)).toEqual(A);
    expect(decodeAttendance('#s=abc')).toBeUndefined();
    expect(decodeAttendance('#a=garbage')).toBeUndefined();
  });
});

describe('localStorage', () => {
  beforeEach(() => localStorage.clear());

  it('persists show attendance', () => {
    expect(getAttendance()).toEqual(EMPTY_ATTENDANCE);
    setShowAttendance('cl3', 'tokyo-d1-day', { how: 'in_person' });
    expect(getAttendance().shows.cl3['tokyo-d1-day'].how).toBe('in_person');
    setShowAttendance('cl3', 'tokyo-d1-day', undefined);
    expect(getAttendance()).toEqual(EMPTY_ATTENDANCE);
  });

  it('ignores corrupt storage', () => {
    localStorage.setItem('sekai-setlist:attendance', '{oops');
    expect(getAttendance()).toEqual(EMPTY_ATTENDANCE);
  });
});
