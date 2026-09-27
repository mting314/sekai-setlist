/**
 * Attendance controls for a live page: each show (a date, or a day/night slot) with "I was
 * there" buttons for in person / viewing / stream. Clicking the active one un-logs the show.
 */
import { useTranslation } from 'react-i18next';
import { BiCheckCircle } from 'react-icons/bi';
import { HStack, Stack, styled } from 'styled-system/jsx';
import { Button } from '~/components/ui/styled/button';
import { Text } from '~/components/ui/styled/text';
import { ATTENDANCE_HOWS, type Attendance } from '~/utils/sekai-setlist/attendance';
import { liveShows } from '~/utils/sekai-setlist/shows';
import type { AttendanceHow, SekaiLive } from '~/types/sekai';

const CheckMark = styled('span', {
  base: {
    flexShrink: 0,
    color: 'fg.subtle',
    opacity: 0.4,
    '&[data-attended=true]': { color: 'colorPalette.default', opacity: 1 }
  }
});

export function useHowLabel() {
  const { t } = useTranslation();
  return (how: AttendanceHow) =>
    how === 'in_person'
      ? t('attendance.inPerson', { defaultValue: 'In person' })
      : how === 'viewing'
        ? t('attendance.viewing', { defaultValue: 'Live viewing' })
        : t('attendance.stream', { defaultValue: 'Stream' });
}

/** Multi-select of ways of attending (used as the stats filter on My Lives). */
export function HowFilter({
  value,
  onChange
}: {
  value: AttendanceHow[];
  onChange: (hows: AttendanceHow[]) => void;
}) {
  const howLabel = useHowLabel();
  const toggle = (how: AttendanceHow) => {
    const next = value.includes(how) ? value.filter((h) => h !== how) : [...value, how];
    if (next.length) onChange(ATTENDANCE_HOWS.filter((h) => next.includes(h)));
  };
  return (
    <HStack gap={1} flexWrap="wrap">
      {ATTENDANCE_HOWS.map((how) => (
        <Button
          key={how}
          size="xs"
          variant={value.includes(how) ? 'solid' : 'outline'}
          aria-pressed={value.includes(how)}
          onClick={() => toggle(how)}
        >
          {howLabel(how)}
        </Button>
      ))}
    </HStack>
  );
}

export function ShowAttendance({
  live,
  attendance,
  onChange
}: {
  live: SekaiLive;
  attendance: Attendance;
  onChange: (showId: string, how: AttendanceHow | undefined) => void;
}) {
  const { t } = useTranslation();
  const howLabel = useHowLabel();
  const logged = attendance.shows[live.id] ?? {};

  return (
    <Stack gap={0}>
      {liveShows(live).map((show) => {
        const how = logged[show.id]?.how;
        const setlistName =
          show.performance === undefined
            ? t('attendance.setlistNotRecorded', { defaultValue: 'Setlist not recorded' })
            : show.performance && show.performance !== show.label
              ? show.performance
              : undefined;
        return (
          <HStack
            key={show.id}
            gap={3}
            justifyContent="space-between"
            borderTopWidth="1px"
            py={2}
            flexWrap="wrap"
            _first={{ borderTopWidth: 0 }}
          >
            <HStack gap={2} minW={0}>
              <CheckMark data-attended={!!how}>
                <BiCheckCircle aria-hidden />
              </CheckMark>
              <Stack gap={0} minW={0}>
                <Text fontSize="sm" fontWeight={how ? 'semibold' : 'normal'}>
                  {show.label}
                </Text>
                {(show.date || setlistName) && (
                  <Text color="fg.muted" fontSize="xs">
                    {[show.date, setlistName].filter(Boolean).join(' · ')}
                  </Text>
                )}
              </Stack>
            </HStack>
            <HStack
              role="group"
              aria-label={t('attendance.howAttended', {
                show: show.label,
                defaultValue: `How you attended ${show.label}`
              })}
              gap={1}
            >
              {ATTENDANCE_HOWS.map((h) => (
                <Button
                  key={h}
                  size="xs"
                  variant={how === h ? 'solid' : 'outline'}
                  aria-pressed={how === h}
                  onClick={() => onChange(show.id, how === h ? undefined : h)}
                >
                  {howLabel(h)}
                </Button>
              ))}
            </HStack>
          </HStack>
        );
      })}
    </Stack>
  );
}
