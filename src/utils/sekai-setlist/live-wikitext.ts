// Parser for live-event pages on the Project SEKAI fandom wiki (projectsekai.fandom.com), used by
// scripts/fetch-sekai-lives.ts. Handles the three setlist layouts the wiki uses:
//   - wikitables (№ | Song | Producer(s) | Singer(s)) with colspan rows for Intermission/Encore,
//   - numbered lists (#[[Song]]) under Day / Day-Night headings (Thanks Festival mini lives),
//   - either of those split across <tabber> tabs ("Daytime Performance=", "Osaka Performance=").
// Song cells stay unresolved here (wiki link + JP title); the script maps them to catalog ids.

export interface ParsedLiveSong {
  link?: string; // wiki page of the song, when linked
  title: string; // display text
  jp?: string; // JP title from {{jp|…|日本語|…}}, when given
  note?: string;
  performers?: string[];
}

export interface ParsedPerformance {
  name: string;
  songs: ParsedLiveSong[];
  markers: { at: number; label: string }[];
}

export interface ParsedLivePage {
  nameJa?: string;
  date?: string;
  venue?: string;
  notes: string[];
  performances: ParsedPerformance[];
}

/** Split on `|` at the top level, ignoring pipes inside [[links]] and nested {{templates}}. */
function splitTopLevel(s: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = '';
  for (let i = 0; i < s.length; i++) {
    const two = s.slice(i, i + 2);
    if (two === '[[' || two === '{{') {
      depth++;
      cur += two;
      i++;
    } else if ((two === ']]' || two === '}}') && depth > 0) {
      depth--;
      cur += two;
      i++;
    } else if (s[i] === '|' && depth === 0) {
      parts.push(cur);
      cur = '';
    } else cur += s[i];
  }
  parts.push(cur);
  return parts;
}

/** Find the first {{name|…}} template (case-insensitive name); returns its args and span. */
function findTemplate(s: string, name: string) {
  const start = s.toLowerCase().indexOf(`{{${name.toLowerCase()}|`);
  if (start < 0) return undefined;
  let depth = 0;
  for (let i = start; i < s.length - 1; i++) {
    const two = s.slice(i, i + 2);
    if (two === '{{' || two === '[[') {
      depth++;
      i++;
    } else if (two === '}}' || two === ']]') {
      depth--;
      i++;
      if (depth === 0) {
        const inner = s.slice(start + name.length + 3, i - 1);
        return { args: splitTopLevel(inner), start, end: i + 1 };
      }
    }
  }
  return undefined;
}

const REF = /<ref[^>]*\/>|<ref[^>]*>[\s\S]*?<\/ref>/gi;

