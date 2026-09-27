/**
 * Chromium end-to-end check for the Project Sekai setlist builder (/builder), plus the live /
 * song / unit pages and the attendance log (/me).
 *
 *   bun dev                                   # in another terminal (serves :3000)
 *   bun scripts/e2e/sekai-setlist.e2e.ts      # headless, desktop + phone
 *   HEADED=1 bun scripts/e2e/sekai-setlist.e2e.ts
 *   BASE_URL=https://mting314.github.io/sekai-setlist bun scripts/e2e/sekai-setlist.e2e.ts
 *
 * Needs a Chromium that can launch (`bunx playwright install chromium`). Screenshots go to
 * test-results/sekai-setlist/. Exits non-zero if any check fails. The file name ends in .e2e.ts
 * so vitest doesn't pick it up.
 *
 * Expected counts come from data/sekai/songs.json, so re-running scripts/fetch-sekai-songs.ts
 * can shift them. They're computed here rather than hard-coded.
 */
import fs from 'fs';
import {
  chromium,
  devices,
  type Browser,
  type BrowserContextOptions,
  type Locator,
  type Page
} from 'playwright';
const songs = JSON.parse(
  fs.readFileSync(new URL('../../data/sekai/songs.json', import.meta.url), 'utf8')
);

const BASE = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const PAGE_URL = `${BASE}/builder`;
const LIVE_ID = 'project-sekai-colorful-live-3rd-evolve';
const OUT = 'test-results/sekai-setlist';
fs.mkdirSync(OUT, { recursive: true });

type CatalogSong = { units: string[]; commissioned: boolean };
const catalog = songs as CatalogSong[];
const count = (f: (s: CatalogSong) => boolean) => catalog.filter(f).length;
const EXPECT = {
  all: catalog.length,
  leo: count((s) => s.units.includes('leo_need')),
  other: count((s) => s.units.length === 0),
  leoOrOther: count((s) => s.units.length === 0 || s.units.includes('leo_need')),
  commissioned: count((s) => s.commissioned),
  cover: count((s) => !s.commissioned)
};

