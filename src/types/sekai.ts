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

// Past real-life / connect lives (data/sekai/lives.json), baked by scripts/fetch-sekai-lives.ts
// from the Project SEKAI fandom wiki plus hand-entered data/sekai/lives-manual.json.
export type SekaiLiveSeries =
  | 'colorful_live'
  | 'thanks_festival'
  | 'sekai_symphony'
  | 'connect_live'
  | 'fan_meeting';

export interface SekaiLiveSong {
  songId?: string; // catalog id; absent for songs outside the game (e.g. collab covers)
  title: string; // wiki title, shown when songId is absent
  note?: string; // e.g. "(Short ver.)", "(Rin & Len ver.)"
  performers?: string[];
}

// A divider shown before songs[at]: "Intermission", "Encore", "Instrumental Medley", …
export interface SekaiLiveMarker {
  at: number;
  label: string;
}

// One setlist within a live: a day, a day/night show or a city leg. name is '' when the live
// had a single setlist.
export interface SekaiLivePerformance {
  name: string;
  songs: SekaiLiveSong[];
  markers: SekaiLiveMarker[];
}

export interface SekaiLive {
  id: string; // slug of the wiki page title
  series: SekaiLiveSeries;
  name: string;
  nameJa?: string;
  date: string; // as written on the wiki, e.g. "January 28-30, 2022"
  startDate?: string; // YYYY-MM-DD, for sorting
  venue?: string;
  notes: string[]; // e.g. "The setlist was the same on all three days."
  source: string; // wiki page URL
  performances: SekaiLivePerformance[]; // [] = setlist not published yet
}

// One show (a date, or a day/night slot on a date) of a live — what attendance is logged
// against. Derived from the performances by default, curated in data/sekai/shows.json.
export interface SekaiLiveShow {
  id: string; // unique within the live, e.g. 'tokyo-d1-day'; 'main' for a single show
  label: string; // e.g. 'Tokyo Day 1 · Daytime'
  date?: string; // YYYY-MM-DD
  performance?: string; // SekaiLivePerformance.name of the setlist played; absent = not recorded
}

export type AttendanceHow = 'in_person' | 'viewing' | 'stream';
