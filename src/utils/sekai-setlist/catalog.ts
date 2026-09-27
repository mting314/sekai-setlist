// Bundled Project Sekai catalog (data/sekai/*.json) with O(1) lookups and display helpers.
import songsData from '../../../data/sekai/songs.json';
import unitsData from '../../../data/sekai/units.json';
import charactersData from '../../../data/sekai/characters.json';
import livesData from '../../../data/sekai/lives.json';
import type { SekaiCharacter, SekaiLive, SekaiSong, SekaiUnitMeta } from '~/types/sekai';

export const sekaiSongs = songsData as unknown as SekaiSong[];
export const sekaiUnits = unitsData as unknown as SekaiUnitMeta[];
const sekaiCharacters = charactersData as SekaiCharacter[];

const songById = new Map<string, SekaiSong>(sekaiSongs.map((s) => [s.id, s]));
const unitById = new Map<string, SekaiUnitMeta>(sekaiUnits.map((u) => [u.id, u]));
const characterById = new Map<number, SekaiCharacter>(sekaiCharacters.map((c) => [c.id, c]));

const OTHER_COLOR = '#8a8a8a';

export const getSekaiSong = (id: string) => songById.get(id);

/** Display name: the EN title for English UI when known, otherwise the JP title. */
export const sekaiSongName = (id: string, lang: string) => {
  const s = songById.get(id);
  if (!s) return id;
  return lang?.toLowerCase().startsWith('en') ? (s.englishName ?? s.title) : s.title;
};

/** Secondary line: whichever of JP title / EN title isn't the display name, if any. */
export const sekaiSongSubName = (id: string, lang: string) => {
  const s = songById.get(id);
  if (!s?.englishName) return undefined;
  return lang?.toLowerCase().startsWith('en') ? s.title : s.englishName;
};

export const sekaiCharacterName = (id: number, lang: string) => {
  const c = characterById.get(id);
  if (!c) return String(id);
  return lang?.toLowerCase().startsWith('ja') ? c.nameJa : c.name;
};

export const sekaiUnitColor = (id: string) => unitById.get(id)?.color ?? OTHER_COLOR;

// Unit hex colors for a song's color bar. A no-unit song falls back to the "Other" color;
// multi-unit songs get every involved color.
export function sekaiSongColors(id: string): string[] {
  const cs = (songById.get(id)?.units ?? []).map((u) => sekaiUnitColor(u));
  return cs.length ? cs : [sekaiUnitColor('other')];
}

// CSS background for a color bar: a single color, or equal hard-stop segments (top→bottom)
// when a song spans multiple units.
export function colorBarBackground(colors: string[]): string {
  if (colors.length <= 1) return colors[0] ?? OTHER_COLOR;
  const n = colors.length;
  const stops = colors
    .map((c, i) => `${c} ${((i * 100) / n).toFixed(2)}% ${(((i + 1) * 100) / n).toFixed(2)}%`)
    .join(', ');
  return `linear-gradient(to bottom, ${stops})`;
}

// Past lives (data/sekai/lives.json, from scripts/fetch-sekai-lives.ts).
export const sekaiLives = livesData as unknown as SekaiLive[];