const failures: string[] = [];
function check(name: string, ok: boolean, detail?: unknown) {
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${detail === undefined ? '' : `  (${JSON.stringify(detail)})`}`;
  console.log(line);
  if (!ok) failures.push(line);
}

async function imgStats(root: Page | Locator, pattern: string) {
  return root.locator(`img[src*="${pattern}"]`).evaluateAll((els) =>
    (els as HTMLImageElement[]).map((i) => ({
      loaded: i.complete && i.naturalWidth > 0,
      failed: i.complete && i.naturalWidth === 0,
      referrerPolicy: i.referrerPolicy
    }))
  );
}

// Setlist rows only; search results carry data-song-id too.
const setlistIds = (page: Page) =>
  page
    .locator('[data-item-id][data-song-id]')
    .evaluateAll((els) => els.map((e) => e.getAttribute('data-song-id')));

async function run(label: string, opts: BrowserContextOptions, browser: Browser) {
  console.log(`\n=== ${label}`);
  const ctx = await browser.newContext({ ...opts, locale: 'en-US' });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
  const page = await ctx.newPage();
  const consoleErrors: string[] = [];
  const httpErrors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));
  page.on('response', (r) => {
    if (r.status() >= 400) httpErrors.push(`${r.status()} ${r.url()}`);
  });
  page.on('dialog', (d) => void d.accept()); // prediction delete uses window.confirm

  await page.goto(PAGE_URL, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('i18nextLng', 'en');
  });
  await page.reload({ waitUntil: 'networkidle' });
  const shot = (n: string, fullPage = true) =>
    page.screenshot({ path: `${OUT}/${label}-${n}.png`, fullPage });

  const phone = label === 'phone';
  const menu = async (trigger: string, item: string) => {
    await page.getByRole('button', { name: trigger }).click();
    await page.getByRole('menuitem', { name: item }).click();
  };
  const noOverflow = async (where: string) => {
    if (!phone) return;
    const px = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    check(`no horizontal page overflow (${where})`, px <= 0, px);
  };
  const nameInput = page.getByRole('textbox', { name: 'Prediction name' });
  const rows = page.locator('[data-item-id]');

  // --- first visit: the New dialog opens on its own
  const newDialog = page.getByRole('dialog', { name: 'New prediction' });
  await newDialog.waitFor();
  check('New dialog opens on first visit', await newDialog.isVisible());
  await shot('01-new-dialog', false);
  await newDialog.getByRole('textbox', { name: 'Search lives' }).fill('evolve');
  await newDialog.locator(`[data-live-option="${LIVE_ID}"]`).click();
  await newDialog.getByRole('button', { name: 'Create' }).click();
  await newDialog.waitFor({ state: 'hidden' });
  check('new prediction gets a default name', (await nameInput.inputValue()).length > 0);
  check('URL points at the prediction', /[?&]prediction=/.test(page.url()), page.url());
  await shot('02-empty-builder');

  // --- song search: left panel on desktop, drawer on phone
  let search: Locator;
  if (phone) {
    await page.getByRole('button', { name: 'Song search' }).click();
    search = page.getByRole('dialog', { name: 'Song search' });
    await search.waitFor();
  } else {
    search = page.locator('[data-builder-panel="search"]');
  }
  const resultCount = async () => {
    await page.waitForTimeout(150);
    const txt = await search.getByText(/^Showing \d+/).textContent();
    const [, shown, total] = txt?.match(/Showing (\d+)(?: of (\d+))?/) ?? [];
    return Number(total ?? shown);
  };
  check('initial result count = catalog size', (await resultCount()) === EXPECT.all, EXPECT.all);

  await page.waitForTimeout(2500); // let lazy jackets + icons load
  const jackets = await imgStats(search, 'music/jacket');
  const loadedCount = jackets.filter((j) => j.loaded).length;
  check('jackets rendered', jackets.length > 0, jackets.length);
  check(
    'visible jackets loaded',
    loadedCount > 0 && !jackets.some((j) => j.failed),
    `${loadedCount}/${jackets.length}`
  );
  check(
    'jackets use no-referrer',
    jackets.every((j) => j.referrerPolicy === 'no-referrer')
  );
  const unitIcons = await imgStats(search, 'sekai/units');
  check(
    'unit icons loaded',
    unitIcons.length >= 6 && unitIcons.every((i) => i.loaded),
    unitIcons.length
  );
  const charaIcons = await imgStats(search, 'sekai/chara');
  check(
    'vocalist icons loaded',
    charaIcons.length > 0 && charaIcons.every((i) => i.loaded),
    charaIcons.length
  );
  await shot('03-search', false);

  const chip = (name: RegExp) => search.getByRole('button', { name });
  await chip(/^Leo\/need/).click();
  check('Leo/need filter', (await resultCount()) === EXPECT.leo, EXPECT.leo);
  await chip(/^Other/).click();
  check('Leo/need OR Other', (await resultCount()) === EXPECT.leoOrOther, EXPECT.leoOrOther);
  await chip(/^Leo\/need/).click();
  check('Other only', (await resultCount()) === EXPECT.other, EXPECT.other);
  await chip(/^Other/).click();
  await chip(/^Commissioned$/).click();
  check('Commissioned', (await resultCount()) === EXPECT.commissioned, EXPECT.commissioned);
  await chip(/^Covers$/).click();
  check('Covers', (await resultCount()) === EXPECT.cover, EXPECT.cover);
  await chip(/^All$/).click();

  const box = search.getByRole('textbox', { name: 'Search songs' });
  const add = (name: string) => search.getByRole('button', { name: `Add ${name} to setlist` });
  await box.fill('roki'); // EN name of ロキ (id 2)
  check('EN-name search finds ROKI', (await add('ROKI').count()) === 1);
  await add('ROKI').click();
  await box.fill('Tell Your World');
  await add('Tell Your World').click();
  await add('Tell Your World').click(); // duplicate on purpose
  await box.fill('teo');
  await add('Teo').click();
  await box.fill('');
  await shot('04-songs-added', false);
  if (phone) {
    await noOverflow('song search drawer open');
    await page.keyboard.press('Escape');
    await search.waitFor({ state: 'hidden' });
  }

  const added = await setlistIds(page);
  check(
    '4 songs in setlist incl. duplicate',
    added.length === 4 && added.filter((i) => i === '1').length === 2,
    added
  );

  // --- quick add ENCORE: double-click in the panel, or the + button's sheet on phone
  if (phone) {
    await page.getByRole('button', { name: 'Add item' }).click();
    const sheet = page.getByRole('dialog', { name: 'Add item' });
    await sheet.getByRole('button', { name: 'Encore' }).click();
    await sheet.waitFor({ state: 'hidden' });
  } else {
    await search.locator('[data-quick-add="encore"]').dblclick();
  }
  await page.waitForTimeout(200);
  check(
    'encore row added at the end',
    (await rows.last().getAttribute('data-item-type')) === 'encore',
    await rows.evaluateAll((els) => els.map((e) => e.getAttribute('data-item-type')))
  );

  // --- reorder by drag handle
  const before = await setlistIds(page);
  const handle = rows.first().locator('[data-drag-handle]');
  if (phone) {
    // Pointer drag (PointerSensor, 8px activation): first row down onto the second row.
    const a = await handle.boundingBox();
    const b = await rows.nth(1).locator('[data-drag-handle]').boundingBox();
    if (a && b) {
      await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
      await page.mouse.down();
      await page.mouse.move(a.x + a.width / 2, b.y + b.height / 2, { steps: 12 });
      await page.waitForTimeout(100);
      await page.mouse.up();
    }
  } else {
    // Keyboard drag (KeyboardSensor): space to pick up, arrow down, space to drop.
    await handle.focus();
    await page.keyboard.press('Space');
    await page.waitForTimeout(300);
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(300);
    await page.keyboard.press('Space');
  }
  await page.waitForTimeout(400);
  const after = await setlistIds(page);
  check(
    'drag reorders songs',
    after[0] !== before[0] && JSON.stringify(after) !== JSON.stringify(before),
    { before, after }
  );

  // --- edit dialog: add a remark to the first row
  await rows
    .first()
    .getByRole('button', { name: /^Edit / })
    .click();
  const editDialog = page.getByRole('dialog', { name: 'Edit item' });
  await editDialog.getByRole('button', { name: 'Short Ver.' }).click();
  await editDialog.getByRole('button', { name: 'Save' }).click();
  await editDialog.waitFor({ state: 'hidden' });
  check('remark shows on the row', (await rows.first().getByText('Short Ver.').count()) === 1);

  // --- name + autosave survives a reload
  const name = `E2E ${label}`;
  await nameInput.fill(name);
  await page.waitForTimeout(800); // autosave debounce
  await shot('05-built');
  await noOverflow('builder');
  await page.reload({ waitUntil: 'networkidle' });
  await nameInput.waitFor();
  check('name survives reload', (await nameInput.inputValue()) === name);
  check(
    'songs + order survive reload',
    JSON.stringify(await setlistIds(page)) === JSON.stringify(after),
    await setlistIds(page)
  );
  check('remark survives reload', (await rows.first().getByText('Short Ver.').count()) === 1);

  // --- share link -> /view in a fresh browser
  let actions: Locator;
  if (phone) {
    await menu('More', 'Actions');
    actions = page.getByRole('dialog', { name: 'Actions' });
    await actions.waitFor();
    await shot('06-actions-drawer', false);
  } else {
    actions = page.locator('[data-builder-panel="actions"]');
  }
  await actions.getByRole('button', { name: 'Copy share link' }).click();
  await page.waitForTimeout(300);
  const shared = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''));
  check('share link is /view#p=', /\/view#p=/.test(shared), shared.slice(0, 80));
  if (phone) await page.keyboard.press('Escape');

  const ctx2 = await browser.newContext({ ...opts, locale: 'en-US' });
  const p2 = await ctx2.newPage();
  await p2.goto(shared, { waitUntil: 'networkidle' });
  await p2.waitForTimeout(500);
  check('/view shows the name', (await p2.getByText(name, { exact: true }).count()) > 0);
  check(
    '/view shows every song',
    (await p2.locator('[data-view-item="song"]').count()) === after.length,
    await p2.locator('[data-view-item="song"]').count()
  );
  check('/view shows the encore', (await p2.locator('[data-view-item="encore"]').count()) === 1);
  check('/view shows the remark', (await p2.getByText('Short Ver.').count()) > 0);
  check(
    '/view offers saving',
    await p2.getByRole('button', { name: 'Save to my predictions' }).isVisible()
  );
  await p2.screenshot({ path: `${OUT}/${label}-07-view.png`, fullPage: true });
  await ctx2.close();

  // --- a second (custom event) prediction, then Load / Delete
  if (phone) await menu('Builder menu', 'New');
  else await page.getByRole('button', { name: 'New', exact: true }).click();
  await newDialog.waitFor();
  await newDialog.getByRole('button', { name: 'Custom' }).click();
  await newDialog.getByRole('textbox', { name: 'Event name' }).fill('E2E custom event');
  await newDialog.getByRole('button', { name: 'Create' }).click();
  await newDialog.waitFor({ state: 'hidden' });
  check('New starts an empty setlist', (await rows.count()) === 0);
  check('custom event name used', (await nameInput.inputValue()).includes('E2E custom event'));
  await page.waitForTimeout(800);

  const openLoad = async () => {
    if (phone) await menu('Builder menu', 'Load');
    else await page.getByRole('button', { name: 'Load', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Load prediction' });
    await dialog.waitFor();
    return dialog;
  };
  let loadDialog = await openLoad();
  const saved = loadDialog.locator('[data-prediction-id]');
  check('Load lists both predictions', (await saved.count()) === 2, await saved.count());
  await shot('08-load-dialog', false);
  await saved.filter({ hasText: name }).click();
  await loadDialog.getByRole('button', { name: 'Load', exact: true }).click();
  await loadDialog.waitFor({ state: 'hidden' });
  check('Load restores the name', (await nameInput.inputValue()) === name);
  check(
    'Load restores the songs',
    JSON.stringify(await setlistIds(page)) === JSON.stringify(after)
  );

  loadDialog = await openLoad();
  await loadDialog.getByRole('button', { name: `Delete ${name}` }).click(); // confirm auto-accepted
  await page.waitForTimeout(200);
  check('prediction deleted', (await saved.filter({ hasText: name }).count()) === 0);
  await page.keyboard.press('Escape');

  await shot('09-builder-final');

  // --- repository pages + attendance log
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  if (phone) await page.getByRole('button', { name: 'Open Menu' }).click();
  for (const name of ['Lives', 'Songs', 'My Lives', 'Predict'])
    check(
      `nav has ${name}`,
      await page.getByRole('link', { name, exact: true }).first().isVisible()
    );
  if (phone) await page.keyboard.press('Escape');
  await noOverflow('home');

  await page.goto(`${BASE}/lives/${LIVE_ID}`, { waitUntil: 'networkidle' });
  const show = page.getByRole('group', { name: 'How you attended Tokyo Day 1 · Daytime' });
  await show.getByRole('button', { name: 'In person' }).click();
  await page.reload({ waitUntil: 'networkidle' });
  check(
    'attendance survives reload',
    (await show.getByRole('button', { name: 'In person' }).getAttribute('aria-pressed')) === 'true'
  );
  check('attended setlist marked', (await page.getByText('You were here').count()) === 1);
  await noOverflow('live page');
  await shot('10-live-page');

  const firstSong = page.locator('a[href*="/songs/"]').first();
  const songHref = await firstSong.getAttribute('href');
  await Promise.all([page.waitForURL((u) => u.pathname.includes('/songs/')), firstSong.click()]);
  await page.waitForLoadState('networkidle');
  check(
    'setlist song links to its page',
    page
      .url()
      .replace(/\/$/, '')
      .endsWith(songHref?.replace(/\/$/, '') ?? '?'),
    page.url()
  );
  const heardNote = page.getByText(/You heard this live/);
  await heardNote.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  check('song page says you heard it', await heardNote.isVisible());
  const unitLink = page.locator('a[href*="/units/"]').first();
  await Promise.all([page.waitForURL((u) => u.pathname.includes('/units/')), unitLink.click()]);
  await page.waitForLoadState('networkidle');
  const mostPerf = page.getByText('Most performed');
  await mostPerf.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  check('unit page loads', await mostPerf.isVisible(), page.url());
  await noOverflow('unit page');

  await page.goto(`${BASE}/me`, { waitUntil: 'networkidle' });
  const showsStat = page
    .locator('p', { hasText: /^Shows$/ })
    .first()
    .locator('xpath=following-sibling::*[1]');
  check('My Lives counts the show', (await showsStat.textContent()) === '1');
  await noOverflow('my lives');
  await shot('11-my-lives');
  await page.evaluate(() => localStorage.removeItem('sekai-setlist:attendance'));
  check('no console errors', consoleErrors.length === 0, consoleErrors);
  check('no HTTP >= 400', httpErrors.length === 0, httpErrors);
  await ctx.close();
}

const browser = await chromium.launch({ headless: !process.env.HEADED });
try {
  await run('desktop', { viewport: { width: 1280, height: 900 } }, browser);
  await run('phone', { ...devices['iPhone 13'] }, browser);
} finally {
  await browser.close();
}
console.log(
  `\n${failures.length ? `${failures.length} FAILED` : 'ALL PASSED'} — screenshots in ${OUT}/`
);
process.exit(failures.length ? 1 : 0);
