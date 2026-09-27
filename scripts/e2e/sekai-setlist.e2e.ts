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
import { chromium, devices, type Browser, type BrowserContextOptions, type Page } from 'playwright';
const songs = JSON.parse(
  fs.readFileSync(new URL('../../data/sekai/songs.json', import.meta.url), 'utf8')
);

const BASE = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const PAGE_URL = `${BASE}/builder`;
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

async function imgStats(page: Page, pattern: string) {
  return page.locator(`img[src*="${pattern}"]`).evaluateAll((els) =>
    (els as HTMLImageElement[]).map((i) => ({
      loaded: i.complete && i.naturalWidth > 0,
      failed: i.complete && i.naturalWidth === 0,
      referrerPolicy: i.referrerPolicy
    }))
  );
}

const setlistIds = (page: Page) =>
  page
    .locator('[data-song-id]')
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
  page.on('dialog', (d) => void d.accept()); // slot delete uses window.confirm

  await page.goto(PAGE_URL, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('i18nextLng', 'en');
  });
  await page.reload({ waitUntil: 'networkidle' });
  const shot = (n: string, fullPage = true) =>
    page.screenshot({ path: `${OUT}/${label}-${n}.png`, fullPage });

  await shot('01-empty');

  // --- search dialog + filters
  await page
    .getByRole('button', { name: /Add songs/ })
    .first()
    .click();
  const dialog = page.getByRole('dialog');
  await dialog.waitFor();
  const resultCount = async () => {
    await page.waitForTimeout(150);
    const txt = await dialog
      .getByText(/^\d+ songs$/)
      .first()
      .textContent();
    return Number(txt?.match(/\d+/)?.[0]);
  };
  check('initial result count = catalog size', (await resultCount()) === EXPECT.all, EXPECT.all);

  await page.waitForTimeout(2500); // let lazy jackets + icons load
  const jackets = await imgStats(page, 'music/jacket');
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
  const unitIcons = await imgStats(page, 'sekai/units');
  check(
    'unit icons loaded',
    unitIcons.length >= 6 && unitIcons.every((i) => i.loaded),
    unitIcons.length
  );
  const charaIcons = await imgStats(page, 'sekai/chara');
  check(
    'vocalist icons loaded',
    charaIcons.length > 0 && charaIcons.every((i) => i.loaded),
    charaIcons.length
  );
  await shot('02-dialog', false);

  const chip = (name: RegExp) => dialog.getByRole('button', { name });
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

  const search = dialog.getByPlaceholder(/Search by title/);
  await search.fill('roki'); // EN name of ロキ (id 2)
  check(
    'EN-name search finds ROKI',
    (await dialog.getByRole('button', { name: /^Add ROKI$/ }).count()) === 1
  );
  await dialog.getByRole('button', { name: /^Add ROKI$/ }).click();
  await search.fill('Tell Your World');
  const tyw = dialog.getByRole('button', { name: /^Add Tell Your World$/ });
  await tyw.click();
  await tyw.click(); // duplicate on purpose ("Again")
  await search.fill('teo');
  await dialog.getByRole('button', { name: /^Add Teo$/ }).click();
  await search.fill('');
  await shot('03-dialog-used', false);
  if (label === 'phone') {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    check('no horizontal overflow with dialog open', overflow <= 0, overflow);
  }
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });

  const bagIds = await setlistIds(page);
  check(
    '4 songs in setlist incl. duplicate',
    bagIds.length === 4 && bagIds.filter((i) => i === '1').length === 2,
    bagIds
  );

  // --- ordered mode + reorder
  const orderToggle = page.getByRole('checkbox', { name: /Exact order/ });
  if (!(await orderToggle.isChecked())) {
    await orderToggle.click();
    await page.waitForTimeout(300);
  }
  const before = await setlistIds(page);
  const handle = page.locator('[data-drag-handle]').first();
  if (label === 'phone') {
    // Pointer drag (PointerSensor, 4px activation) — first row down to the second row.
    const a = await handle.boundingBox();
    const b = await page.locator('[data-drag-handle]').nth(1).boundingBox();
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
  await shot('04-ordered');

  // --- title, share link, round trip
  await page.getByPlaceholder(/Setlist title/).fill(`E2E ${label}`);
  await page.getByRole('button', { name: /Share link/ }).click();
  await page.waitForTimeout(300);
  const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''));
  const shared = clip || page.url();
  check('share link has #s= payload', /#s=/.test(shared), shared.slice(0, 80));

  const ctx2 = await browser.newContext({ ...opts, locale: 'en-US' });
  const p2 = await ctx2.newPage();
  await p2.goto(shared, { waitUntil: 'networkidle' });
  await p2.waitForTimeout(500);
  check(
    'round-trip title',
    (await p2.getByPlaceholder(/Setlist title/).inputValue()) === `E2E ${label}`
  );
  check(
    'round-trip songs + order',
    JSON.stringify(await setlistIds(p2)) === JSON.stringify(after),
    await setlistIds(p2)
  );
  await p2.screenshot({ path: `${OUT}/${label}-05-roundtrip.png`, fullPage: true });
  await ctx2.close();

  // --- save slots
  const slot = `slot-${label}`;
  await page.getByPlaceholder(/Slot name/).fill(slot);
  await page.getByRole('button', { name: /^Save$/ }).click();
  await page.getByRole('button', { name: /^New$/ }).click();
  await page.waitForTimeout(200);
  check('New clears setlist', (await setlistIds(page)).length === 0);
  await page.getByRole('button', { name: slot, exact: true }).click();
  await page.waitForTimeout(200);
  check(
    'slot restores title',
    (await page.getByPlaceholder(/Setlist title/).inputValue()) === `E2E ${label}`
  );
  check('slot restores songs', JSON.stringify(await setlistIds(page)) === JSON.stringify(after));
  await page.getByRole('button', { name: `Delete ${slot}` }).click();
  await page.waitForTimeout(200);
  check(
    'slot deleted',
    (await page.getByRole('button', { name: slot, exact: true }).count()) === 0
  );

  await shot('06-builder-final');

  // --- repository pages + attendance log
  const overflow = async (where: string) => {
    if (label !== 'phone') return;
    const px = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    check(`no horizontal page overflow (${where})`, px <= 0, px);
  };
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  if (label === 'phone') await page.getByRole('button', { name: 'Open Menu' }).click();
  for (const name of ['Lives', 'Songs', 'My Lives', 'Predict'])
    check(`nav has ${name}`, await page.getByRole('link', { name, exact: true }).first().isVisible());
  if (label === 'phone') await page.keyboard.press('Escape');
  await overflow('home');

  const liveId = 'project-sekai-colorful-live-3rd-evolve';
  await page.goto(`${BASE}/lives/${liveId}`, { waitUntil: 'networkidle' });
  const show = page.getByRole('group', { name: 'How you attended Tokyo Day 1 · Daytime' });
  await show.getByRole('button', { name: 'In person' }).click();
  await page.reload({ waitUntil: 'networkidle' });
  check(
    'attendance survives reload',
    (await show.getByRole('button', { name: 'In person' }).getAttribute('aria-pressed')) === 'true'
  );
  check('attended setlist marked', (await page.getByText('You were here').count()) === 1);
  await overflow('live page');
  await shot('07-live-page');

  const firstSong = page.locator('a[href*="/songs/"]').first();
  const songHref = await firstSong.getAttribute('href');
  await Promise.all([
    page.waitForURL((u) => u.pathname.includes('/songs/')),
    firstSong.click()
  ]);
  await page.waitForLoadState('networkidle');
  check(
    'setlist song links to its page',
    page.url().replace(/\/$/, '').endsWith(songHref?.replace(/\/$/, '') ?? '?'),
    page.url()
  );
  const heardNote = page.getByText(/You heard this live/);
  await heardNote.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  check('song page says you heard it', await heardNote.isVisible());
  const unitLink = page.locator('a[href*="/units/"]').first();
  await Promise.all([
    page.waitForURL((u) => u.pathname.includes('/units/')),
    unitLink.click()
  ]);
  await page.waitForLoadState('networkidle');
  const mostPerf = page.getByText('Most performed');
  await mostPerf.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  check('unit page loads', await mostPerf.isVisible(), page.url());
  await overflow('unit page');

  await page.goto(`${BASE}/me`, { waitUntil: 'networkidle' });
  const showsStat = page
    .locator('p', { hasText: /^Shows$/ })
    .first()
    .locator('xpath=following-sibling::*[1]');
  check('My Lives counts the show', (await showsStat.textContent()) === '1');
  await overflow('my lives');
  await shot('08-my-lives');
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
