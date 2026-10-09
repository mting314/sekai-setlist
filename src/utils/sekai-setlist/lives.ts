// Past-live browsing for the Sekai setlist builder: filter lives by series and by the same
// song filters as the song picker (search, unit, commissioned/cover), count how often songs were
// performed, and turn a past setlist into builder state. Pure functions over data/sekai/lives.json.
import { hasVsVersion, sekaiCharacters, sekaiUnits, songVocalists } from './catalog';
import { itemId, songItem, splitVersionNote } from './prediction';
import { songMatchesFilters, type SongFilters } from './song-filter';
import type { SetlistState } from './share';
import type { PredictionItem } from '~/types/sekai-prediction';
import type {
  SekaiLive,
  SekaiLivePerformance,
  SekaiLiveSeries,
  SekaiLiveSong,
  SekaiSong,
  SongVersion
} from '~/types/sekai';

export const LIVE_SERIES: SekaiLiveSeries[] = [
  'colorful_live',
  'thanks_festival',
  'sekai_symphony',
  'connect_live',
  'fan_meeting'
];

export interface LiveFilters extends Omit<SongFilters, 'yearFrom' | 'yearTo'> {
  series: SekaiLiveSeries[]; // OR-ed; empty = every series
}

export const EMPTY_LIVE_FILTERS: LiveFilters = { search: '', units: [], kind: 'all', series: [] };

type GetSong = (id: string) => SekaiSong | undefined;

export const hasSongFilters = (f: LiveFilters) =>
  f.search.trim() !== '' || f.units.length > 0 || f.kind !== 'all';

/**
 * A setlist entry against the song filters. Entries outside the catalog (collab songs, BGM)
 * only match a plain title search — they have no unit or commissioned flag to test.
 */
export function liveSongMatches(item: SekaiLiveSong, f: LiveFilters, getSong: GetSong): boolean {
  if (!hasSongFilters(f)) return true;
  const song = item.songId ? getSong(item.songId) : undefined;
  if (song) return songMatchesFilters(song, f);
  if (f.units.length > 0 || f.kind !== 'all') return false;
  return item.title.toLowerCase().includes(f.search.trim().toLowerCase());
}

export interface LiveMatch {
  live: SekaiLive;
  matches: number; // distinct songs matching the song filters (every song when none are set)
}

/** Lives in the selected series, newest first; with song filters set, only lives with a match. */
export function filterLives(lives: SekaiLive[], f: LiveFilters, getSong: GetSong): LiveMatch[] {
  const active = hasSongFilters(f);
  return lives
    .filter((l) => f.series.length === 0 || f.series.includes(l.series))
    .map((live) => ({
      live,
      matches: new Set(
        live.performances.flatMap((p) =>
          p.songs.filter((s) => liveSongMatches(s, f, getSong)).map((s) => s.songId ?? s.title)
        )
      ).size
    }))
    .filter((m) => !active || m.matches > 0)
    .toSorted((a, b) => (b.live.startDate ?? '').localeCompare(a.live.startDate ?? ''));
}

export interface SongStat {
  songId: string;
  lives: string[]; // live ids, newest first
  performances: number; // setlists (days / shows / legs) it appeared in
}

/**
 * How often each catalog song was performed across the given lives, most-played first. A song
 * counts once per setlist and once per live, so a reprise in the encore doesn't double-count.
 */
export function songStats(lives: SekaiLive[], f: LiveFilters, getSong: GetSong): SongStat[] {
  const stats = new Map<string, SongStat>();
  const newestFirst = lives.toSorted((a, b) =>
    (b.startDate ?? '').localeCompare(a.startDate ?? '')
  );
  for (const live of newestFirst) {
    if (f.series.length > 0 && !f.series.includes(live.series)) continue;
    for (const perf of live.performances) {
      const inPerf = new Set(
        perf.songs.filter((s) => s.songId && liveSongMatches(s, f, getSong)).map((s) => s.songId!)
      );
      for (const id of inPerf) {
        const st = stats.get(id) ?? { songId: id, lives: [], performances: 0 };
        st.performances++;
        if (!st.lives.includes(live.id)) st.lives.push(live.id);
        stats.set(id, st);
      }
    }
  }
  return [...stats.values()].toSorted(
    (a, b) =>
      b.lives.length - a.lives.length ||
      b.performances - a.performances ||
      Number(a.songId) - Number(b.songId)
  );
}

