/**
 * Build the Project Sekai catalog for the Sekai setlist builder from the Sekai master DB.
 *
 *   bun scripts/fetch-sekai-songs.ts
 *
 * Writes data/sekai/songs.json, song-details.json and characters.json. data/sekai/units.json is
 * hand-maintained (names + colors). Nothing runs this on a schedule, so re-run it by hand when
 * new songs or events are added in-game.
 *
 * Joins:
 *   musics.json         -> id, title, pronunciation, assetbundleName, publishedAt, commissioned,
 *                          and credits + releasedAt for song-details.json
 *   musicTags.json      -> song -> unit (tag names differ from unit ids)
 *   musicVocals.json    -> song -> vocal versions and their game-character ids: the Sekai ver.
 *                          drives the vocalist icons, the VS ver. the builder's version picker
 *   gameCharacters.json -> character names (JP + EN) and units
 *   outsideCharacters.json -> names of singers without a character icon (flower, GUMI…)
 *   music_titles.json   -> sekai.best community EN titles, used when the song isn't on EN
 *   events_index.json   -> sekai-story-indexer's events, each with its song and nickname
 *                          ("saki1", "wl3-4"); EN events.json adds English event names
 */
import fs from 'fs';
import { credit, songEventsById, type IndexedEvent } from '../src/utils/sekai-setlist/song-events';
import { songVocals, type MusicVocal } from '../src/utils/sekai-setlist/song-vocals';
import type { SekaiSongDetails } from '../src/types/sekai';

const MASTER = 'https://sekai-world.github.io/sekai-master-db-diff';
const MASTER_EN = 'https://sekai-world.github.io/sekai-master-db-en-diff';
const I18N_EN = 'https://i18n-json.sekai.best/en';
const STORY_INDEXER = 'https://raw.githubusercontent.com/mting314/sekai-story-indexer/master';
const OUT_DIR = 'data/sekai';

// musicTag string -> our unit id. A song with only unmapped tags (e.g. "other") gets units: [].
const TAG_TO_UNIT: Record<string, string> = {
  light_music_club: 'leo_need',
  idol: 'more_more_jump',
  street: 'vivid_bad_squad',
  theme_park: 'wonderlands_showtime',
  school_refusal: 'nightcord',
  vocaloid: 'virtual_singer'
};

interface Music {
  id: number;
  title: string;
  pronunciation?: string;
  assetbundleName?: string;
  publishedAt?: number;
  releasedAt?: number;
  isNewlyWrittenMusic?: boolean;
  lyricist?: string;
  composer?: string;
  arranger?: string;
}
interface MasterEvent {
  id: number;
  name: string;
}
interface MusicTag {
  musicId: number;
  musicTag: string;
}
interface GameCharacter {
  id: number;
  firstName?: string;
  givenName: string;
  unit?: string;
}
interface OutsideCharacter {
  id: number;
  name: string;
}

// gameCharacters.unit -> our unit id.
const CHARACTER_UNIT: Record<string, string> = {
  light_sound: 'leo_need',
  idol: 'more_more_jump',
  street: 'vivid_bad_squad',
  theme_park: 'wonderlands_showtime',
  school_refusal: 'nightcord',
  piapro: 'virtual_singer'
};

const getJson = async <T>(base: string, name: string): Promise<T> => {
  const res = await fetch(`${base}/${name}.json`);
  if (!res.ok) throw new Error(`fetch ${base}/${name}: ${res.status}`);
  return res.json() as Promise<T>;
};

// EN tables are optional (only songs released on EN have titles there).
const getJsonOrEmpty = <T>(base: string, name: string): Promise<T[]> =>
  getJson<T[]>(base, name).catch(() => []);

const [
  musics,
  musicTags,
  musicVocals,
  characters,
  outsideCharacters,
  musicsEn,
  charactersEn,
  eventsEn,
  communityTitles,
  indexedEvents
] = await Promise.all([
  getJson<Music[]>(MASTER, 'musics'),
  getJson<MusicTag[]>(MASTER, 'musicTags'),
  getJson<MusicVocal[]>(MASTER, 'musicVocals'),
  getJson<GameCharacter[]>(MASTER, 'gameCharacters'),
  getJsonOrEmpty<OutsideCharacter>(MASTER, 'outsideCharacters'),
  getJsonOrEmpty<Music>(MASTER_EN, 'musics'),
  getJsonOrEmpty<GameCharacter>(MASTER_EN, 'gameCharacters'),
  getJsonOrEmpty<MasterEvent>(MASTER_EN, 'events'),
  // Keyed by music id. Optional, like the EN tables.
  getJson<Record<string, string>>(I18N_EN, 'music_titles').catch(() => ({})),
  // Required: without it every nickname chip would silently disappear.
  getJson<IndexedEvent[]>(STORY_INDEXER, 'events_index')
]);

