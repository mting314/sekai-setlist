/**
 * Build the Project Sekai catalog for the Sekai setlist builder from the Sekai master DB.
 *
 *   bun scripts/fetch-sekai-songs.ts
 *
 * Writes data/sekai/songs.json and data/sekai/characters.json. data/sekai/units.json is
 * hand-maintained (names + colors). The daily update-data workflow never writes to data/sekai,
 * so re-run this by hand when new songs are added in-game.
 *
 * Joins:
 *   musics.json         -> id, title, pronunciation, assetbundleName, publishedAt, commissioned
 *   musicTags.json      -> song -> unit (tag names differ from unit ids)
 *   musicVocals.json    -> song -> game-character ids (vocalist icons)
 *   gameCharacters.json -> character names (JP + EN)
 */
import fs from 'fs';

const MASTER = 'https://sekai-world.github.io/sekai-master-db-diff';
const MASTER_EN = 'https://sekai-world.github.io/sekai-master-db-en-diff';
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
}
interface MusicTag {
  musicId: number;
  musicTag: string;
}
interface VocalChar {
  characterType: string;
  characterId: number;
}
interface MusicVocal {
  musicId: number;
  characters?: VocalChar[];
}
interface GameCharacter {
  id: number;
  firstName?: string;
  givenName: string;
}

const getJson = async <T>(base: string, name: string): Promise<T> => {
  const res = await fetch(`${base}/${name}.json`);
  if (!res.ok) throw new Error(`fetch ${base}/${name}: ${res.status}`);
  return res.json() as Promise<T>;
};

// EN tables are optional (only songs released on EN have titles there).
const getJsonOrEmpty = <T>(base: string, name: string): Promise<T[]> =>
  getJson<T[]>(base, name).catch(() => []);

const [musics, musicTags, musicVocals, characters, musicsEn, charactersEn] = await Promise.all([
  getJson<Music[]>(MASTER, 'musics'),
  getJson<MusicTag[]>(MASTER, 'musicTags'),
  getJson<MusicVocal[]>(MASTER, 'musicVocals'),
  getJson<GameCharacter[]>(MASTER, 'gameCharacters'),
  getJsonOrEmpty<Music>(MASTER_EN, 'musics'),
  getJsonOrEmpty<GameCharacter>(MASTER_EN, 'gameCharacters')
]);

const enTitleById = new Map<number, string>();
for (const m of musicsEn) if (m.title) enTitleById.set(m.id, m.title);

const tagsBySong = new Map<number, Set<string>>();
for (const t of musicTags) {
  const set = tagsBySong.get(t.musicId) ?? new Set<string>();
  set.add(t.musicTag);
  tagsBySong.set(t.musicId, set);
}

const charsBySong = new Map<number, Set<number>>();
for (const v of musicVocals) {
  const set = charsBySong.get(v.musicId) ?? new Set<number>();
  for (const c of v.characters ?? []) {
    if (c.characterType === 'game_character') set.add(c.characterId);
  }
  charsBySong.set(v.musicId, set);
}

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
      characters: [...(charsBySong.get(m.id) ?? [])].toSorted((a, b) => a - b),
      assetbundleName: m.assetbundleName ?? '',
      // isNewlyWrittenMusic: true = commissioned (written for Project Sekai); false = a cover
      // of an existing song. Defaults to cover when the flag is absent.
      commissioned: m.isNewlyWrittenMusic === true,
      publishedAt: m.publishedAt ?? m.releasedAt ?? 0
    };
  })
  .toSorted((a, b) => a.publishedAt - b.publishedAt);

const enCharById = new Map(charactersEn.map((c) => [c.id, c]));
const chars = characters.map((c) => {
  const en = enCharById.get(c.id) ?? c;
  return {
    id: c.id,
    name: [en.givenName, en.firstName].filter(Boolean).join(' '),
    nameJa: `${c.firstName ?? ''}${c.givenName}`
  };
});

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(`${OUT_DIR}/songs.json`, JSON.stringify(songs));
fs.writeFileSync(`${OUT_DIR}/characters.json`, JSON.stringify(chars, null, 2) + '\n');
console.log(
  `wrote ${OUT_DIR}/songs.json (${songs.length} songs), characters.json (${chars.length})`
);
