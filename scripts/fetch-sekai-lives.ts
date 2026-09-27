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
import songsData from '../data/sekai/songs.json';
import { parseLivePage, parseStartDate } from '../src/utils/sekai-setlist/live-wikitext';
import type { SekaiLive, SekaiLiveSeries, SekaiLiveSong, SekaiSong } from '../src/types/sekai';

const API = 'https://projectsekai.fandom.com/api.php';
const WIKI = 'https://projectsekai.fandom.com/wiki/';
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

interface WikiPage {
  title: string;
  content: string;
}

/** Fetch page wikitext in batches of 50, following redirects. Keyed by the requested title. */
async function fetchPages(titles: string[]): Promise<Map<string, WikiPage>> {
  const out = new Map<string, WikiPage>();
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
    const params = new URLSearchParams({
      action: 'query',
      prop: 'revisions',
      rvprop: 'content',
      rvslots: 'main',
      redirects: '1',
      format: 'json',
      formatversion: '2',
      titles: batch.join('|')
    });
    const res = await fetch(`${API}?${params}`);
    if (!res.ok) throw new Error(`fandom API: ${res.status}`);
    const data = (await res.json()) as {
      query: {
        normalized?: { from: string; to: string }[];
        redirects?: { from: string; to: string }[];
        pages: {
          title: string;
          missing?: boolean;
          revisions?: { slots: { main: { content: string } } }[];
        }[];
      };
    };
    const hop = new Map<string, string>();
    for (const r of [...(data.query.normalized ?? []), ...(data.query.redirects ?? [])])
      hop.set(r.from, r.to);
    const byTitle = new Map(data.query.pages.map((p) => [p.title, p]));
    for (const requested of batch) {
      let t = requested;
      for (let n = 0; n < 5 && hop.has(t); n++) t = hop.get(t)!;
      const content = byTitle.get(t)?.revisions?.[0]?.slots.main.content;
      if (content) out.set(requested, { title: t, content });
    }
  }
  return out;
}

// --- song resolution

const catalog = songsData as unknown as SekaiSong[];
const norm = (s: string) =>
  s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s・･·.,!?！？'"’“”「」『』~〜ー-]/g, '');
const byId = new Map(catalog.map((s) => [s.id, s]));
const byTitle = new Map<string, string>();
for (const s of catalog) {
  byTitle.set(norm(s.title), s.id);
  if (s.englishName && !byTitle.has(norm(s.englishName))) byTitle.set(norm(s.englishName), s.id);
}

const infobox = (content: string, field: string) =>
  new RegExp(`^\\|\\s*${field}\\s*=\\s*(.+?)\\s*$`, 'm').exec(content)?.[1];

function resolveSong(
  songPage: WikiPage | undefined,
  jp: string | undefined,
  title: string
): string | undefined {
  const pageId = songPage && infobox(songPage.content, 'id');
  const pageJa = songPage && infobox(songPage.content, 'japanese');
  const byName = [pageJa, jp, songPage?.title, title]
    .filter((t): t is string => !!t)
    .map((t) => byTitle.get(norm(t)))
    .find(Boolean);
  if (pageId && /^\d+$/.test(pageId)) {
    const id = String(Number(pageId));
    const s = byId.get(id);
    if (s && (!pageJa || norm(pageJa) === norm(s.title) || !byName)) return id;
  }
  return byName;
}

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
        const songId = s.songId ?? resolveSong(undefined, undefined, s.title);
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
