import '@testing-library/jest-dom/vitest'; // matcher types (vitest-setup.ts is outside tsconfig)
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ViewPrediction } from '../ViewPrediction';
import { EditItemDialog } from './EditItemDialog';
import { ExportShareTools, exportFileName } from './ExportShareTools';
import { ImportDialog } from './ImportDialog';
import { fireEvent, render, screen, waitFor } from '~/__test__/utils';
import { Page as BuilderPage } from '~/pages/builder/+Page';
import { getSekaiLive } from '~/utils/sekai-setlist/live-data';
import { performanceToItems } from '~/utils/sekai-setlist/lives';
import { exportText, newPrediction } from '~/utils/sekai-setlist/prediction';
import {
  getPrediction,
  listPredictions,
  savePrediction
} from '~/utils/sekai-setlist/predictions-store';
import { decodeShare, encodePrediction } from '~/utils/sekai-setlist/share';
import type { PredictionItem } from '~/types/sekai-prediction';

vi.mock('modern-screenshot', () => ({
  domToPng: vi.fn(() => Promise.resolve('data:image/png;base64,AAAA'))
}));

const CL3 = getSekaiLive('project-sekai-colorful-live-3rd-evolve')!;
const withoutIds = (items: PredictionItem[]) => items.map(({ id: _id, ...rest }) => rest);

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('EditItemDialog', () => {
  it('swaps a song and sets remarks from a suggestion', async () => {
    const onSave = vi.fn();
    const [, user] = await render(
      <EditItemDialog
        open
        onOpenChange={vi.fn()}
        item={{ id: 'a', type: 'song', songId: '1' }}
        onSave={onSave}
      />
    );
    await user.type(
      await screen.findByRole('textbox', { name: 'Search for a replacement song' }),
      'world'
    );
    const pick = [...document.querySelectorAll<HTMLElement>('[data-replacement]')].find(
      (b) => b.dataset.replacement !== '1'
    )!;
    await user.click(pick);
    expect(document.querySelector('[data-staged-song]')).toHaveAttribute(
      'data-staged-song',
      pick.dataset.replacement
    );
    await user.click(screen.getByRole('button', { name: 'VIRTUAL SINGER Ver.' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith({
      id: 'a',
      type: 'song',
      songId: pick.dataset.replacement,
      remarks: 'VIRTUAL SINGER Ver.'
    });
  });

  it('retitles an MC and renames or links a custom song', async () => {
    const onSave = vi.fn();
    const [res, user] = await render(
      <EditItemDialog
        open
        onOpenChange={vi.fn()}
        item={{ id: 'm', type: 'mc', title: 'MC' }}
        onSave={onSave}
      />
    );
    const title = await screen.findByRole('textbox', { name: 'Title' });
    await user.clear(title);
    await user.type(title, 'Talk');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenLastCalledWith({ id: 'm', type: 'mc', title: 'Talk' });

    res.rerender(
      <EditItemDialog
        key="c"
        open
        onOpenChange={vi.fn()}
        item={{ id: 'c', type: 'custom', name: 'Dream' }}
        onSave={onSave}
      />
    );
    const name = await screen.findByRole('textbox', { name: 'Custom song name' });
    await user.clear(name);
    await user.type(name, 'Dream Song');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenLastCalledWith({ id: 'c', type: 'custom', name: 'Dream Song' });

    await user.type(
      screen.getByRole('textbox', { name: 'Search for a replacement song' }),
      'Tell Your World'
    );
    await user.click(document.querySelector('[data-replacement="1"]')!);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenLastCalledWith({ id: 'c', type: 'song', songId: '1' });
  });
});

describe('ImportDialog', () => {
  it('imports pasted text, keeping song ids and turning unknown lines into custom songs', async () => {
    const onImport = vi.fn();
    const [, user] = await render(<ImportDialog open onOpenChange={vi.fn()} onImport={onImport} />);
    await user.click(await screen.findByRole('button', { name: 'Text' }));
    await user.click(screen.getByRole('textbox', { name: 'Setlist text' }));
    await user.paste('M01 Tell Your World\nMC\nzzqq unknown song');
    expect(
      screen.getByText(/1 line didn’t match a song and will be added as a custom song/)
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Import' }));
    expect(withoutIds(onImport.mock.calls[0][0] as PredictionItem[])).toEqual([
      { type: 'song', songId: '1' },
      { type: 'mc', title: 'MC' },
      { type: 'custom', name: 'zzqq unknown song' }
    ]);
  });

  it('imports a past setlist after previewing it', async () => {
    const onImport = vi.fn();
    const [, user] = await render(<ImportDialog open onOpenChange={vi.fn()} onImport={onImport} />);
    await user.type(await screen.findByRole('textbox', { name: 'Search lives' }), 'evolve');
    const option = document.querySelector(`[data-setlist-option="${CL3.id}#0"]`)!;
    await user.click(option);
    expect(document.querySelector('[data-import-preview] [data-setlist-view]')).not.toBeNull();
    await user.click(screen.getByRole('button', { name: 'Import' }));
    expect(withoutIds(onImport.mock.calls[0][0] as PredictionItem[])).toEqual(
      withoutIds(performanceToItems(CL3.performances[0]))
    );
  });

  it('rejects JSON that is not a prediction and accepts an export', async () => {
    const onImport = vi.fn();
    const [, user] = await render(<ImportDialog open onOpenChange={vi.fn()} onImport={onImport} />);
    await user.click(await screen.findByRole('button', { name: 'JSON' }));
    const box = screen.getByRole('textbox', { name: 'Prediction JSON' });
    await user.click(box);
    await user.paste('{"nope": true}');
    expect(screen.getByText(/isn’t a prediction exported/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import' })).toBeDisabled();

    const exported = newPrediction({
      name: 'x',
      items: [{ id: 'a', type: 'song', songId: '1', remarks: 'Short Ver.' }]
    });
    fireEvent.change(box, { target: { value: JSON.stringify(exported) } });
    await user.click(screen.getByRole('button', { name: 'Import' }));
    expect(onImport).toHaveBeenCalledWith(exported.items);
  });
});

describe('ExportShareTools', () => {
  const prediction = newPrediction({
    name: 'My CL3 guess',
    live: CL3.id,
    items: [
      { id: 'a', type: 'song', songId: '1' },
      { id: 'b', type: 'encore' },
      { id: 'c', type: 'custom', name: 'New song', remarks: 'Short Ver.' }
    ]
  });

  it('copies a /view share link and the setlist as text', async () => {
    const [, user] = await render(<ExportShareTools prediction={prediction} />);
    await user.click(screen.getByRole('button', { name: 'Copy share link' }));
    const url = new URL(await navigator.clipboard.readText());
    expect(url.pathname).toBe('/view');
    expect(withoutIds(decodeShare(url.hash)!.prediction.items)).toEqual(
      withoutIds(prediction.items)
    );

    await user.type(screen.getByRole('textbox', { name: 'Your name (optional)' }), 'Mizuki');
    await user.click(screen.getByRole('button', { name: 'Copy as text' }));
    expect(await navigator.clipboard.readText()).toBe(
      `${exportText(prediction, 'en')}\n\n— Mizuki`
    );
  });

  it('refuses links that are too long', async () => {
    const long = newPrediction({
      name: 'Long',
      items: Array.from({ length: 200 }, (_, i) => ({
        id: String(i),
        type: 'custom' as const,
        name: `An entirely made-up song title number ${i} ${Math.random()}`
      }))
    });
    const [, user] = await render(<ExportShareTools prediction={long} />);
    await user.click(screen.getByRole('button', { name: 'Copy share link' }));
    expect(await screen.findByText(/too long for a link/)).toBeInTheDocument();
  });

  it('downloads the image through modern-screenshot', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const [, user] = await render(<ExportShareTools prediction={prediction} />);
    await user.click(screen.getByRole('button', { name: 'Download image' }));
    await waitFor(() => expect(click).toHaveBeenCalled());
    const link = click.mock.contexts[0] as HTMLAnchorElement;
    expect(link.download).toBe('my-cl3-guess.png');
    expect(link.href).toBe('data:image/png;base64,AAAA');
    expect(exportFileName(newPrediction({ name: '6周年 予想' }), 'ja')).toBe('6周年-予想');
  });
});

describe('ViewPrediction', () => {
  it('shows a shared prediction and saves it once', async () => {
    const shared = newPrediction({
      name: 'Shared guess',
      live: CL3.id,
      items: [{ id: 'a', type: 'song', songId: '1' }]
    });
    window.location.hash = encodePrediction(shared);
    const [, user] = await render(<ViewPrediction />);
    expect(await screen.findByText('Shared guess')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mark' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/mark\?live=.+#p=/)
    );
    await user.click(screen.getByRole('button', { name: 'Save to my predictions' }));
    expect(listPredictions()).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Saved' })).toBeDisabled();
    expect(screen.getByRole('link', { name: 'Mark' })).toHaveAttribute(
      'href',
      `/mark?prediction=${listPredictions()[0].id}&live=${CL3.id}`
    );
  });

  it('explains a link without a prediction', async () => {
    await render(<ViewPrediction />);
    expect(await screen.findByText(/doesn’t contain a setlist prediction/)).toBeInTheDocument();
  });
});

describe('builder page editing', () => {
  it('edits a row through the dialog and autosaves it', async () => {
    const p = savePrediction(
      newPrediction({ name: 'Edit me', items: [{ id: 'a', type: 'song', songId: '1' }] })
    );
    window.location.search = `?prediction=${p.id}`;
    const [, user] = await render(<BuilderPage />);
    const editor = await screen.findAllByRole('button', { name: 'Edit Tell Your World' });
    await user.click(editor[0]);
    await user.click(await screen.findByRole('button', { name: 'Short Ver.' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(getPrediction(p.id)?.items[0]).toEqual({
        id: 'a',
        type: 'song',
        songId: '1',
        remarks: 'Short Ver.'
      })
    );
  });
});
