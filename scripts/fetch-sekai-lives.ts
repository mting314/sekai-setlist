/**
 * Build data/sekai/lives.json — past Project SEKAI live setlists — from the Project SEKAI fandom
 * wiki (https://projectsekai.fandom.com), matched against the bundled song catalog.
 *
 *   bun scripts/fetch-sekai-lives.ts
 *
 * Run scripts/fetch-sekai-songs.ts first when new songs are out, so setlist songs resolve.
 * Songs resolve through the wiki song page's infobox `id` (the in-game music id), cross-checked
 * against its `japanese` title; unresolved songs are kept by title and listed at the end.
 * Upcoming lives are included with an empty setlist.
 *
 * Lives the wiki doesn't cover (unit fan meetings) are hand-entered in data/sekai/lives-manual.json
 * — same shape as lives.json, but songs only need a `title` (JP or EN; resolved by name here),
 * `markers` may be omitted and `startDate` is derived from `date`.
 */
import fs from 'fs';
import { WIKI, byId, fetchPages, resolveSong } from './fandom';
import { parseLivePage, parseStartDate } from '../src/utils/sekai-setlist/live-wikitext';
import type { SekaiLive, SekaiLiveSeries, SekaiLiveSong } from '../src/types/sekai';
const OUT = 'data/sekai/lives.json';
const MANUAL = 'data/sekai/lives-manual.json';

const EVENTS: { series: SekaiLiveSeries; pages: string[] }[] = [
  {
    series: 'colorful_live',
    pages: [
      '1st -Link-',
      '2nd -Will-',
      '3rd -Evolve-',
      '4th -Unison-',
      '5th -Frontier-',
      '6th -Crossing-'
    ].map((p) => `Project SEKAI COLORFUL LIVE ${p}`)
  },
  {
    series: 'thanks_festival',
    pages: ['2nd', '3rd', '4th', '5th', '6th'].map(
      (n) => `Project SEKAI ${n} Anniversary Thanks Festival`
    )
  },
  {
    series: 'sekai_symphony',
    pages: ['2021', '2022', '2023', '2024', '2025', '2026'].map((y) => `Sekai Symphony ${y}`)
  },
  {
    // From the wiki's "Connect Live" navbox.
    series: 'connect_live',
    pages: [
      'Vivid BAD SQUAD 1st Connect Live CRASH',
      'Project SEKAI Connect Live 2nd ANNIVERSARY SPECIAL STAGE',
      'MORE MORE JUMP! 1st Connect Live JUMPIN!',
      'Leo/need 1st Connect Live SPARKLE',
      '25-ji, Nightcord de. 1st Connect Live moment',
      'Wonderlands x Showtime 1st Connect Live STORIES',
      'Project SEKAI Connect Live 3rd ANNIVERSARY Memorial Stage',
      'Leo/need x Vivid BAD SQUAD Connect Live RESONANCE BEATS!!',
      'Project SEKAI Connect Live 4th ANNIVERSARY BRILLIANT STAGE',
      'Ensemble in SEKAI (Project SEKAI × Ensemble Stars!!)',
      '25-ji, Nightcord de. x VIRTUAL SINGER Connect Live Dreamscape',
      'MORE MORE JUMP! x Wonderlands x Showtime Connect Live WON! MORE! HAPPY TIME',
      'Parallel Paaaarty!!!!',
      "GO Hoppin' Parade",
      'AWAKE Real Pulse',
      'FELL Pure Harmony'
    ]
  }
];

// --- main

const eventPages = await fetchPages(EVENTS.flatMap((e) => e.pages));
const parsed = EVENTS.flatMap(({ series, pages }) =>
  pages.flatMap((page) => {
    const wiki = eventPages.get(page);
    if (!wiki) {
      console.warn(`skip: no wiki page for "${page}"`);
      return [];
    }
    return [{ series, page: wiki.title, parsed: parseLivePage(wiki.content) }];
  })
);

const links = [
  ...new Set(
    parsed.flatMap((p) =>
      p.parsed.performances.flatMap((perf) => perf.songs.flatMap((s) => (s.link ? [s.link] : [])))
    )
  )
];
const songPages = await fetchPages(links);

const unresolved = new Map<string, string[]>();
const lives: SekaiLive[] = parsed.map(({ series, page, parsed: p }) => ({
  id: page
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, ''),
  series,
  name: page.replace(/^Project SEKAI /, ''),
  ...(p.nameJa && { nameJa: p.nameJa }),
  date: p.date ?? '',
  ...(parseStartDate(p.date) && { startDate: parseStartDate(p.date) }),
  ...(p.venue && { venue: p.venue }),
  notes: p.notes,
  source: WIKI + encodeURIComponent(page.replaceAll(' ', '_')),
  performances: p.performances.map((perf) => ({
    name: perf.name,
    markers: perf.markers,
    songs: perf.songs.map((s): SekaiLiveSong => {
      const songId = resolveSong(s.link ? songPages.get(s.link) : undefined, s.jp, s.title);
      if (!songId) unresolved.set(s.title, [...(unresolved.get(s.title) ?? []), page]);
      return {
        ...(songId && { songId }),
        // Resolved songs carry the catalog title; the wiki's JP column has the odd typo.
        title: songId ? byId.get(songId)!.title : (s.jp ?? s.title),
        ...(s.note && { note: s.note }),
        ...(s.performers && { performers: s.performers })
      };
    })
  }))
}));

type ManualLive = Omit<SekaiLive, 'performances'> & {
  performances: (Omit<SekaiLive['performances'][number], 'markers'> & {
    markers?: SekaiLive['performances'][number]['markers'];
  })[];
};
const manual = JSON.parse(fs.readFileSync(MANUAL, 'utf8')) as ManualLive[];
for (const m of manual) {
  const startDate = m.startDate ?? parseStartDate(m.date);
  lives.push({
    ...m,
    ...(startDate && { startDate }),
    performances: m.performances.map((perf) => ({
      ...perf,
      markers: perf.markers ?? [],
      songs: perf.songs.map((s): SekaiLiveSong => {
        const songId =
          s.songId && byId.has(s.songId) ? s.songId : resolveSong(undefined, undefined, s.title);
        if (!songId) unresolved.set(s.title, [...(unresolved.get(s.title) ?? []), m.name]);
        return { ...s, ...(songId && { songId, title: byId.get(songId)!.title }) };
      })
    }))
  });
}

lives.sort((a, b) => (a.startDate ?? '9999').localeCompare(b.startDate ?? '9999'));

fs.writeFileSync(OUT, JSON.stringify(lives, null, 2) + '\n');
const songCount = lives.reduce(
  (n, l) => n + l.performances.reduce((m, p) => m + p.songs.length, 0),
  0
);
console.log(
  `wrote ${OUT}: ${lives.length} lives, ${lives.filter((l) => l.performances.length).length} with setlists, ${songCount} setlist entries, ${unresolved.size} unresolved titles`
);
for (const [title, pages] of unresolved)
  console.log(`  unresolved: ${title}  (${[...new Set(pages)].join('; ')})`);