// Wiki performer names that are VIRTUAL SINGERs; anyone else (a unit, a character, a voice
// actor) means the Sekai ver.
const VS_PERFORMERS = new Set([
  'VIRTUAL SINGER',
  'Hatsune Miku',
  'Kagamine Rin',
  'Kagamine Len',
  'Megurine Luka',
  'MEIKO',
  'KAITO'
]);
// Notes that name only VIRTUAL SINGERs: "(Rin & Len ver.)", "(by Hatsune Miku)".
const VS_NAME =
  '(?:hatsune\\s+)?miku|(?:kagamine\\s+)?(?:rin|len)|(?:megurine\\s+)?luka|meiko|kaito';
const VS_SINGERS_NOTE = new RegExp(
  `^[(（]?\\s*(?:by\\s+)?(?:${VS_NAME})(?:\\s*(?:&|and|,|、)\\s*(?:${VS_NAME}))*(?:\\s*ver\\.?)?\\s*[)）]?$`,
  'i'
);

/**
 * Which version a setlist entry was, from its note ("(VIRTUAL SINGER Ver.)", "(Rin & Len ver.)")
 * or its performers (only VIRTUAL SINGERs → VS ver.). Undefined for songs with one version, or
 * when the wiki doesn't say.
 */
export function liveSongVersion(
  s: SekaiLiveSong,
  hasVs: (id: string) => boolean = hasVsVersion
): SongVersion | undefined {
  if (!s.songId || !hasVs(s.songId)) return undefined;
  if (s.note && (splitVersionNote(s.note).vs || VS_SINGERS_NOTE.test(s.note.trim())))
    return 'virtual_singer';
  const performers = (s.performers ?? []).filter((p) => p !== 'Instrumental');
  if (!performers.length) return undefined;
  return performers.every((p) => VS_PERFORMERS.has(p)) ? 'virtual_singer' : 'sekai';
}

// Performer names match characters and units whatever the word order ("Hatsune Miku" is
// "Miku Hatsune"), case or punctuation ("Wonderlands x Showtime" is "Wonderlands×Showtime").
const performerKey = (name: string) =>
  name
    .toLowerCase()
    .replace(/×/g, ' x ')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .toSorted()
    .join(' ');

const unitMembers = (unit: string) =>
  sekaiCharacters.filter((c) => c.unit === unit).map((c) => c.id);

