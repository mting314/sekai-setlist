import '@testing-library/jest-dom/vitest'; // matcher types (vitest-setup.ts is outside tsconfig)
import { DndContext } from '@dnd-kit/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoadPredictionDialog } from './LoadPredictionDialog';
import { SetlistEditorPanel } from './SetlistEditorPanel';
import { SongSearchPanel } from './SongSearchPanel';
import { fireEvent, render, screen, waitFor, within } from '~/__test__/utils';
import { Page as BuilderPage } from '~/pages/builder/+Page';
import { getSekaiLive } from '~/utils/sekai-setlist/live-data';
import { newPrediction } from '~/utils/sekai-setlist/prediction';
import {
  getPrediction,
  listPredictions,
  savePrediction
} from '~/utils/sekai-setlist/predictions-store';
import { encodeState } from '~/utils/sekai-setlist/share';
import type { PredictionItem } from '~/types/sekai-prediction';

const CL3 = getSekaiLive('project-sekai-colorful-live-3rd-evolve')!;

// vitest-setup swaps window.location for a plain URL, so tests set it directly and read the
// page's own URL updates from history.replaceState.
const replaceState = () => vi.spyOn(history, 'replaceState');
const lastUrl = (spy: ReturnType<typeof replaceState>) => String(spy.mock.calls.at(-1)?.[2]);

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('SongSearchPanel', () => {
  const setup = () => {
    const onAddSong = vi.fn();
    const onAddCustomSong = vi.fn();
    const ui = (
      <DndContext>
        <SongSearchPanel onAddSong={onAddSong} onAddCustomSong={onAddCustomSong} />
      </DndContext>
    );
    return { ui, onAddSong, onAddCustomSong };
  };

  it('finds songs and adds them with → or a double-click', async () => {
    const { ui, onAddSong } = setup();
    const [, user] = await render(ui);
    await user.type(screen.getByRole('textbox', { name: 'Search songs' }), 'Tell Your World');
    await user.click(await screen.findByRole('button', { name: 'Add Tell Your World to setlist' }));
    expect(onAddSong).toHaveBeenLastCalledWith('1');

    const row = document.querySelector('[data-search-result][data-song-id="1"]')!;
    await user.dblClick(row);
    expect(onAddSong).toHaveBeenCalledTimes(2);
  });

  it('offers an unmatched search as a custom song', async () => {
    const { ui, onAddCustomSong } = setup();
    const [, user] = await render(ui);
    const input = screen.getByRole('textbox', { name: 'Search songs' });
    await user.type(input, 'zzqq no such song');
    expect(screen.getByText('No songs found')).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Add "zzqq no such song" as custom song' })
    );
    expect(onAddCustomSong).toHaveBeenCalledWith('zzqq no such song');
    expect(input).toHaveValue('');
  });
});

