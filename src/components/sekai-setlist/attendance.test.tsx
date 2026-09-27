import '@testing-library/jest-dom/vitest'; // matcher types (vitest-setup.ts is outside tsconfig)
import { beforeEach, describe, expect, it } from 'vitest';
import { LivePage } from './LivePage';
import { MyLives } from './MyLives';
import { SongPage } from './SongPage';
import { render, screen, within } from '~/__test__/utils';
import { encodeAttendance, getAttendance, type Attendance } from '~/utils/sekai-setlist/attendance';
import { getSekaiSong } from '~/utils/sekai-setlist/catalog';
import { getSekaiLive } from '~/utils/sekai-setlist/live-data';

const CL3 = getSekaiLive('project-sekai-colorful-live-3rd-evolve')!;
const LOG: Attendance = {
  v: 1,
  shows: {
    'project-sekai-colorful-live-3rd-evolve': { 'tokyo-d1-day': { how: 'in_person' } },
    'sekai-symphony-2021': { main: { how: 'stream' } }
  }
};
// First song of CL3's daytime setlist, heard in person in LOG.
const heardSong = CL3.performances[0].songs.find((s) => s.songId)!.songId!;

beforeEach(() => localStorage.clear());

describe('live page attendance', () => {
  it('logs and un-logs a show, marking its setlist', async () => {
    const [, user] = await render(<LivePage live={CL3} />);
    const row = await screen.findByRole('group', {
      name: 'How you attended Tokyo Day 1 · Daytime'
    });
    expect(screen.queryByText('You were here')).not.toBeInTheDocument();

    await user.click(within(row).getByRole('button', { name: 'In person' }));
    expect(getAttendance().shows[CL3.id]).toEqual({ 'tokyo-d1-day': { how: 'in_person' } });
    expect(within(row).getByRole('button', { name: 'In person' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    // Only the daytime setlist is marked.
    expect(screen.getAllByText('You were here')).toHaveLength(1);

    await user.click(within(row).getByRole('button', { name: 'Stream' }));
    expect(getAttendance().shows[CL3.id]['tokyo-d1-day'].how).toBe('stream');

    await user.click(within(row).getByRole('button', { name: 'Stream' }));
    expect(getAttendance().shows[CL3.id]).toBeUndefined();
    expect(screen.queryByText('You were here')).not.toBeInTheDocument();
  });

  it('flags shows whose setlist is not recorded', async () => {
    await render(<LivePage live={getSekaiLive('project-sekai-colorful-live-4th-unison')!} />);
    expect(await screen.findAllByText(/Setlist not recorded/)).toHaveLength(6); // Tokyo × 3 days × 2
  });
});

describe('My Lives', () => {
  it('shows an empty state with no log', async () => {
    await render(<MyLives />);
    expect(await screen.findByText("You haven't logged any shows yet.")).toBeInTheDocument();
  });

  it('counts in-person only by default and widens with the filter', async () => {
    localStorage.setItem('sekai-setlist:attendance', JSON.stringify(LOG));
    const [, user] = await render(<MyLives />);
    const livesStat = async () =>
      (await screen.findByText('Lives', { selector: 'p' })).nextElementSibling?.textContent;
    expect(await livesStat()).toBe('1');
    await user.click(screen.getByRole('button', { name: 'Stream' }));
    expect(await livesStat()).toBe('2');
    expect(screen.getByRole('button', { name: /Export/ })).toBeEnabled();
  });

  it('shows a shared log read-only', async () => {
    window.location.hash = `#${encodeAttendance(LOG)}`;
    await render(<MyLives />);
    expect(await screen.findByText(/viewing a shared log \(2 shows\)/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Export/ })).not.toBeInTheDocument();
    expect(getAttendance().shows).toEqual({});
  });
});

describe('song page', () => {
  it('says how many times you heard the song', async () => {
    localStorage.setItem('sekai-setlist:attendance', JSON.stringify(LOG));
    await render(<SongPage song={getSekaiSong(heardSong)!} />);
    expect(await screen.findByText(/You heard this live/)).toBeInTheDocument();
  });
});