// Voice actor (seiyuu) names mapped to their character id, in English (either word order
// is handled by performerKey) and Japanese kanji/kana (both compact and spaced).
const SEIYUU_PERFORMERS: [string, number[]][] = [
  // Leo/need
  ['Noguchi Ruriko', [1]],
  ['野口瑠璃子', [1]],
  ['野口 瑠璃子', [1]],
  ['Isobe Karin', [2]],
  ['礒部花凜', [2]],
  ['礒部 花凜', [2]],
  ['Ueda Reina', [3]],
  ['上田麗奈', [3]],
  ['上田 麗奈', [3]],
  ['Nakashima Yuki', [4]],
  ['中島由貴', [4]],
  ['中島 由貴', [4]],

  // MORE MORE JUMP!
  ['Ogura Yui', [5]],
  ['小倉唯', [5]],
  ['小倉 唯', [5]],
  ['Yoshioka Mayu', [6]],
  ['吉岡茉祐', [6]],
  ['吉岡 茉祐', [6]],
  ['Furihata Ai', [7]],
  ['降幡愛', [7]],
  ['降幡 愛', [7]],
  ['Honnizumi Rina', [8]],
  ['Motoizumi Rina', [8]],
  ['本泉莉奈', [8]],
  ['本泉 莉奈', [8]],

  // Vivid BAD SQUAD
  ['Akina', [9]],
  ['秋奈', [9]],
  ['Sumi Tomomi Jiena', [10]],
  ['Jiena Sumi', [10]],
  ['Jiena Tomomi Sumi', [10]],
  ['鷲見友美ジェナ', [10]],
  ['鷲見 友美ジェナ', [10]],
  ['鷲見友美 ジェナ', [10]],
  ['Imai Fumiya', [11]],
  ['今井文也', [11]],
  ['今井 文也', [11]],
  ['Itou Kent', [12]],
  ['Ito Kent', [12]],
  ['Ito Kento', [12]],
  ['Kent Itou', [12]],
  ['Kento Ito', [12]],
  ['伊東健人', [12]],
  ['伊東 健人', [12]],

  // Wonderlands×Showtime
  ['Hirose Daisuke', [13]],
  ['廣瀬大介', [13]],
  ['廣瀬 大介', [13]],
  ['Kino Hina', [14]],
  ['木野日菜', [14]],
  ['木野 日菜', [14]],
  ['Machico', [15]],
  ['Toki Shunichi', [16]],
  ['土岐隼一', [16]],
  ['土岐 隼一', [16]],

  // 25-ji, Nightcord de.
  ['Kusunoki Tomori', [17]],
  ['楠木ともり', [17]],
  ['楠木 ともり', [17]],
  ['Tanabe Rui', [18]],
  ['田辺留依', [18]],
  ['田辺 留依', [18]],
  ['Suzuki Minori', [19]],
  ['鈴木みのり', [19]],
  ['鈴木 みのり', [19]],
  ['Satou Hinata', [20]],
  ['Sato Hinata', [20]],
  ['Satoh Hinata', [20]],
  ['佐藤日向', [20]],
  ['佐藤 日向', [20]],

  // VIRTUAL SINGER cast (for live appearances / symphony guest credits)
  ['Fujita Saki', [21]],
  ['藤田咲', [21]],
  ['藤田 咲', [21]],
  ['Shimoda Asami', [22, 23]],
  ['下田麻美', [22, 23]],
  ['下田 麻美', [22, 23]],
  ['Asakawa Yuu', [24]],
  ['浅川悠', [24]],
  ['浅川 悠', [24]],
  ['Haigou Meiko', [25]],
  ['拝郷メイコ', [25]],
  ['拝郷 メイコ', [25]],
  ['Fuuga Naoto', [26]],
  ['風雅なおと', [26]],
  ['風雅 なおと', [26]]
];

const JAPANESE_UNIT_PERFORMERS: [string, number[]][] = [
  ['ワンダーランズ×ショウタイム', unitMembers('wonderlands_showtime')],
  ['ワンダーランズ x ショウタイム', unitMembers('wonderlands_showtime')],
  ['ワンダショ', unitMembers('wonderlands_showtime')],
  ['25時、ナイトコードで。', unitMembers('nightcord')],
  ['25時 ナイトコードで', unitMembers('nightcord')],
  ['ニーゴ', unitMembers('nightcord')],
  ['モアモアジャンプ', unitMembers('more_more_jump')],
  ['モアジャン', unitMembers('more_more_jump')],
  ['レオニード', unitMembers('leo_need')],
  ['レオニ', unitMembers('leo_need')],
  ['ビビッドバッドスクワッド', unitMembers('vivid_bad_squad')],
  ['ビビバス', unitMembers('vivid_bad_squad')]
];

const PERFORMER_CHARACTERS = new Map<string, number[]>([
  ...sekaiUnits
    .filter((u) => u.id !== 'virtual_singer' && u.id !== 'other')
    .map((u): [string, number[]] => [performerKey(u.name), unitMembers(u.id)]),
  ...sekaiCharacters.flatMap((c): [string, number[]][] => [
    [performerKey(c.name), [c.id]],
    [performerKey(c.nameJa), [c.id]]
  ]),
  ...SEIYUU_PERFORMERS.map(([name, ids]): [string, number[]] => [performerKey(name), ids]),
  ...JAPANESE_UNIT_PERFORMERS.map(([name, ids]): [string, number[]] => [performerKey(name), ids])
]);

/**
 * A setlist entry's performers as character ids (a unit is its members, "VIRTUAL SINGER" the
 * song's VIRTUAL SINGERs, voice actors are their characters) plus names without an icon:
 * collab units, guest artists.
 */
