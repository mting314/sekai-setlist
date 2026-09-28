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
  domToBlob: vi.fn(() => Promise.resolve(new Blob(['png'], { type: 'image/png' })))
}));

const CL3 = getSekaiLive('project-sekai-colorful-live-3rd-evolve')!;
const withoutIds = (items: PredictionItem[]) => items.map(({ id: _id, ...rest }) => rest);

beforeEach(() => localStorage.clear());
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

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
    await user.click(screen.getByRole('button', { name: 'Short Ver.' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith({
      id: 'a',
      type: 'song',
      songId: pick.dataset.replacement,
      remarks: 'Short Ver.'
    });
  });

  it('switches a song to its VIRTUAL SINGER ver. and back', async () => {
    const onSave = vi.fn();
    const [, user] = await render(
      <EditItemDialog
        open
        onOpenChange={vi.fn()}
        item={{ id: 'a', type: 'song', songId: '178' }}
        onSave={onSave}
      />
    );
    const sekai = await waitFor(() => {
      const el = document.querySelector<HTMLElement>('[data-version-option="sekai"]');
      expect(el).not.toBeNull();
      return el!;
    });
    const vs = document.querySelector<HTMLElement>('[data-version-option="virtual_singer"]')!;
    expect(sekai).toHaveAttribute('aria-pressed', 'true');
    // Each option shows its own singers: WxS + Miku, or Rin + Len
    expect(sekai.querySelectorAll('img')).toHaveLength(5);
    expect([...vs.querySelectorAll('img')].map((i) => i.alt)).toEqual([
      'Rin Kagamine',
      'Len Kagamine'
    ]);
    await user.click(vs);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenLastCalledWith({
      id: 'a',
      type: 'song',
      songId: '178',
      version: 'virtual_singer'
    });
  });

  it('has no version picker for a song with one version', async () => {
    await render(
      <EditItemDialog
        open
        onOpenChange={vi.fn()}
        item={{ id: 'a', type: 'song', songId: '1' }}
        onSave={vi.fn()}
      />
    );
    await screen.findByRole('button', { name: 'Save' });
    expect(document.querySelector('[data-version-option]')).toBeNull();
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

// jsdom's Blob has no text().
const blobText = (blob: Blob) =>
  new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(reader.result as string));
    reader.readAsText(blob);
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
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:image');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const [, user] = await render(<ExportShareTools prediction={prediction} />);
    await user.click(screen.getByRole('button', { name: 'Download image' }));
    await waitFor(() => expect(click).toHaveBeenCalled());
    const link = click.mock.contexts[0] as HTMLAnchorElement;
    expect(link.download).toBe('my-cl3-guess.png');
    expect(link.href).toBe('blob:image');
    // Revoked later: Safari starts the download after click() returns
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    expect(exportFileName(newPrediction({ name: '6周年 予想' }), 'ja')).toBe('6周年-予想');
  });

  it('shares to X with the name, author and link', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const [, user] = await render(<ExportShareTools prediction={prediction} />);
    await user.type(screen.getByRole('textbox', { name: 'Your name (optional)' }), 'Mizuki');
    await user.click(screen.getByRole('button', { name: 'Share on X' }));
    const url = new URL(open.mock.calls[0][0] as string);
    expect(url.origin + url.pathname).toBe('https://twitter.com/intent/tweet');
    const text = url.searchParams.get('text')!;
    expect(text).toContain('My CL3 guess');
    expect(text).toContain('— Mizuki');
    expect(text).toMatch(/\/view#p=/);
  });

  it('copies the text, link and image to the clipboard', async () => {
    class FakeClipboardItem {
      constructor(public items: Record<string, Blob>) {}
    }
    vi.stubGlobal('ClipboardItem', FakeClipboardItem);
    const [, user] = await render(<ExportShareTools prediction={prediction} />);
    // user-event installs its clipboard on render, so spy on it afterwards.
    const write = vi.spyOn(navigator.clipboard, 'write').mockResolvedValue();
    await user.click(screen.getByRole('button', { name: 'Copy text + image' }));
    expect(await screen.findByText('Text and image copied')).toBeInTheDocument();
    const item = write.mock.calls[0][0][0] as unknown as FakeClipboardItem;
    expect(Object.keys(item.items).toSorted()).toEqual(['image/png', 'text/plain']);
    const text = await blobText(item.items['text/plain']);
    expect(text).toContain(exportText(prediction, 'en'));
    expect(text).toMatch(/\/view#p=/);
  });

  it('says it is creating the image until the copy lands', async () => {
    class FakeClipboardItem {
      constructor(public items: Record<string, Blob | Promise<Blob>>) {}
    }
    vi.stubGlobal('ClipboardItem', FakeClipboardItem);
    const { domToBlob } = await import('modern-screenshot');
    let finishRendering: ((image: Blob) => void) | undefined;
    const rendering = new Promise<Blob>((resolve) => {
      finishRendering = resolve;
    });
    vi.mocked(domToBlob).mockImplementationOnce(() => rendering);
    const [, user] = await render(<ExportShareTools prediction={prediction} />);
    // Like a browser, the write waits for the image.
    vi.spyOn(navigator.clipboard, 'write').mockImplementation(async (items) => {
      await (items[0] as unknown as FakeClipboardItem).items['image/png'];
    });
    await user.click(screen.getByRole('button', { name: 'Copy text + image' }));
    // The toast, and the button's own label
    expect(await screen.findAllByText('Creating image…')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Creating image…' })).toBeDisabled();
    finishRendering?.(new Blob(['png'], { type: 'image/png' }));
    expect(await screen.findByText('Text and image copied')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Creating image…')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Copy text + image' })).toBeEnabled();
  });

  it.each([
    ['the image fails', 'Could not create the image'],
    ['the clipboard refuses', 'Could not copy to the clipboard']
  ])('says so when %s, and stops saying it is creating the image', async (failure, message) => {
    class FakeClipboardItem {
      constructor(public items: Record<string, Blob | Promise<Blob>>) {}
    }
    vi.stubGlobal('ClipboardItem', FakeClipboardItem);
    const { domToBlob } = await import('modern-screenshot');
    if (failure === 'the image fails')
      vi.mocked(domToBlob).mockImplementationOnce(() => Promise.reject(new Error('CORS')));
    const [, user] = await render(<ExportShareTools prediction={prediction} />);
    vi.spyOn(navigator.clipboard, 'write').mockImplementation(async (items) => {
      await (items[0] as unknown as FakeClipboardItem).items['image/png'];
      throw new DOMException('Denied', 'NotAllowedError');
    });
    await user.click(screen.getByRole('button', { name: 'Copy text + image' }));
    expect(await screen.findByText(message)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Creating image…')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Copy text + image' })).toBeEnabled();
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
    // Twice: the page and the off-screen copy the share image is taken from.
    expect(await screen.findAllByText('Shared guess')).toHaveLength(2);
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

  it('shares a shared prediction to X or the clipboard', async () => {
    class FakeClipboardItem {
      constructor(public items: Record<string, Blob>) {}
    }
    vi.stubGlobal('ClipboardItem', FakeClipboardItem);
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const shared = newPrediction({
      name: 'Shared guess',
      items: [{ id: 'a', type: 'song', songId: '1' }]
    });
    window.location.hash = encodePrediction(shared);
    const [, user] = await render(<ViewPrediction />);
    await user.click(await screen.findByRole('button', { name: 'Share on X' }));
    expect(new URL(open.mock.calls[0][0] as string).searchParams.get('text')).toContain(
      'Shared guess'
    );
    const write = vi.spyOn(navigator.clipboard, 'write').mockResolvedValue();
    await user.click(screen.getByRole('button', { name: 'Copy text + image' }));
    expect(await screen.findByText('Text and image copied')).toBeInTheDocument();
    const item = write.mock.calls[0][0][0] as unknown as FakeClipboardItem;
    expect(await blobText(item.items['text/plain'])).toContain('Tell Your World');
  });

  it('explains a link without a prediction', async () => {
    await render(<ViewPrediction />);
    expect(await screen.findByText(/doesn’t contain a setlist prediction/)).toBeInTheDocument();
  });
});

