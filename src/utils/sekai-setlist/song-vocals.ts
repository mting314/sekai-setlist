// Split a song's musicVocals (master DB) into its vocal versions. Most songs have a セカイver.
// (unit members + a VIRTUAL SINGER) and a バーチャル・シンガーver. (VIRTUAL SINGERs only), plus
// Another Vocals, so one merged singer list would mix versions that are never sung together.
import type { SekaiSongVersion, SekaiVersionKind } from '~/types/sekai';

export interface MusicVocal {
  musicId: number;
  musicVocalType: string;
  seq: number;
  caption?: string;
  characters?: { characterType: string; characterId: number }[];
}

// virtual_singer is the in-game VS arrangement, original_song the original upload (often Miku
// alone); both are the "VIRTUAL SINGER ver.". Instrumental, April Fool and Connect Live versions
// aren't listed.
const KIND: Record<string, SekaiVersionKind> = {
  sekai: 'sekai',
  virtual_singer: 'virtual_singer',
  original_song: 'virtual_singer',
  another_vocal: 'another_vocal'
};

// Captions shown as a translated label instead ("Leo/need ver." and collab captions are kept).
const STANDARD_CAPTIONS = new Set([
  'セカイver.',
  'バーチャル・シンガーver.',
  'アナザーボーカルver.'
]);

export interface SongVocals {
  characters: number[]; // default version: the Sekai ver., else the VS ver.
  vsCharacters?: number[]; // the VS ver., only when the song also has a Sekai ver.
  versions: SekaiSongVersion[];
}

const singers = (v: MusicVocal) =>
  (v.characters ?? [])
    .filter((c) => c.characterType === 'game_character')
    .map((c) => c.characterId)
    .toSorted((a, b) => a - b);

// Singers who aren't game characters (flower, GUMI…), by name; their ids index outsideCharacters.
const outsiders = (v: MusicVocal, names: ReadonlyMap<number, string>) =>
  (v.characters ?? []).flatMap((c) =>
    c.characterType === 'outside_character' && names.has(c.characterId)
      ? [names.get(c.characterId)!]
      : []
  );

// The first by seq, preferring the in-game VS arrangement over the original upload.
const rank = (v: MusicVocal) => (v.musicVocalType === 'original_song' ? 1e6 : 0) + v.seq;

/**
 * One song's vocals (every musicVocals row with its musicId). `outsideNames` (outsideCharacters
 * id -> name) lets a version list the singers that have no character icon.
 */
export function songVocals(
  vocals: MusicVocal[],
  outsideNames: ReadonlyMap<number, string> = new Map()
): SongVocals {
  const listed = vocals.filter((v) => KIND[v.musicVocalType]).toSorted((a, b) => a.seq - b.seq);
  const sekai = listed.find((v) => v.musicVocalType === 'sekai');
  const vs = listed
    .filter((v) => KIND[v.musicVocalType] === 'virtual_singer')
    .toSorted((a, b) => rank(a) - rank(b))[0];
  // A Sekai ver. by singers without icons ("ALLユニット", DI:Verse) shows the VS ver.'s icons.
  const fallback = [sekai, vs, listed[0], vocals[0]].find((v) => v && singers(v).length) ?? sekai;
  const inGameVs = listed.some((v) => v.musicVocalType === 'virtual_singer');
  return {
    characters: fallback ? singers(fallback) : [],
    ...(sekai && vs ? { vsCharacters: singers(vs) } : {}),
    versions: listed.map((v) => {
      const others = outsiders(v, outsideNames);
      return {
        // Next to the in-game VS arrangement, the original upload is listed as its own version.
        kind:
          v.musicVocalType === 'original_song' && inGameVs ? 'original' : KIND[v.musicVocalType],
        ...(v.caption && !STANDARD_CAPTIONS.has(v.caption) ? { caption: v.caption } : {}),
        characters: singers(v),
        ...(others.length ? { others } : {})
      };
    })
  };
}
