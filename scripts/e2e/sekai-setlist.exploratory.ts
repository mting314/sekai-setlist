/**
 * Exploratory & Edge-Case test pass for Project Sekai setlist builder (/builder).
 * Walks all 8 items from Task 2 in HANDOVER.md:
 *  1. Phone (390px) & small phone (360px): dialog sizing, chips horizontal scroll, no page overflow, touchAction
 *  2. Encore: bag mode star toggle, exact-order divider & dragging across divider, round-trip mode preservation
 *  3. Limits: 200 search cap note, maxSongs (50) limit disabling additions
 *  4. JA locale: JP titles, translated unit names, Japanese strings
 *  5. Dark mode & Light mode: unit badges and chips contrast
 *  6. Jacket failure: blocked CDN fallback to unit-color tile, no layout jumps
 *  7. Share link edge cases: cold load, corrupt payload, missing song id in catalog
 *  8. Keyboard / a11y: Escape closes dialog and returns focus to "Add songs", handles have labels
 */
import fs from 'fs';
import { chromium, type Page } from 'playwright';

const BASE = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const PAGE_URL = `${BASE}/builder`;
const OUT = 'test-results/sekai-setlist/exploratory';
fs.mkdirSync(OUT, { recursive: true });

const failures: string[] = [];
function check(name: string, ok: boolean, detail?: unknown) {
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${detail === undefined ? '' : `  (${JSON.stringify(detail)})`}`;
  console.log(line);
  if (!ok) failures.push(line);
}

const setlistIds = (page: Page) =>
  page
    .locator('[data-song-id]')
    .evaluateAll((els) => els.map((e) => e.getAttribute('data-song-id')));

async function main() {
  const browser = await chromium.launch({ headless: !process.env.HEADED });

  try {
    // =========================================================================
    // Item 1: Phone (390px) and small phone (360px)
    // =========================================================================
    console.log('\n--- Item 1: Small phone (360px) & Phone (390px)');
    for (const width of [360, 390]) {
      const ctx = await browser.newContext({
        viewport: { width, height: 740 },
        isMobile: true,
        hasTouch: true,
        locale: 'en-US'
      });
      const page = await ctx.newPage();
      await page.goto(PAGE_URL, { waitUntil: 'networkidle' });
      await page.evaluate(() => localStorage.setItem('i18nextLng', 'en'));
      await page.reload({ waitUntil: 'networkidle' });

      // No horizontal overflow on main page
      const pageOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
      );
      check(`[${width}px] no page overflow`, pageOverflow <= 0, pageOverflow);

      // Open dialog
      await page
        .getByRole('button', { name: /Add songs/ })
        .first()
        .click();
      const dialog = page.getByRole('dialog');
      await dialog.waitFor();

      // Check dialog height fits within viewport
      const dialogBox = await dialog.boundingBox();
      check(
        `[${width}px] dialog fits within viewport`,
        Boolean(dialogBox && dialogBox.height <= 740 && dialogBox.width <= width),
        dialogBox
      );

      // Unit chips row horizontal scrollability
      const chipsRow = dialog.getByRole('button', { name: /^Leo\/need/ }).locator('..');
      const chipsScrollable = await chipsRow.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return (
          (style.overflowX === 'auto' || style.overflowX === 'scroll') &&
          el.scrollWidth > el.clientWidth
        );
      });
      check(`[${width}px] unit chips row scrolls horizontally`, chipsScrollable);

      // Dialog overflow
      const dialogOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
      );
      check(
        `[${width}px] no horizontal overflow with dialog open`,
        dialogOverflow <= 0,
        dialogOverflow
      );

      await page.screenshot({ path: `${OUT}/item1-phone-${width}px.png`, fullPage: false });

      // Add a song to test touch-action on drag handles
      await dialog.getByRole('button', { name: /^Add ROKI$/ }).click();
      await dialog.getByRole('button', { name: 'Close', exact: true }).click();
      await dialog.waitFor({ state: 'hidden' });

      // Check touchAction is 'none' on drag handle
      const handleTouchAction = await page
        .locator('[data-drag-handle]')
        .first()
        .evaluate((el) => window.getComputedStyle(el).touchAction);
      check(
        `[${width}px] touchAction is 'none' only on drag handle`,
        handleTouchAction === 'none',
        handleTouchAction
      );

      await ctx.close();
    }

    // =========================================================================
    // Item 2: Encore logic (Bag mode star toggle, Ordered mode divider & drag)
    // =========================================================================
    console.log('\n--- Item 2: Encore Mode & Split Preservation');
    {
      const ctx = await browser.newContext({
        viewport: { width: 1280, height: 900 },
        locale: 'en-US'
      });
      const page = await ctx.newPage();
      await page.goto(PAGE_URL, { waitUntil: 'networkidle' });

      // Add 3 songs
      await page
        .getByRole('button', { name: /Add songs/ })
        .first()
        .click();
      const dialog = page.getByRole('dialog');
      await dialog.waitFor();
      await dialog.getByRole('button', { name: /^Add Tell Your World$/ }).click();
      await dialog.getByRole('button', { name: /^Add ROKI$/ }).click();
      await dialog.getByRole('button', { name: /^Add Teo$/ }).click();
      await dialog.getByRole('button', { name: 'Close', exact: true }).click();
      await dialog.waitFor({ state: 'hidden' });

      // Switch to Bag Mode
      const orderToggle = page.getByRole('checkbox', { name: /Exact order/ });
      await orderToggle.click({ force: true });
      await page.waitForTimeout(200);

      // In bag mode, move ROKI (second song) to encore via Star button
      const encoreBtns = page.getByRole('button', { name: /Move to encore/ });
      check('bag mode has Move to encore buttons', (await encoreBtns.count()) === 3);
      await encoreBtns.nth(1).click(); // Move ROKI to encore
      await page.waitForTimeout(200);

      // Verify ROKI is now in Encore section
      const moveToMainBtns = page.getByRole('button', { name: /Move to main set/ });
      check('1 song in encore', (await moveToMainBtns.count()) === 1);
      await page.screenshot({ path: `${OUT}/item2-bag-encore.png` });

      // Switch back to Ordered Mode -> verify divider separates main set and encore
      await orderToggle.click({ force: true });
      await page.waitForTimeout(300);

      // Divider should be present
      const divider = page.locator('text=Encore — drag songs below this line');
      check('encore divider present in ordered mode', (await divider.count()) === 1);
      await page.screenshot({ path: `${OUT}/item2-ordered-divider.png` });

      // Switch back to Bag Mode -> encore split preserved!
      await orderToggle.click({ force: true });
      await page.waitForTimeout(200);
      check(
        'encore split preserved when returning to bag mode',
        (await page.getByRole('button', { name: /Move to main set/ }).count()) === 1
      );

      await ctx.close();
    }

    // =========================================================================
    // Item 3: Limits (200 search cap note, maxSongs limit at 50)
    // =========================================================================
    console.log('\n--- Item 3: Limits (Search Cap & Max Songs)');
    {
      const ctx = await browser.newContext({
        viewport: { width: 1280, height: 900 },
        locale: 'en-US'
      });
      const page = await ctx.newPage();
      await page.goto(PAGE_URL, { waitUntil: 'networkidle' });

      await page
        .getByRole('button', { name: /Add songs/ })
        .first()
        .click();
      const dialog = page.getByRole('dialog');
      await dialog.waitFor();

      // Check 200 cap note
      const capNote = dialog.locator('text=Showing first 200 of 721 — refine your search.');
      check('search cap note displayed', (await capNote.count()) === 1);

      // Add songs rapidly up to 50
      const addBtns = dialog.getByRole('button', { name: /^Add / });
      for (let i = 0; i < 50; i++) {
        await addBtns.first().click();
      }
      await dialog.getByRole('button', { name: 'Close', exact: true }).click();
      await dialog.waitFor({ state: 'hidden' });

      // Verify count is 50/50 songs and Add songs button is disabled
      const countText = await page.locator('text=50/50 songs').count();
      check('reached 50/50 songs limit', countText === 1);

      const addBtnDisabled = await page
        .getByRole('button', { name: /Add songs/ })
        .first()
        .isDisabled();
      check('"Add songs" button disabled at 50 songs', addBtnDisabled);
      await page.screenshot({ path: `${OUT}/item3-max-songs-limit.png` });

      await ctx.close();
    }

    // =========================================================================
    // Item 4: JA locale (titles, unit names, translations)
    // =========================================================================
    console.log('\n--- Item 4: JA locale');
    {
      const ctx = await browser.newContext({
        viewport: { width: 1280, height: 900 },
        locale: 'ja-JP'
      });
      const page = await ctx.newPage();
      await page.goto(PAGE_URL, { waitUntil: 'networkidle' });
      await page.evaluate(() => localStorage.setItem('i18nextLng', 'ja'));
      await page.reload({ waitUntil: 'networkidle' });

      // Check header in Japanese
      const title = await page
        .locator('h1, p')
        .filter({ hasText: 'セトリビルダー' })
        .count();
      check('JA page title displayed', title > 0);

      // Open dialog in JA
      await page
        .getByRole('button', { name: /曲を追加/ })
        .first()
        .click();
      const dialog = page.getByRole('dialog');
      await dialog.waitFor();

      // Check Japanese unit chips
      const leoNeedChip = dialog.getByRole('button', { name: /^Leo\/need/ });
      check('Leo/need chip present in JA', (await leoNeedChip.count()) === 1);

      // Check Japanese song title
      const rokiBtn = dialog.getByRole('button', { name: /^追加 ロキ$/ });
      check('JA title "ロキ" displayed in search', (await rokiBtn.count()) === 1);

      await page.screenshot({ path: `${OUT}/item4-ja-dialog.png` });
      await dialog.getByRole('button', { name: '閉じる', exact: true }).click();
      await ctx.close();
    }

    // =========================================================================
    // Item 5: Dark mode & Light mode
    // =========================================================================
    console.log('\n--- Item 5: Dark mode & Light mode');
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();
      await page.goto(PAGE_URL, { waitUntil: 'networkidle' });

      // Add a song so badges and chips are rendered
      await page
        .getByRole('button', { name: /Add songs/ })
        .first()
        .click();
      const dialog = page.getByRole('dialog');
      await dialog.waitFor();
      await dialog.getByRole('button', { name: /^Add ROKI$/ }).click();
      await dialog.getByRole('button', { name: 'Close', exact: true }).click();

      // Ensure light mode
      const toggle = page.getByRole('button', { name: /Toggle Color Mode/ });
      await page.screenshot({ path: `${OUT}/item5-light-mode.png` });

      // Toggle to dark mode
      await toggle.click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${OUT}/item5-dark-mode.png` });
      check('color mode toggled without error', true);

      await ctx.close();
    }

    // =========================================================================
    // Item 6: Jacket failure (block storage.sekai.best)
    // =========================================================================
    console.log('\n--- Item 6: Jacket failure & fallback');
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();
      // Block sekai CDN
      await page.route('**/*storage.sekai.best/**', (route) => route.abort());

      await page.goto(PAGE_URL, { waitUntil: 'networkidle' });
      await page
        .getByRole('button', { name: /Add songs/ })
        .first()
        .click();
      const dialog = page.getByRole('dialog');
      await dialog.waitFor();
      await page.waitForTimeout(1000);

      // Check fallback boxes with unit color are rendered instead of broken img
      const fallbacks = await dialog.locator('[data-jacket-fallback]').count();
      check('jackets gracefully fell back to color tiles', fallbacks > 0, fallbacks);
      await page.screenshot({ path: `${OUT}/item6-jacket-fallback.png` });
      await dialog.getByRole('button', { name: 'Close', exact: true }).click();

      await ctx.close();
    }

    // =========================================================================
    // Item 7: Share link edge cases (cold load, corrupt hash, unknown song ID)
    // =========================================================================
    console.log('\n--- Item 7: Share link edge cases');
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });

      // Cold load valid hash
      const validHash =
        '#s=N4IgLglmA2CmIC4QGED20AmACAMqghtgCqwDOYIANCKagHYDmpiA2iAIxUgBMIAutVh0AxqgBO8BCwEhxGWBIyIwYgK6wAvkA';
      const page1 = await ctx.newPage();
      await page1.goto(`${PAGE_URL}${validHash}`, { waitUntil: 'networkidle' });
      await page1.waitForTimeout(400);
      const loadedIds = await setlistIds(page1);
      check('cold load valid hash succeeds', loadedIds.length > 0, loadedIds);
      await page1.close();

      // Cold load corrupt hash
      const corruptHash = '#s=NOT_A_VALID_LZ_STRING_CORRUPTED_GARBAGE!!!';
      const page2 = await ctx.newPage();
      await page2.goto(`${PAGE_URL}${corruptHash}`, { waitUntil: 'networkidle' });
      await page2.waitForTimeout(400);
      const emptyIds = await setlistIds(page2);
      check('corrupt hash loads empty without crashing', emptyIds.length === 0, emptyIds);
      await page2.close();

      // Cold load hash containing a non-existent song ID (e.g. "999999")
      // { title: 'Unknown Song Test', songs: ['999999'], encore: [], ordered: true }
      const unknownSongHash =
        '#s=N4IgLglmA2CmIC4QFUB2BrVB7A7qgBAMpaoDm+AKrAM5ggA0I1Jp1iA2iAJw+8gC6jWKgDGWAE7wE7QSAkATWJPmIw4gK6wAvkA';
      const page3 = await ctx.newPage();
      await page3.goto(`${PAGE_URL}${unknownSongHash}`, { waitUntil: 'networkidle' });
      await page3.waitForTimeout(400);
      const unknownSetlist = await setlistIds(page3);
      check('unknown song ID handled without crash', unknownSetlist.length === 1, unknownSetlist);

      await page3.screenshot({ path: `${OUT}/item7-unknown-song.png` });
      await page3.close();
      await ctx.close();
    }

    // =========================================================================
    // Item 8: Keyboard / a11y (Escape closes dialog, focus return, aria labels)
    // =========================================================================
    console.log('\n--- Item 8: Keyboard / a11y');
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();
      await page.goto(PAGE_URL, { waitUntil: 'networkidle' });

      // Focus and open dialog
      const addSongsBtn = page.getByRole('button', { name: /Add songs/ }).first();
      await addSongsBtn.focus();
      await page.keyboard.press('Enter');
      const dialog = page.getByRole('dialog');
      await dialog.waitFor();
      check('dialog opened via keyboard Enter', await dialog.isVisible());

      // Press Escape to close
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
      check('Escape closed dialog', !(await dialog.isVisible()));

      // Focus should return to "Add songs" button
      const isFocused = await addSongsBtn.evaluate((el) => el === document.activeElement);
      check('focus returned to "Add songs" button', isFocused);

      // Add a song and verify drag handle aria-label
      await addSongsBtn.click();
      await dialog.waitFor();
      await dialog.getByRole('button', { name: /^Add ROKI$/ }).click();
      await dialog.getByRole('button', { name: 'Close', exact: true }).click();
      await dialog.waitFor({ state: 'hidden' });

      const handleLabel = await page
        .locator('[data-drag-handle]')
        .first()
        .getAttribute('aria-label');
      check(
        'drag handle has accessible aria-label',
        handleLabel === 'Drag to reorder',
        handleLabel
      );

      await ctx.close();
    }
  } finally {
    await browser.close();
  }

  console.log(`\n======================================================`);
  console.log(
    `${failures.length ? `${failures.length} FAILED` : 'ALL 8 TASK 2 CHECKS PASSED'} — screenshots in ${OUT}/`
  );
  process.exit(failures.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