describe('builder page editing', () => {
  it('switches a row between the Sekai ver. and VIRTUAL SINGER ver. in place', async () => {
    const p = savePrediction(
      newPrediction({
        name: 'Versions',
        items: [
          { id: 'a', type: 'song', songId: '178' },
          { id: 'b', type: 'song', songId: '1' } // Tell Your World has one version
        ]
      })
    );
    window.location.search = `?prediction=${p.id}`;
    const [{ container }, user] = await render(<BuilderPage />);
    const row = await waitFor(() => {
      const el = container.querySelector<HTMLElement>('[data-setlist-editor] [data-item-id=a]');
      expect(el).not.toBeNull();
      return el!;
    });
    expect(
      container.querySelector('[data-setlist-editor] [data-item-id=b] [data-version-switch]')
    ).toBeNull();
    expect(row.querySelector('[data-version-switch]')).toHaveAttribute(
      'data-version-switch',
      'sekai'
    );
    await user.click(screen.getByRole('button', { name: 'VIRTUAL SINGER ver.' }));
    await waitFor(() =>
      expect(getPrediction(p.id)?.items[0]).toEqual({
        id: 'a',
        type: 'song',
        songId: '178',
        version: 'virtual_singer'
      })
    );
    expect(
      [...row.querySelectorAll<HTMLImageElement>('img[alt]:not([alt=""])')].map((i) => i.alt)
    ).toEqual(['Rin Kagamine', 'Len Kagamine']);
    // The switch shows the version, so the title has no badge
    expect(row.querySelector('[data-version-badge]')).toBeNull();
  });

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