describe('SetlistEditorPanel', () => {
  const items: PredictionItem[] = [
    { id: 'a', type: 'song', songId: '1' },
    { id: 'b', type: 'mc', title: 'MC' },
    { id: 'c', type: 'custom', name: 'Dream Song' },
    { id: 'd', type: 'encore' },
    { id: 'e', type: 'song', songId: '10' }
  ];

  it('numbers rows and wires the row actions', async () => {
    const onRemove = vi.fn();
    const onMoveDown = vi.fn();
    const [, user] = await render(
      <DndContext>
        <SetlistEditorPanel
          items={items}
          onRemove={onRemove}
          onMoveUp={vi.fn()}
          onMoveDown={onMoveDown}
        />
      </DndContext>
    );
    const labels = [...document.querySelectorAll('[data-item-label]')].map((n) => n.textContent);
    expect(labels).toEqual(['M01', 'MC①', 'M02', 'EN01']);
    expect(screen.getByText('3 songs')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Move Tell Your World down' }));
    expect(onMoveDown).toHaveBeenCalledWith(0);
    await user.click(screen.getByRole('button', { name: 'Remove Dream Song' }));
    expect(onRemove).toHaveBeenCalledWith('c');
  });
});

describe('LoadPredictionDialog', () => {
  it('loads, gates Mark on a performed live, and deletes', async () => {
    const forLive = savePrediction(newPrediction({ name: 'CL3 guess', live: CL3.id }));
    const custom = savePrediction(newPrediction({ name: 'Dream', custom: { name: 'Dream live' } }));
    const onLoad = vi.fn();
    const onMark = vi.fn();
    const [, user] = await render(
      <LoadPredictionDialog open onOpenChange={vi.fn()} onLoad={onLoad} onMark={onMark} />
    );

    await user.click(await screen.findByText('Dream'));
    expect(screen.getByRole('button', { name: 'Not performed yet' })).toBeDisabled();

    await user.click(screen.getByText('CL3 guess'));
    await user.click(screen.getByRole('button', { name: 'Mark' }));
    expect(onMark).toHaveBeenCalledWith(expect.objectContaining({ id: forLive.id }));

    await user.click(screen.getByText('Dream'));
    await user.click(screen.getByRole('button', { name: 'Load' }));
    expect(onLoad).toHaveBeenCalledWith(expect.objectContaining({ id: custom.id }));

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await user.click(screen.getByRole('button', { name: 'Delete Dream' }));
    expect(getPrediction(custom.id)).toBeUndefined();
    await waitFor(() => expect(screen.queryByText('Dream')).not.toBeInTheDocument());
  });
});

describe('builder page', () => {
  it('starts a titled prediction for ?live= and autosaves edits', async () => {
    window.location.search = `?live=${CL3.id}`;
    const urls = replaceState();
    const [, user] = await render(<BuilderPage />);
    const name = await screen.findByRole('textbox', { name: 'Prediction name' });
    expect((name as HTMLInputElement).value).toMatch(/^My .+ prediction$/);
    // Nothing is stored until the first edit.
    expect(listPredictions(CL3.id)).toHaveLength(0);

    await user.type(screen.getByRole('textbox', { name: 'Search songs' }), 'Tell Your World');
    await user.click(await screen.findByRole('button', { name: 'Add Tell Your World to setlist' }));
    await waitFor(() => expect(listPredictions(CL3.id)).toHaveLength(1));
    const [saved] = listPredictions(CL3.id);
    expect(saved.items).toEqual([expect.objectContaining({ type: 'song', songId: '1' })]);
    expect(lastUrl(urls)).toBe(`/builder?prediction=${saved.id}`);
  });

  it('imports a legacy #s= link as a new prediction', async () => {
    const hash = encodeState({
      title: 'Old link',
      songs: ['1', '2', '3'],
      encore: [2],
      ordered: false
    });
    window.location.hash = hash;
    const urls = replaceState();
    await render(<BuilderPage />);
    const name = await screen.findByRole('textbox', { name: 'Prediction name' });
    expect(name).toHaveValue('Old link');
    const [saved] = listPredictions();
    expect(saved.items.map((i) => i.type)).toEqual(['song', 'song', 'encore', 'song']);
    expect(lastUrl(urls)).toBe(`/builder?prediction=${saved.id}`); // hash dropped
    const editor = document.querySelector('[data-setlist-editor]') as HTMLElement;
    expect(within(editor).getByText('EN01')).toBeInTheDocument();
  });

  it('reopens the last prediction and adds quick-add rows', async () => {
    const p = savePrediction(newPrediction({ name: 'Last one' }));
    localStorage.setItem('sekai-setlist:last-prediction', p.id);
    await render(<BuilderPage />);
    expect(await screen.findByRole('textbox', { name: 'Prediction name' })).toHaveValue('Last one');
    const encore = document.querySelector('[data-quick-add="encore"]')!;
    fireEvent.doubleClick(encore);
    await waitFor(() => expect(getPrediction(p.id)?.items).toHaveLength(1));
    expect(getPrediction(p.id)?.items[0].type).toBe('encore');
  });
});