export function performerCharacters(s: SekaiLiveSong): { characters: number[]; others: string[] } {
  const characters = new Set<number>();
  const others: string[] = [];
  const vs = new Set(unitMembers('virtual_singer'));
  for (const p of s.performers ?? []) {
    if (p === 'Instrumental') continue;
    const ids =
      p === 'VIRTUAL SINGER' && s.songId
        ? songVocalists(s.songId, 'virtual_singer').filter((c) => vs.has(c))
        : (PERFORMER_CHARACTERS.get(performerKey(p)) ?? []);
    if (ids.length) ids.forEach((c) => characters.add(c));
    else others.push(p);
  }
  return { characters: [...characters], others };
}

const unwrapNote = (note: string) => note.replace(/^\s*[(（]\s*|\s*[)）]\s*$/g, '');

/** A setlist note to show beside a version badge: dropped when it only repeats "VS ver.". */
export const noteBesideVersion = (note: string | undefined, version?: SongVersion) =>
  note && version === 'virtual_singer' && !splitVersionNote(unwrapNote(note)).rest
    ? undefined
    : note;

/** Index of the first encore song, if the setlist has an "Encore" divider. */
const encoreStart = (perf: SekaiLivePerformance): number | undefined =>
  perf.markers.find((m) => /encore/i.test(m.label))?.at;

/** Builder state for a past setlist: catalog songs in order, encore kept, other entries dropped. */
export function performanceToState(live: SekaiLive, perf: SekaiLivePerformance): SetlistState {
  const start = encoreStart(perf);
  const songs: string[] = [];
  const encore: number[] = [];
  const vs: number[] = [];
  perf.songs.forEach((s, i) => {
    if (!s.songId) return;
    if (start !== undefined && i >= start) encore.push(songs.length);
    if (liveSongVersion(s) === 'virtual_singer') vs.push(songs.length);
    songs.push(s.songId);
  });
  return {
    title: performanceTitle(live, perf),
    songs,
    encore,
    ordered: true,
    ...(vs.length ? { vs } : {})
  };
}

/**
 * Builder rows for a past setlist, keeping what performanceToState drops: dividers
 * (Encore → encore row, anything else → a titled intermission row), songs outside the catalog
 * (as custom songs) and notes such as "(Short ver.)" (as remarks), and the VIRTUAL SINGER ver.
 */
export function performanceToItems(perf: SekaiLivePerformance): PredictionItem[] {
  const items: PredictionItem[] = [];
  perf.songs.forEach((s, i) => {
    for (const m of perf.markers.filter((mk) => mk.at === i))
      items.push(
        /encore/i.test(m.label)
          ? { id: itemId(), type: 'encore' }
          : /^intermission$/i.test(m.label)
            ? { id: itemId(), type: 'intermission' }
            : { id: itemId(), type: 'intermission', title: m.label }
      );
    const remarks = s.note && unwrapNote(s.note);
    items.push(
      s.songId
        ? songItem(itemId(), s.songId, remarks, liveSongVersion(s) === 'virtual_singer')
        : { id: itemId(), type: 'custom', name: s.title, ...(remarks ? { remarks } : {}) }
    );
  });
  return items;
}

export const performanceTitle = (live: SekaiLive, perf: SekaiLivePerformance) =>
  perf.name ? `${live.name} (${perf.name})` : live.name;

export interface SongPerformance {
  live: SekaiLive;
  perf: SekaiLivePerformance;
  position: number; // 1-based, counting every setlist entry
  note?: string;
  encore: boolean;
  version?: SongVersion;
}

/** Every time a catalog song appears in a setlist, newest live first, setlist order within a live. */
export function songHistory(songId: string, lives: SekaiLive[]): SongPerformance[] {
  return lives
    .toSorted((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? ''))
    .flatMap((live) =>
      live.performances.flatMap((perf) => {
        const start = encoreStart(perf);
        return perf.songs.flatMap((s, i) =>
          s.songId === songId
            ? [
                {
                  live,
                  perf,
                  position: i + 1,
                  ...(s.note && { note: s.note }),
                  encore: start !== undefined && i >= start,
                  ...(liveSongVersion(s) && { version: liveSongVersion(s) })
                }
              ]
            : []
        );
      })
    );
}
