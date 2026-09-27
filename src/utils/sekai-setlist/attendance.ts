// The shows you've been to, in localStorage (no backend). Portable as a JSON file
// (export/import) and as a read-only share link (#a=, lz-string like share.ts).
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import type { AttendanceHow } from '~/types/sekai';

const KEY = 'sekai-setlist:attendance';
/** Fired on window after this tab writes, so every useAttendance() on the page re-reads. */
export const ATTENDANCE_EVENT = 'sekai-setlist:attendance';

export const ATTENDANCE_HOWS: AttendanceHow[] = ['in_person', 'viewing', 'stream'];

export interface ShowAttendance {
  how: AttendanceHow;
  note?: string;
}

export interface Attendance {
  v: 1;
  shows: Record<string, Record<string, ShowAttendance>>; // liveId → showId → entry
}

export const EMPTY_ATTENDANCE: Attendance = { v: 1, shows: {} };

const isHow = (x: unknown): x is AttendanceHow => ATTENDANCE_HOWS.includes(x as AttendanceHow);

/** Validate untrusted JSON (storage, an imported file, a share link). Drops bad entries. */
export function parseAttendance(x: unknown): Attendance | undefined {
  if (!x || typeof x !== 'object') return undefined;
  const shows = (x as { shows?: unknown }).shows;
  if (!shows || typeof shows !== 'object') return undefined;
  const out: Attendance = { v: 1, shows: {} };
  for (const [liveId, byShow] of Object.entries(shows)) {
    if (!byShow || typeof byShow !== 'object') continue;
    for (const [showId, e] of Object.entries(byShow as Record<string, unknown>)) {
      const entry = e as Partial<ShowAttendance> | null;
      if (!entry || !isHow(entry.how)) continue;
      (out.shows[liveId] ??= {})[showId] = {
        how: entry.how,
        ...(typeof entry.note === 'string' && entry.note ? { note: entry.note } : {})
      };
    }
  }
  return out;
}

/** Set (or with `entry` undefined, clear) one show. Returns a new object. */
export function withShow(
  a: Attendance,
  liveId: string,
  showId: string,
  entry: ShowAttendance | undefined
): Attendance {
  const byShow = { ...a.shows[liveId] };
  if (entry) byShow[showId] = entry;
  else delete byShow[showId];
  const shows = { ...a.shows, [liveId]: byShow };
  if (Object.keys(byShow).length === 0) delete shows[liveId];
  return { v: 1, shows };
}

/** `incoming` wins where both have the same show. */
export function mergeAttendance(base: Attendance, incoming: Attendance): Attendance {
  const shows = { ...base.shows };
  for (const [liveId, byShow] of Object.entries(incoming.shows))
    shows[liveId] = { ...shows[liveId], ...byShow };
  return { v: 1, shows };
}

export const attendedShowCount = (a: Attendance) =>
  Object.values(a.shows).reduce((n, byShow) => n + Object.keys(byShow).length, 0);

// --- localStorage ---

export function getAttendance(): Attendance {
  try {
    const raw = localStorage.getItem(KEY);
    return (raw && parseAttendance(JSON.parse(raw))) || EMPTY_ATTENDANCE;
  } catch {
    return EMPTY_ATTENDANCE;
  }
}

export function saveAttendance(a: Attendance): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(a));
    window.dispatchEvent(new Event(ATTENDANCE_EVENT));
  } catch {
    /* quota / private mode — ignore */
  }
}

export function setShowAttendance(
  liveId: string,
  showId: string,
  entry: ShowAttendance | undefined
): Attendance {
  const next = withShow(getAttendance(), liveId, showId, entry);
  saveAttendance(next);
  return next;
}

// --- export / import ---

export const exportJson = (a: Attendance) => JSON.stringify(a, null, 2);

/** Parse an exported file and merge it into (or replace) `current`. Throws on invalid JSON. */
export function importJson(
  text: string,
  current: Attendance,
  mode: 'merge' | 'replace'
): Attendance {
  const parsed = parseAttendance(JSON.parse(text));
  if (!parsed) throw new Error('Not a Sekai Setlists attendance file');
  return mode === 'merge' ? mergeAttendance(current, parsed) : parsed;
}

// --- share link ---

/** Hash fragment (no leading '#') carrying the whole log. */
export const encodeAttendance = (a: Attendance) =>
  'a=' + compressToEncodedURIComponent(JSON.stringify(a));

export function decodeAttendance(hash: string): Attendance | undefined {
  const m = /(?:^|[#&])a=([^&]+)/.exec(hash);
  if (!m) return undefined;
  try {
    const json = decompressFromEncodedURIComponent(m[1]);
    return json ? parseAttendance(JSON.parse(json)) : undefined;
  } catch {
    return undefined;
  }
}
