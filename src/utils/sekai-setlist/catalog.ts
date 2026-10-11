// Bundled Project Sekai catalog (data/sekai/*.json) with O(1) lookups and display helpers.
import songsData from '../../../data/sekai/songs.json';
import unitsData from '../../../data/sekai/units.json';
import charactersData from '../../../data/sekai/characters.json';
import type { SekaiCharacter, SekaiSong, SekaiUnitMeta, SongVersion } from '~/types/sekai';

export const sekaiSongs = songsData as unknown as SekaiSong[];
export const sekaiUnits = unitsData as unknown as SekaiUnitMeta[];
export const sekaiCharacters = charactersData as SekaiCharacter[];

const songById = new Map<string, SekaiSong>(sekaiSongs.map((s) => [s.id, s]));
const unitById = new Map<string, SekaiUnitMeta>(sekaiUnits.map((u) => [u.id, u]));
const characterById = new Map<number, SekaiCharacter>(sekaiCharacters.map((c) => [c.id, c]));

const OTHER_COLOR = '#8a8a8a';

export const getSekaiSong = (id: string) => songById.get(id);
export const getSekaiUnit = (id: string) => unitById.get(id);

/** Whether a song has both a Sekai ver. and a VIRTUAL SINGER ver. to choose between. */
export const hasVsVersion = (id: string) => !!songById.get(id)?.vsCharacters;

/** Vocalist ids of a song's version (the Sekai ver. unless VS is asked for and exists). */
export const songVocalists = (id: string, version?: SongVersion): number[] => {
  const s = songById.get(id);
  return (version === 'virtual_singer' && s?.vsCharacters) || s?.characters || [];
};

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

export const SEKAI_CHARACTER_COLORS: Record<number, string> = {
  1: '#33aaee', // Ichika Hoshino
  2: '#ffdd45', // Saki Tenma
  3: '#ee6666', // Honami Mochizuki
  4: '#bbde22', // Shiho Hinomori
  5: '#ffcdac', // Minori Hanasato
  6: '#99cdff', // Haruka Kiritani
  7: '#ffa9cc', // Airi Momoi
  8: '#9aeede', // Shizuku Hinomori
  9: '#ff679a', // Kohane Azusawa
  10: '#00bbdc', // An Shiraishi
  11: '#ff7721', // Akito Shinonome
  12: '#0077dd', // Toya Aoyagi
  13: '#ffbb00', // Tsukasa Tenma
  14: '#ff66bc', // Emu Otori
  15: '#34dd9a', // Nene Kusanagi
  16: '#bb88ed', // Rui Kamishiro
  17: '#bb6588', // Kanade Yoisaki
  18: '#8889cc', // Mafuyu Asahina
  19: '#ccaa87', // Ena Shinonome
  20: '#e4a8ca', // Mizuki Akiyama
  21: '#33ccba', // Hatsune Miku
  22: '#ffcc11', // Kagamine Rin
  23: '#ffee12', // Kagamine Len
  24: '#ffbacc', // Megurine Luka
  25: '#de4444', // MEIKO
  26: '#3367cd' // KAITO
};

export const sekaiCharacterColor = (id: number): string | undefined =>
  characterById.get(id)?.color ?? SEKAI_CHARACTER_COLORS[id];

export const NICKNAME_PREFIX_TO_CHARACTER_ID: Record<string, number> = {
  ichi: 1,
  saki: 2,
  hona: 3,
  shiho: 4,
  mino: 5,
  haru: 6,
  airi: 7,
  shizu: 8,
  koha: 9,
  an: 10,
  aki: 11,
  toya: 12,
  kasa: 13,
  emu: 14,
  nene: 15,
  rui: 16,
  kana: 17,
  mafu: 18,
  ena: 19,
  mizu: 20,
  miku: 21,
  rin: 22,
  len: 23,
  luka: 24,
  meiko: 25,
  kaito: 26
};

/**
 * Returns the focus character id for an event nickname (e.g. "saki1" -> 2),
 * or undefined if it is not a character focus event (such as a World Link "wl3-1").
 */
export function nicknameFocusCharacterId(nickname?: string): number | undefined {
  if (!nickname) return undefined;
  const match = /^[a-z]+/i.exec(nickname);
  if (!match) return undefined;
  return NICKNAME_PREFIX_TO_CHARACTER_ID[match[0].toLowerCase()];
}

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
