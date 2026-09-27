# Handover: Chromium tests + agentic browser pass

> Point a fresh agent at this file in an environment where **headless Chromium can launch** (an
> OD/devserver, a cloud sandbox, or a laptop without the Chrome mach-port restriction). On the
> machine this was built on, every Chromium launch died with
> `bootstrap_check_in … MachPortRendezvousServer: Permission denied` → SIGTRAP (Playwright's
> headless shell, system Chrome and the qpl browser MCP), so nothing below has run in a real
> browser yet.

## State

This repo is the standalone Project Sekai setlist predictions site (see `README.md`). It started
from a clean initial commit; the earlier history (a full copy of the-sorter plus the Sekai port) is
kept on the `archive/the-sorter-copy` tag.

Verified without a browser: `bun check` green, vitest green (scoring, share links, pasted-setlist
parsing, lives wikitext), production build under `/sekai-setlist` prerenders `/`, `/builder`,
`/mark`, `/lives` and the legacy redirects, and SSR HTML contains the nav and lives.

**Not verified:** anything that needs a rendered browser: images painting, filters changing
lists, drag and drop, clipboard, share-link round trips, slots, marking, phone layout.

## Setup

```bash
git clone https://github.com/mting314/sekai-setlist && cd sekai-setlist
bun install
bunx playwright install chromium        # playwright is already a devDependency
lsof -iTCP:3000 -sTCP:LISTEN            # make sure no other Vite server is on :3000
bun dev                                 # http://localhost:3000 (Vike rejects --port)
```

## Task 1: run the scripted Chromium test

```bash
bun scripts/e2e/sekai-setlist.e2e.ts            # headless, desktop 1280×900 + iPhone 13
HEADED=1 bun scripts/e2e/sekai-setlist.e2e.ts   # watch it
```

It prints PASS/FAIL per check, writes screenshots to `test-results/sekai-setlist/`, and exits
non-zero on failure. It covers the builder (`/builder`): nav link, result count, jackets loaded
with `no-referrer`, unit and vocalist icons, unit / commissioned / cover filter counts computed from
`songs.json`, EN-name search, duplicate add, keyboard and pointer drag in exact-order mode, share
link round trip in a fresh context, save / New / load / delete slot, no phone overflow, no console
errors, no HTTP ≥ 400.

The script was written blind. Expect to fix selectors or timing first: fix the **script** when
it's wrong about the UI, fix the **app** when the UI is wrong. Then open every screenshot and look
at it for layout, image quality, truncation and dark-on-dark text. Extend it to cover `/` and
`/mark` (Task 2, items 1–3) once it passes.

## Task 2: agentic exploratory pass

Drive the site with a browser agent (Playwright MCP, `meta browser`, or ad-hoc scripts) and try to
break it. At minimum:

1. **Home (`/`):** "Setlist not out yet" lists the fan meetings; Predict opens the builder with that
   live selected and the title "My <live> prediction"; saved predictions appear after saving a slot,
   with Edit and Mark working.
2. **Mark (`/mark`):** load a prediction from a slot, a pasted share link, and a `#s=` hash; score
   it against a past live and against a pasted setlist (numbered lines, `-- Encore --`, `EN1`,
   `(Short ver.)` notes, an unknown line that should show as unresolved). Check the accuracy %,
   exact / close / present pills, "was #n" notes, bonus badges and the missed list against the
   rules in `README.md`. A perfect prediction scores 100%.
3. **Builder ↔ Mark:** the Predicting live selector retitles an untouched title only; New keeps the
   live; Mark carries the prediction and live over; Edit goes back with the same state.
4. **Phone (≈390px) and small phone (360px):** search dialog fits (`100dvh`), unit chip row scrolls
   horizontally, rows don't overflow, touch drag works via the grip handle and the page still
   scrolls elsewhere. Mark's score card rows don't overflow.
5. **Encore:** bag mode ✦ toggle moves songs between Main / Encore; in exact-order mode drag the
   divider and songs across it; switching modes preserves the split.
6. **Limits:** 50-song cap disables Add; search result cap (200 + "refine your search").
7. **JA locale** (`localStorage.i18nextLng = 'ja'`): JP titles, translated units and game strings,
   nothing clipped.
8. **Dark and light mode:** teal accent, unit chips, score pills and badges stay readable.
9. **Jacket failure:** block `storage.sekai.best`; rows fall back to the unit-color tile, no layout
   jump, no console spam.
10. **Bad links:** cold-load a `#s=` URL, `#s=garbage` (empty, no crash), a song id not in the
    catalog, `?live=unknown`.
11. **Legacy paths:** `/sekai-setlist/`, `/sekai-setlist/lives/` and `/setlist-prediction/`
    redirect (keeping the hash) under the deployed base.
12. **Keyboard / a11y:** tab through the editor, dialog and mark flow; Escape closes the dialog and
    focus returns to "Add songs"; drag handles have labels.
13. **Past setlists (`/lives`):** filters narrow the list and dim non-matching rows; Encore /
    Intermission dividers sit right; "Most performed" follows the filters; "Open in builder",
    "Predict this setlist" and "Mark a prediction" go to the right place.

Record findings as a short list; fix what's clearly a bug, ask about anything that's a design call.

## Task 3: deploy (ask before enabling)

GitHub Actions are disabled on this repo. To go live: enable Actions, set Pages → Source to
"GitHub Actions", and push to `main`; `deploy.yml` builds with `PUBLIC_ENV__BASE_URL=/sekai-setlist`.
Then run the e2e script against the deployed site. This is the real test of the no-referrer jacket
fix, since localhost Referers aren't blocked:

```bash
BASE_URL=https://mting314.github.io/sekai-setlist bun scripts/e2e/sekai-setlist.e2e.ts
```

## Constraints

- Conventional commits with a lowercase-kebab scope, e.g. `fix(mark): …`. Keep `bun check` green.
- Related: [sekai-story-indexer PR #57](https://github.com/mting314/sekai-story-indexer/pull/57)
  (draft) removes the old builder from the indexer. Merge it only after this site is live.
