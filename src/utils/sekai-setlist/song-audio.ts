// Song audio: the game-size recordings on the Project SEKAI fandom wiki, one per vocal version.
// A song page's files are named like "Gunjou_Sanka_(Game_Version_-_SEKAI).ogg"; the label after
// "Game Version -" says which version it is (SEKAI, VIRTUAL SINGER, a character's Another Vocal…).
import type { AudioKind, SongAudio, SongVersion } from '~/types/sekai';

const IMAGES = 'https://static.wikia.nocookie.net/projectsekai/images/';

// `n`: which of several VIRTUAL SINGER recordings ("VIRTUAL SINGER 2").
interface Label {
  kind: SongVersion | 'numbered_vs' | 'unit';
  n?: number;
}

// A Sekai ver. sung by one unit only is labelled with the unit instead of "SEKAI".
const UNIT_LABEL = /leo.?need|more more jump|vivid bad squad|wonderlands|nightcord|25.?ji/i;

/** Which version a wiki audio file is, or undefined for one that isn't kept. */
export function audioLabel(file: string): Label | undefined {
  const label = /\(Game Version - (.+)\)\.ogg$/i.exec(file.replaceAll('_', ' '))?.[1].trim();
  if (!label) return undefined;
  if (/^SEKAI$/i.test(label)) return { kind: 'sekai' };
  if (/^VIRTUAL SINGER$/i.test(label)) return { kind: 'virtual_singer' };
  const n = /^VIRTUAL SINGER \(?(\d+)\)?$/i.exec(label)?.[1];
  if (n) return { kind: 'numbered_vs', n: Number(n) };
  if (UNIT_LABEL.test(label)) return { kind: 'unit' };
  return undefined; // an Another Vocal, "All Original Units"…
}

/**
 * A song's audio from its wiki files (name -> images path). A second VIRTUAL SINGER recording is
 * the original upload only when the song lists one (`hasOriginal`); a lone unit recording stands
 * in for a missing SEKAI one.
 */
export function songAudio(files: [name: string, path: string][], hasOriginal = false): SongAudio {
  const labelled = files.flatMap(([name, path]) => {
    const label = audioLabel(name);
    return label ? [{ label, path }] : [];
  });
  const find = (kind: Label['kind']) => labelled.filter((f) => f.label.kind === kind);
  const numbered = find('numbered_vs').toSorted((a, b) => a.label.n! - b.label.n!);
  const units = find('unit');
  const sekai = find('sekai')[0] ?? (units.length === 1 ? units[0] : undefined);
  const vs = find('virtual_singer')[0] ?? (hasOriginal ? undefined : numbered[0]);
  const original = hasOriginal ? numbered[0] : undefined;
  return {
    ...(sekai && { sekai: sekai.path }),
    ...(vs && { virtual_singer: vs.path }),
    ...(original && { original: original.path })
  };
}

/** The file for a version, else the nearest one there is: a VS-only cover still plays. */
export function pickAudio(audio: SongAudio | undefined, version: AudioKind = 'sekai') {
  if (!audio) return undefined;
  const order: AudioKind[] = [version, 'sekai', 'virtual_singer', 'original'];
  return order.map((k) => audio[k]).find(Boolean);
}

/** An images path ("8/87/<file>.ogg") from a file URL the wiki API returns. */
export const imagesPath = (url: string) =>
  url.startsWith(IMAGES) ? url.slice(IMAGES.length).replace(/\/revision\/.*$/, '') : undefined;

export const audioUrl = (path: string) => `${IMAGES}${path}/revision/latest`;
