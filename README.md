# Project Sekai Setlist Predictions

Guess the setlist for the next COLORFUL LIVE, Thanks Festival, Sekai Symphony or fan meeting,
share it as a link, then score it against the real setlist once it's out.

Deploys to https://mting314.github.io/sekai-setlist/ via GitHub Pages (`deploy.yml`, on push to
`main`).

## Pages

| Path         | What it does                                                                                               |
| ------------ | ---------------------------------------------------------------------------------------------------------- |
| `/`          | Events hub: upcoming lives to predict, the latest setlists, your attendance stats                          |
| `/lives`     | Past setlists with series / unit / kind filters, "Most performed", attended badges                         |
| `/lives/:id` | One live: its shows (log whether you were there, in person / live viewing / stream), setlists, predictions |
| `/songs`     | Every song, searchable, filterable by unit and kind, sortable by times performed                           |
| `/songs/:id` | One song: units, vocalists, every live performance, how many times you heard it                            |
| `/units/:id` | One unit (or Other): its songs by times performed, the lives that featured it                              |
| `/me`        | My Lives: shows you attended, songs heard, per-unit progress; export / import JSON, read-only share link   |
| `/predict`   | How the prediction game works, your saved predictions, lives still waiting on a setlist                    |
| `/builder`   | Build a prediction: drag in songs, MC / encore rows, remarks, import a past setlist, share as link / image |
| `/view`      | A shared prediction, read-only, with save / edit / mark                                                    |
| `/mark`      | Score a prediction against a setlist from `/lives` or a pasted one-song-per-line setlist                   |

Shows (which dates and day/night performances a live had, and which setlist each used) come from
`data/sekai/shows.json`; lives not listed there get one show per setlist. Attendance is stored in
`localStorage` (`sekai-setlist:attendance`); a `/me#a=…` link shares it read-only.

The builder autosaves each prediction to `localStorage` (`sekai-setlist:predictions`); New / Load
switch between them, and saved slots from the old builder are migrated on first load. A share link
(`/view#p=…`) is the whole prediction lz-string encoded into the hash, so there's no backend; old
`#s=…` links still open in the builder and in `/mark`. The old `/sekai-setlist/`,
`/sekai-setlist/lives/` and `/setlist-prediction/` paths redirect via static pages in `public/`.

## Scoring

Ordered predictions score each predicted song once, against its best unclaimed landing:

| Match                                  | Points |
| -------------------------------------- | ------ |
| Exact position                         | 15     |
| Within 2 positions                     | 8      |
| Anywhere else in the setlist           | 3      |
| Opener / closer / encore break correct | 5 each |

Max is `songs × 15 + 10`, plus 5 when the real setlist has an encore. A song performed twice has to
be predicted twice to score twice. Unordered predictions score 10 per performed song and no
bonuses; only old `#s=` links made with the previous builder's unordered mode can be unordered.
Rules live in `src/utils/sekai-setlist/scoring.ts`.

## Data

- `data/sekai/{songs,units,characters}.json`: song catalog from the
  [sekai-world master DB](https://github.com/Sekai-World). Refresh with `bun fetch:songs`.
- `data/sekai/lives.json`: past setlists, parsed from the
  [Project SEKAI wiki](https://projectsekai.fandom.com/) (`src/utils/sekai-setlist/live-wikitext.ts`)
  and merged with hand-entered `data/sekai/lives-manual.json` (fan meetings, schedule from
  LiveFans). Refresh with `bun fetch:lives`; lives without a setlist yet show up as predictable on
  the home page.
- Jackets are hotlinked from `storage.sekai.best` with `referrerPolicy="no-referrer"` (the CDN 403s
  third-party Referers). Unit and vocalist icons are bundled in `public/assets/sekai/`.

## Development

Everything runs through bun; `node` may not be on PATH.

```bash
bun install
bun dev                                        # http://localhost:3000
bun check                                      # oxlint + eslint + tsc
bun node_modules/vitest/vitest.mjs run         # unit tests
PUBLIC_ENV__BASE_URL=/sekai-setlist bun run ci:build && bun preview
```

- Vike rejects `--port`. Check `lsof -iTCP:3000 -sTCP:LISTEN` first: two Vite servers on IPv4 and
  IPv6 :3000 give stale-page red herrings.
- Lint directly with `bun node_modules/oxlint/bin/oxlint src`, not `bun x oxlint`.
- Browser checks: `bun scripts/e2e/sekai-setlist.e2e.ts` (Playwright, desktop + phone, screenshots
  in `test-results/`). See `HANDOVER.md`.
- Conventional commits with a lowercase-kebab scope, e.g. `fix(scoring): …`
  (`bun check-version` validates a message file).

## Stack

React 19, Vike (SSR + prerender), Panda CSS with Park UI, react-i18next (EN / JA), dnd-kit,
lz-string, vitest.

## Credits

Built on the [LoveLive! Sorter](https://github.com/hamproductions/the-sorter) codebase by
hamproductions. Fan-made; not affiliated with SEGA, Colorful Palette or Crypton Future Media.
