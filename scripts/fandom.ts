/**
 * The Project SEKAI fandom wiki (https://projectsekai.fandom.com) API, and matching its song pages
 * to the bundled song catalog. Shared by the fetch scripts.
 */
import songsData from '../data/sekai/songs.json';
import type { SekaiSong } from '../src/types/sekai';

export const API = 'https://projectsekai.fandom.com/api.php';
export const WIKI = 'https://projectsekai.fandom.com/wiki/';

export interface WikiPage {
  title: string;
  content: string;
}

/** Every response of an API query, following `continue` until the result is complete. */
export async function* queryAll<T>(params: Record<string, string>): AsyncGenerator<T> {
  let cont: Record<string, string> = {};
  for (;;) {
    const res = await fetch(
      `${API}?${new URLSearchParams({ format: 'json', formatversion: '2', ...params, ...cont })}`
    );
    if (!res.ok) throw new Error(`fandom API: ${res.status}`);
    const data = (await res.json()) as { continue?: Record<string, string> };
    yield data as T;
    if (!data.continue) return;
    cont = data.continue;
  }
}

/** Fetch page wikitext in batches of 50, following redirects. Keyed by the requested title. */
export async function fetchPages(titles: string[]): Promise<Map<string, WikiPage>> {
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

export const catalog = songsData as unknown as SekaiSong[];
const norm = (s: string) =>
  s
    .normalize('NFKC')
    .toLowerCase()
    // ー is kept: dropping it would make ルーマー and ルマ the same key.
    .replace(/[\s・･·.,!?！？'"’“”「」『』~〜-]/g, '');
export const byId = new Map(catalog.map((s) => [s.id, s]));
const byTitle = new Map<string, string>();
const ambiguous = new Set<string>(); // keys shared by different songs never resolve by name
for (const s of catalog) {
  const key = norm(s.title);
  const prev = byTitle.get(key);
  if (prev && prev !== s.id) {
    ambiguous.add(key);
    console.warn(`ambiguous title key "${key}": songs ${prev} and ${s.id}`);
  }
  byTitle.set(key, s.id);
}
for (const s of catalog)
  if (s.englishName && !byTitle.has(norm(s.englishName))) byTitle.set(norm(s.englishName), s.id);
const lookupTitle = (t: string) => (ambiguous.has(norm(t)) ? undefined : byTitle.get(norm(t)));

const infobox = (content: string, field: string) =>
  new RegExp(`^\\|\\s*${field}\\s*=\\s*(.+?)\\s*$`, 'm').exec(content)?.[1];

/**
 * A song's catalog id: the wiki song page's infobox `id` (the in-game music id), cross-checked
 * against its `japanese` title, else by name.
 */
export function resolveSong(
  songPage: WikiPage | undefined,
  jp: string | undefined,
  title: string
): string | undefined {
  const pageId = songPage && infobox(songPage.content, 'id');
  const pageJa = songPage && infobox(songPage.content, 'japanese');
  const byName = [pageJa, jp, songPage?.title, title]
    .filter((t): t is string => !!t)
    .map(lookupTitle)
    .find(Boolean);
  if (pageId && /^\d+$/.test(pageId)) {
    const id = String(Number(pageId));
    const s = byId.get(id);
    if (s && (!pageJa || norm(pageJa) === norm(s.title) || !byName)) return id;
  }
  return byName;
}
