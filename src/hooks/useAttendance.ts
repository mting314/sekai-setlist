import { useCallback, useEffect, useState } from 'react';
import {
  ATTENDANCE_EVENT,
  EMPTY_ATTENDANCE,
  getAttendance,
  saveAttendance,
  withShow,
  type Attendance,
  type ShowAttendance
} from '~/utils/sekai-setlist/attendance';

/**
 * Your attendance log. Empty during SSR / prerender and the first client render (so the static
 * HTML never mismatches), then read from localStorage and kept in sync with other tabs and other
 * components on the page. `ready` is false until then.
 */
export function useAttendance() {
  const [attendance, setAttendance] = useState<Attendance>(EMPTY_ATTENDANCE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const load = () => setAttendance(getAttendance());
    load();
    setReady(true);
    window.addEventListener('storage', load);
    window.addEventListener(ATTENDANCE_EVENT, load);
    return () => {
      window.removeEventListener('storage', load);
      window.removeEventListener(ATTENDANCE_EVENT, load);
    };
  }, []);

  const setShow = useCallback(
    (liveId: string, showId: string, entry: ShowAttendance | undefined) =>
      saveAttendance(withShow(getAttendance(), liveId, showId, entry)),
    []
  );

  return { attendance, ready, setShow, replace: saveAttendance };
}