/** Wikitext → plain text: links to their label, {{jp|X|…}} to X, markup and tags dropped. */
export function plainText(s: string): string {
  let out = s.replace(REF, '').replaceAll('{{=}}', '=');
  for (let t = findTemplate(out, 'jp'); t; t = findTemplate(out, 'jp'))
    out = out.slice(0, t.start) + t.args[0] + out.slice(t.end);
  // {{IW|wiki|Page|Label}} interwiki links (collab lives) → Label, else Page.
  for (let t = findTemplate(out, 'IW'); t; t = findTemplate(out, 'IW'))
    out = out.slice(0, t.start) + (t.args[2] ?? t.args[1] ?? '') + out.slice(t.end);
  return out
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/\[https?:\/\/\S+\s+([^\]]+)\]/g, '$1')
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/<br\s*\/?>/gi, ' / ')
    .replace(/<[^>]+>/g, '')
    .replace(/'{2,}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const LINK = /\[\[([^\]|#]*)(?:#[^\]|]*)?(?:\|([^\]]*))?\]\]/;

/** Parse a song cell / list item: `[[Song]]`, `{{jp|[[Song|Label]]|日本語|EN}} (Short ver.)`, … */
export function parseSongText(raw: string): ParsedLiveSong {
  // Footnotes can hold links of their own ("[[Azusawa Kohane|Kohane]] performs…").
  const text = raw.replace(REF, '').trim();
  const iw = findTemplate(text, 'IW');
  if (iw) {
    // Interwiki link to another game's wiki (collab lives): {{IW|wiki|Page (Song)|Label}}
    const title = plainText(iw.args[2] ?? iw.args[1] ?? '').replace(/\s*\(Song\)$/i, '');
    const note = plainText(text.slice(0, iw.start) + text.slice(iw.end));
    return { title, ...(note && { note }) };
  }
  const jp = findTemplate(text, 'jp');
  const head = jp ? jp.args[0] : text;
  const rest = jp ? text.slice(0, jp.start) + text.slice(jp.end) : text.replace(LINK, '');
  const m = LINK.exec(head);
  const note = m ? plainText(rest) : '';
  const song: ParsedLiveSong = {
    title: m ? (m[2] ?? m[1]).trim() : plainText(head),
    ...(m && { link: m[1].trim() }),
    ...(jp?.args[1] && { jp: plainText(jp.args[1]) })
  };
  if (note) song.note = note;
  return song;
}

/** Split a singer cell on top-level commas: "KAITO, DI:Verse (Akito, Toya)" → 2 names. */
function splitPerformers(cell: string): string[] {
  const names: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of plainText(cell)) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if ((ch === ',' || ch === '、') && depth === 0) {
      names.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  names.push(cur.trim());
  return names.filter(Boolean);
}

const infoboxField = (wikitext: string, field: string): string | undefined => {
  const m = new RegExp(`^\\|\\s*${field}\\s*=\\s*(.+)$`, 'm').exec(wikitext);
  const v = m && plainText(m[1]);
  return v || undefined;
};

export function parseLivePage(wikitext: string): ParsedLivePage {
  const nameJa = /\{\{jp\|'''[^']+'''\|([^|}]+)/i.exec(wikitext)?.[1]?.trim();
  const page: ParsedLivePage = {
    ...(nameJa && { nameJa }),
    date: infoboxField(wikitext, 'date'),
    venue: infoboxField(wikitext, 'venue'),
    notes: [],
    performances: []
  };

  // Label stack: heading level → text; tabber tabs sit below every heading (level 99).
  const labels = new Map<number, string>();
  let perf: ParsedPerformance | undefined;
  let labelsChanged = true;
  let inSection = false;
  let inTabber = false;
  let tableDepth = 0;
  let sawSetlist = false;
  let row: string[] = [];

  const setLabel = (level: number, text: string) => {
    for (const l of labels.keys()) if (l >= level) labels.delete(l);
    if (text) labels.set(level, text);
    labelsChanged = true;
  };
  const current = (): ParsedPerformance => {
    if (!perf || labelsChanged) {
      const name = [...labels.entries()]
        .toSorted(([a], [b]) => a - b)
        .map(([, v]) => v)
        .join(' · ');
      perf = { name, songs: [], markers: [] };
      page.performances.push(perf);
      labelsChanged = false;
    }
    return perf;
  };
  const addSong = (song: ParsedLiveSong) => {
    sawSetlist = true;
    current().songs.push(song);
  };
  const addMarker = (label: string) => {
    const p = current();
    if (label) p.markers.push({ at: p.songs.length, label });
  };
  const flushRow = () => {
    const cells = row.map((c) => c.trim());
    row = [];
    if (cells.length < 2 || !/^\d+$/.test(cells[0])) return;
    const song = parseSongText(cells[1]);
    const performers = cells[3] ? splitPerformers(cells[3]) : [];
    if (performers.length) song.performers = performers;
    addSong(song);
  };

  for (const rawLine of wikitext.split('\n')) {
    const line = rawLine.trim();
    const h = /^(=+)\s*(.*?)\s*(=+)$/.exec(line);
    const level = h ? Math.min(h[1].length, h[3].length) : 0;
    if (level === 2) {
      inSection = /setlist/i.test(h![2]);
      continue;
    }
    if (!inSection) continue;
    if (level > 2) {
      setLabel(level, plainText(h![2]));
      continue;
    }
    if (/<tabber>/i.test(line)) inTabber = true;
    if (/<\/tabber>/i.test(line)) inTabber = false;

    if (line.startsWith('{|')) {
      tableDepth++;
      row = [];
      continue;
    }
    if (tableDepth > 0) {
      if (line.startsWith('|}')) {
        flushRow();
        tableDepth--;
      } else if (line.startsWith('|-')) flushRow();
      else if (/colspan/i.test(line) && /^[|!]/.test(line)) {
        flushRow();
        addMarker(plainText(line.slice(line.lastIndexOf('|') + 1)));
      } else if (line.startsWith('|')) row.push(...line.replace(/^\|+/, '').split('||'));
      continue;
    }

    if (line === '|-|') continue;
    const tab = inTabber && /^([^|{}!#*<=[][^=]*?)\s*=\s*$/.exec(line);
    if (tab) {
      setLabel(99, plainText(tab[1]));
      continue;
    }
    const item = /^#(?!REDIRECT)\s*(.+)$/i.exec(line);
    if (item) {
      addSong(parseSongText(item[1]));
      continue;
    }
    // Free text before the first setlist is a note ("The setlist was the same on all days.").
    if (!sawSetlist && !line.startsWith('*')) {
      const note = plainText(line);
      if (note && !/^TB[AD]\b/i.test(note)) page.notes.push(note);
    }
  }

  page.performances = page.performances.filter((p) => p.songs.length > 0);
  return page;
}

const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december'
];

/** First "Month D … YYYY" (or "D Month YYYY") in a wiki date string → YYYY-MM-DD. */
export function parseStartDate(date: string | undefined): string | undefined {
  if (!date) return undefined;
  // (?!\d) keeps "February 2025" from reading "20" as the day.
  const re = new RegExp(`(\\d{1,2})?\\s*\\b(${MONTHS.join('|')})\\b\\s*(\\d{1,2}(?!\\d))?`, 'i');
  const m = re.exec(date);
  const year = /\b(20\d\d)\b/.exec(date)?.[1];
  const day = m?.[3] ?? m?.[1];
  if (!m || !year || !day) return undefined;
  const month = MONTHS.indexOf(m[2].toLowerCase()) + 1;
  return `${year}-${String(month).padStart(2, '0')}-${day.padStart(2, '0')}`;
}
