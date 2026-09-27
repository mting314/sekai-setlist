// Project Sekai catalog types for the Sekai setlist builder. The catalog is baked into
// data/sekai/*.json by scripts/fetch-sekai-songs.ts (joined from the Sekai master DB).

// The six in-game units. A song belongs to zero-or-more of these (via musicTags);
// a song with no unit is the "Other" bucket.
export type SekaiUnitId =
  | 'virtual_singer'
  | 'leo_need'
  | 'more_more_jump'
  | 'vivid_bad_squad'
  | 'wonderlands_showtime'
  | 'nightcord';

export interface SekaiSong {
  id: string; // musics.json id, stringified
  title: string; // JP title
  pronunciation?: string; // kana reading, used for search
  englishName?: string; // EN server title, when it differs from the JP title
  units: SekaiUnitId[]; // derived from musicTags; [] = no owning unit ("Other")
  characters: number[]; // game-character ids from musicVocals (vocalist icons)
  assetbundleName: string; // drives the jacket image URL
  commissioned: boolean; // true = written for Project Sekai; false = a cover of an existing song
  publishedAt?: number; // epoch ms
}

// A unit chip, plus the synthetic 'other' bucket.
export interface SekaiUnitMeta {
  id: SekaiUnitId | 'other';
  name: string;
  color: string;
}

export interface SekaiCharacter {
  id: number;
  name: string; // EN, given name first
  nameJa: string;
}
