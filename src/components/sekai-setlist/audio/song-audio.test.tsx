import '@testing-library/jest-dom/vitest'; // matcher types (vitest-setup.ts is outside tsconfig)
import { beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { LivePage } from '../LivePage';
import { render, screen, waitFor } from '~/__test__/utils';
import { Page as BuilderPage } from '~/pages/builder/+Page';
import { getSekaiLive } from '~/utils/sekai-setlist/live-data';
import { liveSongVersion } from '~/utils/sekai-setlist/lives';
import { newPrediction } from '~/utils/sekai-setlist/prediction';
import { savePrediction } from '~/utils/sekai-setlist/predictions-store';
import { audioUrl } from '~/utils/sekai-setlist/song-audio';

// Every song has both recordings, except Tell Your World (a VS-only cover) and Stella (none).
vi.mock('~/utils/sekai-setlist/song-audio-data', () => ({
  loadSongAudio: () =>
    Promise.resolve(
      new Proxy(
        {},
        {
          get: (_, id: string) =>
            id === '64'
              ? undefined
              : id === '1'
                ? { virtual_singer: 'v/1.ogg' }
                : { sekai: `s/${id}.ogg`, virtual_singer: `v/${id}.ogg` }
        }
      )
    )
}));

let fetchMock: MockInstance<typeof fetch>;
let pause: MockInstance<() => void>;
beforeEach(() => {
  fetchMock = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(() => Promise.resolve(new Response(new Blob(['ogg']))));
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:audio');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, 'canPlayType').mockReturnValue('probably');
});

const fetched = () => fetchMock.mock.calls.map(([url]) => String(url));
const button = (root: ParentNode, songId: string) =>
  root.querySelector<HTMLElement>(`[data-song-play="${songId}"]`)!;

describe('song play button', () => {
  const openBuilder = async () => {
    const p = savePrediction(
      newPrediction({
        name: 'Audio',
        items: [
          { id: 'a', type: 'song', songId: '178' },
          { id: 'b', type: 'song', songId: '64' },
          { id: 'c', type: 'song', songId: '1' }
        ]
      })
    );
    window.location.search = `?prediction=${p.id}`;
    const [{ container }, user] = await render(<BuilderPage />);
    const row = (id: string) =>
      container.querySelector<HTMLElement>(`[data-setlist-editor] [data-item-id=${id}]`)!;
    await waitFor(() => expect(row('a')).not.toBeNull());
    return { row, user };
  };

  it('plays the version the builder row is switched to, and pauses on a second click', async () => {
    const { row, user } = await openBuilder();
    const a = row('a');

    await user.click(button(a, '178'));
    await waitFor(() => expect(button(a, '178')).toHaveAttribute('data-audio-status', 'playing'));
    expect(fetched()).toEqual([audioUrl('s/178.ogg')]);
    expect(fetchMock.mock.calls[0][1]).toEqual({ referrerPolicy: 'no-referrer' });
    expect(button(a, '178')).toHaveAccessibleName(/^Pause: /);

    await user.click(button(a, '178'));
    expect(button(a, '178')).not.toHaveAttribute('data-audio-status');
    expect(pause).toHaveBeenCalled();

    await user.click(screen.getAllByRole('button', { name: 'VS' })[0]);
    await waitFor(() =>
      expect(button(a, '178')).toHaveAttribute('data-audio-version', 'virtual_singer')
    );
    expect(button(a, '178')).toHaveAccessibleName(/\(VIRTUAL SINGER ver\.\)$/);
    await user.click(button(a, '178'));
    await waitFor(() => expect(button(a, '178')).toHaveAttribute('data-audio-status', 'playing'));
    expect(fetched().at(-1)).toBe(audioUrl('v/178.ogg'));
  });

  it('plays one song at a time and falls back to the recording there is', async () => {
    const { row, user } = await openBuilder();
    await user.click(button(row('a'), '178'));
    await waitFor(() =>
      expect(button(row('a'), '178')).toHaveAttribute('data-audio-status', 'playing')
    );

    // A Sekai ver. row of a VS-only cover plays the VS recording.
    await user.click(button(row('c'), '1'));
    await waitFor(() =>
      expect(button(row('c'), '1')).toHaveAttribute('data-audio-status', 'playing')
    );
    expect(button(row('a'), '178')).not.toHaveAttribute('data-audio-status');
    expect(fetched().at(-1)).toBe(audioUrl('v/1.ogg'));
  });

  it('says so when a song has no audio', async () => {
    const { row, user } = await openBuilder();
    await user.click(button(row('b'), '64'));
    expect(await screen.findByText('No audio for this song')).toBeInTheDocument();
    expect(button(row('b'), '64')).not.toHaveAttribute('data-audio-status');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('says so when the browser cannot play Ogg', async () => {
    vi.mocked(HTMLMediaElement.prototype.canPlayType).mockReturnValue('');
    const { row, user } = await openBuilder();
    await user.click(button(row('a'), '178'));
    expect(await screen.findByText("Your browser can't play this audio")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('says so when the download fails', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 404 }));
    const { row, user } = await openBuilder();
    await user.click(button(row('a'), '178'));
    expect(await screen.findByText('Could not play audio')).toBeInTheDocument();
    expect(button(row('a'), '178')).not.toHaveAttribute('data-audio-status');
  });

  it('plays a live performance in the version it was sung in', async () => {
    const live = getSekaiLive('project-sekai-colorful-live-3rd-evolve')!;
    const vs = live.performances
      .flatMap((p) => p.songs)
      .find((s) => liveSongVersion(s) === 'virtual_singer')!;
    const [{ container }, user] = await render(<LivePage live={live} />);
    const vsButton = container.querySelector<HTMLElement>(
      `[data-song-play="${vs.songId}"][data-audio-version=virtual_singer]`
    )!;
    await user.click(vsButton);
    await waitFor(() => expect(vsButton).toHaveAttribute('data-audio-status', 'playing'));
    expect(fetched()).toEqual([audioUrl(`v/${vs.songId}.ogg`)]);
  });
});