const eventsBySong = songEventsById(indexedEvents, new Map(eventsEn.map((e) => [e.id, e.name])));

// Official EN title first, then the sekai.best community translation.
const enTitleById = new Map<number, string>();
for (const [id, title] of Object.entries(communityTitles)) if (title) enTitleById.set(+id, title);
for (const m of musicsEn) if (m.title) enTitleById.set(m.id, m.title);

const tagsBySong = new Map<number, Set<string>>();
for (const t of musicTags) {
  const set = tagsBySong.get(t.musicId) ?? new Set<string>();
  set.add(t.musicTag);
  tagsBySong.set(t.musicId, set);
}

const vocalsBySong = new Map<number, MusicVocal[]>();
for (const v of musicVocals)
  vocalsBySong.set(v.musicId, [...(vocalsBySong.get(v.musicId) ?? []), v]);
const outsideNames = new Map(outsideCharacters.map((c) => [c.id, c.name]));
const versionsById = new Map(
  musics.map((m) => [m.id, songVocals(vocalsBySong.get(m.id) ?? [], outsideNames)])
);

const songs = musics
  .map((m) => {
    const tags = [...(tagsBySong.get(m.id) ?? [])];
    const units = [...new Set(tags.map((t) => TAG_TO_UNIT[t]).filter(Boolean))];
    const en = enTitleById.get(m.id);
    return {
      id: String(m.id),
      title: m.title,
      pronunciation: m.pronunciation ?? '',
      // Only set englishName when the EN title differs from the JP title (so Latin-script
      // originals like "Tell Your World" don't duplicate).
      englishName: en && en !== m.title ? en : undefined,
      units,
      characters: versionsById.get(m.id)!.characters,
      vsCharacters: versionsById.get(m.id)!.vsCharacters,
      assetbundleName: m.assetbundleName ?? '',
      // isNewlyWrittenMusic: true = commissioned (written for Project Sekai); false = a cover
      // of an existing song. Defaults to cover when the flag is absent.
      commissioned: m.isNewlyWrittenMusic === true,
      publishedAt: m.publishedAt ?? m.releasedAt ?? 0,
      nicknames: eventsBySong
        .get(String(m.id))
        ?.flatMap((e) => (e.nickname ? [e.nickname] : []))
        .filter((n, i, all) => all.indexOf(n) === i)
    };
  })
  .map((s) => (s.nicknames?.length ? s : { ...s, nicknames: undefined }))
  .toSorted((a, b) => a.publishedAt - b.publishedAt);

// Only the song-info dialog and song page read these, so they're a separate, lazily loaded file.
const details: Record<string, SekaiSongDetails> = {};
for (const m of musics) {
  const d: SekaiSongDetails = {
    lyricist: credit(m.lyricist),
    composer: credit(m.composer),
    arranger: credit(m.arranger),
    releasedAt: m.releasedAt || undefined,
    events: eventsBySong.get(String(m.id)),
    versions: versionsById.get(m.id)!.versions
  };
  if (!d.versions?.length) d.versions = undefined;
  if (Object.values(d).some((v) => v !== undefined)) details[m.id] = d;
}

const enCharById = new Map(charactersEn.map((c) => [c.id, c]));
const chars = characters.map((c) => {
  const en = enCharById.get(c.id) ?? c;
  return {
    id: c.id,
    name: [en.givenName, en.firstName].filter(Boolean).join(' '),
    nameJa: `${c.firstName ?? ''}${c.givenName}`,
    unit: c.unit && CHARACTER_UNIT[c.unit]
  };
});

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(`${OUT_DIR}/songs.json`, JSON.stringify(songs));
fs.writeFileSync(`${OUT_DIR}/song-details.json`, JSON.stringify(details));
fs.writeFileSync(`${OUT_DIR}/characters.json`, JSON.stringify(chars, null, 2) + '\n');
console.log(
  `wrote ${OUT_DIR}/songs.json (${songs.length} songs, ${songs.filter((s) => s.nicknames).length} with nicknames, ${songs.filter((s) => s.vsCharacters).length} with a VS ver.), song-details.json, characters.json (${chars.length})`
);
