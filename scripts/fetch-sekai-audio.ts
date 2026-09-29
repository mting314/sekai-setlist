/**
 * Build data/sekai/song-audio.json — each song's game-size audio per vocal version — from the
 * song pages of the Project SEKAI fandom wiki (https://projectsekai.fandom.com).
 *
 *   bun scripts/fetch-sekai-audio.ts
 *
 * Run scripts/fetch-sekai-songs.ts first when new songs are out, so their pages resolve. Pages
 * resolve to songs like the setlists in fetch-sekai-lives.ts do: by the infobox `id`, cross-checked
 * against the `japanese` title. The files are hotlinked, only their paths are stored.
 */
import fs from 'fs';
import detailsData from '../data/sekai/song-details.json';
import { byId, catalog, fetchPages, queryAll, resolveSong } from './fandom';
import { audioLabel, imagesPath, songAudio } from '../src/utils/sekai-setlist/song-audio';
import type { SekaiSongDetails, SongAudio } from '../src/types/sekai';

const CATEGORY = 'Category:Songs';
const OUT = 'data/sekai/song-audio.json';
const details = detailsData as unknown as Record<string, SekaiSongDetails>;

const batches = <T>(xs: T[], n = 50) =>
  Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

// --- the song pages

const pageTitles: string[] = [];
for await (const r of queryAll<{ query: { categorymembers: { title: string }[] } }>({
  action: 'query',
  list: 'categorymembers',
  cmtitle: CATEGORY,
  cmnamespace: '0',
  cmlimit: 'max'
}))
  pageTitles.push(...r.query.categorymembers.map((m) => m.title));
if (!pageTitles.length) throw new Error(`no pages in ${CATEGORY}`);

const pages = await fetchPages(pageTitles);
const pageOf = new Map<string, string>(); // song id -> page title
const unresolvedPages: string[] = [];
for (const title of pageTitles) {
  const page = pages.get(title);
  const id = resolveSong(page, undefined, title);
  if (!id || !page) unresolvedPages.push(title);
  else if (pageOf.has(id)) console.warn(`song ${id}: pages "${pageOf.get(id)}" and "${title}"`);
  else pageOf.set(id, page.title);
}

// --- their audio files

const filesOf = new Map<string, string[]>(); // page title -> recognised audio files
const skipped = new Map<string, number>(); // unrecognised Game Version labels -> count
for (const batch of batches([...new Set(pageOf.values())]))
  for await (const r of queryAll<{
    query: { pages: { title: string; images?: { title: string }[] }[] };
  }>({ action: 'query', prop: 'images', imlimit: 'max', titles: batch.join('|') }))
    for (const p of r.query.pages)
      for (const { title } of p.images ?? []) {
        if (!/\.ogg$/i.test(title)) continue;
        if (audioLabel(title)) filesOf.set(p.title, [...(filesOf.get(p.title) ?? []), title]);
        else {
          const label = /\(Game[ _]Version[ _]-[ _](.+)\)\.ogg$/i.exec(title)?.[1];
          if (label) skipped.set(label, (skipped.get(label) ?? 0) + 1);
        }
      }

const pathOf = new Map<string, string>(); // file title -> images path
for (const batch of batches([...new Set([...filesOf.values()].flat())]))
  for await (const r of queryAll<{
    query: { pages: { title: string; imageinfo?: { url: string }[] }[] };
  }>({ action: 'query', prop: 'imageinfo', iiprop: 'url', titles: batch.join('|') }))
    for (const p of r.query.pages) {
      const path = p.imageinfo?.[0] && imagesPath(p.imageinfo[0].url);
      if (path) pathOf.set(p.title, path);
    }

// --- write

const audio: Record<string, SongAudio> = {};
for (const s of catalog) {
  const page = pageOf.get(s.id);
  const files = (page ? filesOf.get(page) : undefined) ?? [];
  const entry = songAudio(
    files.flatMap((f) => (pathOf.has(f) ? [[f, pathOf.get(f)!] as [string, string]] : [])),
    details[s.id]?.versions?.some((v) => v.kind === 'original')
  );
  if (Object.keys(entry).length) audio[s.id] = entry;
}
fs.writeFileSync(OUT, JSON.stringify(audio) + '\n');

const count = (k: keyof SongAudio) => Object.values(audio).filter((a) => a[k]).length;
const both = catalog.filter((s) => s.vsCharacters);
console.log(
  `wrote ${OUT}: ${Object.keys(audio).length}/${catalog.length} songs with audio ` +
    `(sekai ${count('sekai')}, virtual_singer ${count('virtual_singer')}, original ${count('original')}); ` +
    `${both.filter((s) => audio[s.id]?.sekai && audio[s.id]?.virtual_singer).length}/${both.length} ` +
    `songs with both versions have both recordings`
);
const missing = catalog.filter((s) => !audio[s.id]);
console.log(
  `  no audio (${missing.length}): ${missing.map((s) => `${s.id} ${s.title}`).join(', ')}`
);
const noPage = catalog.filter((s) => !pageOf.has(s.id));
console.log(`  no wiki page (${noPage.length}): ${noPage.map((s) => s.id).join(', ')}`);
console.log(
  `  pages not matched to a song (${unresolvedPages.length}): ${unresolvedPages.join(', ')}`
);
const lacking = both.filter(
  (s) => audio[s.id] && !(audio[s.id].sekai && audio[s.id].virtual_singer)
);
console.log(
  `  both versions, one recording (${lacking.length}): ${lacking.map((s) => `${s.id} ${byId.get(s.id)!.title} [${Object.keys(audio[s.id]).join()}]`).join(', ')}`
);
console.log(
  `  skipped labels: ${[...skipped]
    .toSorted((a, b) => b[1] - a[1])
    .map(([l, n]) => `${l} ×${n}`)
    .join(', ')}`
);
