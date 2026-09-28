import '@testing-library/jest-dom/vitest'; // matcher types (vitest-setup.ts is outside tsconfig)
import { describe, expect, it, vi } from 'vitest';
import { LivePage } from '../LivePage';
import { SetlistView } from '../SetlistView';
import { SongSearchPanel } from '../builder/SongSearchPanel';
import { render, screen, waitFor, within } from '~/__test__/utils';
import { getSekaiLive } from '~/utils/sekai-setlist/live-data';
import { newPrediction } from '~/utils/sekai-setlist/prediction';
import { songHref } from '~/utils/sekai-setlist/routes';

const prediction = newPrediction({
  name: 'Chips',
  items: [
    { id: 'a', type: 'song', songId: '64' }, // ステラ, the saki1 event song
    { id: 'b', type: 'song', songId: '1' } // Tell Your World, not an event song
  ]
});
describe('event nickname chips', () => {
  it('shows the nickname on event songs and the (i) button on every song', async () => {
    const [{ container }] = await render(<SetlistView prediction={prediction} />);
    const [stella, tyw] = container.querySelectorAll<HTMLElement>('[data-view-item=song]');
    expect(within(stella).getByText('saki1')).toHaveAttribute('data-nickname', 'saki1');
    expect(tyw.querySelector('[data-nickname]')).toBeNull();
    expect(screen.getByRole('button', { name: 'Song info: Stella' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Song info: Tell Your World' })).toBeInTheDocument();
  });

  it('keeps chips but drops the (i) button in the non-interactive (image export) view', async () => {
    const [{ container }] = await render(
      <SetlistView prediction={prediction} interactive={false} />
    );
    expect(container.querySelector('[data-nickname=saki1]')).not.toBeNull();
    expect(container.querySelector('[data-song-info]')).toBeNull();
  });
});

describe('song-info dialog', () => {
  it('opens from a live setlist with credits, dates and performances', async () => {
    const [, user] = await render(
      <LivePage live={getSekaiLive('project-sekai-colorful-live-3rd-evolve')!} />
    );
    await user.click(screen.getAllByRole('button', { name: 'Song info: Journey' })[0]);
    const dialog = await screen.findByRole('dialog');

    expect(await within(dialog).findAllByText('DECO*27')).toHaveLength(2); // lyrics + music
    // Released at JST midnight, which is still the 29th in UTC.
    expect(within(dialog).getByText('Released').nextSibling).toHaveTextContent('2022-09-30');
    expect(dialog.querySelectorAll('[data-performance-row]')).toHaveLength(8);

    await user.click(within(dialog).getByRole('button', { name: 'Show all (13)' }));
    expect(dialog.querySelectorAll('[data-performance-row]')).toHaveLength(13);
    expect(within(dialog).getByRole('link', { name: 'Open song page' })).toHaveAttribute(
      'href',
      songHref('235')
    );
  });

  it('shows the event and its nickname for event songs', async () => {
    const [, user] = await render(<SetlistView prediction={prediction} />);
    await user.click(screen.getByRole('button', { name: 'Song info: Stella' }));
    const dialog = await screen.findByRole('dialog');
    const event = await within(dialog).findByText('First Star After the Rain');
    expect(event.closest('[data-song-event]')).toHaveTextContent('saki1');
    expect(within(dialog).getAllByText('じん')).toHaveLength(2); // lyrics + music
  });

  it('closes when its song page link is followed', async () => {
    const [, user] = await render(<SetlistView prediction={prediction} />);
    await user.click(screen.getByRole('button', { name: 'Song info: Stella' }));
    const dialog = await screen.findByRole('dialog');
    const link = within(dialog).getByRole('link', { name: 'Open song page' });
    link.addEventListener('click', (e) => e.preventDefault()); // jsdom can't navigate
    await user.click(link);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('opens from the builder search without adding the song', async () => {
    const onAddSong = vi.fn();
    const [, user] = await render(<SongSearchPanel onAddSong={onAddSong} />);
    await user.type(screen.getByRole('textbox', { name: 'Search songs' }), 'saki1');
    const first = (await screen.findAllByRole('button', { name: /^Song info: / }))[0];
    expect(first).toHaveAccessibleName('Song info: Stella');

    await user.dblClick(first);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(onAddSong).not.toHaveBeenCalled();
  });
});

describe('song versions', () => {
  it('shows the VIRTUAL SINGER ver. badge and its singers on a setlist row', async () => {
    const p = newPrediction({
      items: [
        { id: 'a', type: 'song', songId: '178' },
        { id: 'b', type: 'song', songId: '178', version: 'virtual_singer' }
      ]
    });
    const [{ container }] = await render(<SetlistView prediction={p} />);
    const [sekai, vs] = container.querySelectorAll<HTMLElement>('[data-view-item=song]');
    expect(sekai.querySelector('[data-version-badge]')).toBeNull();
    expect(sekai.querySelectorAll('img[alt]:not([alt=""])')).toHaveLength(5);
    expect(within(vs).getByText('VS ver.')).toBeInTheDocument();
    expect(within(sekai).getByAltText('Miku Hatsune')).toBeInTheDocument();
    expect(within(vs).getByAltText('Rin Kagamine')).toBeInTheDocument();
    expect(within(vs).queryByAltText('Miku Hatsune')).toBeNull();
  });

  it('shows performers as character icons, with names that have none as text', async () => {
    const [{ container }] = await render(
      <LivePage live={getSekaiLive('project-sekai-colorful-live-3rd-evolve')!} />
    );
    const rows = [...container.querySelectorAll<HTMLElement>('[data-performers]')];
    expect(rows.length).toBeGreaterThan(0);
    const alts = rows.flatMap((r) => [...r.querySelectorAll('img')].map((i) => i.alt));
    // Units expand into their members
    expect(alts).toEqual(expect.arrayContaining(['Miku Hatsune', 'Ichika Hoshino', 'Emu Otori']));
    expect(container).not.toHaveTextContent('Wonderlands x Showtime');
  });

  it('marks VS performances on a live page and lists versions in the dialog', async () => {
    const [{ container }, user] = await render(
      <LivePage live={getSekaiLive('project-sekai-colorful-live-3rd-evolve')!} />
    );
    // セカイ was sung by the VIRTUAL SINGERs at both shows
    expect(container.querySelectorAll('[data-version-badge]')).toHaveLength(2);

    await user.click(screen.getAllByRole('button', { name: 'Song info: SEKAI' })[0]);
    const dialog = await screen.findByRole('dialog');
    const versions = await within(dialog).findByText('Versions');
    const list = versions.parentElement!;
    expect(list.querySelector('[data-version=sekai]')).toHaveTextContent('Sekai ver.');
    expect(list.querySelector('[data-version=virtual_singer]')).toHaveTextContent(
      'VIRTUAL SINGER ver.'
    );
    expect(list.querySelector('[data-version=original]')).toHaveTextContent('Original ver.');
    expect(dialog.querySelectorAll('[data-performance-row] [data-version-badge]')).toHaveLength(2);
  });
});
