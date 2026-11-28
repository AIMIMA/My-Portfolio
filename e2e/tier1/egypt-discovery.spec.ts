import { test, expect } from '../fixtures';
import {
  ALL_PROJECT_IDS,
  GOVERNORATE_COUNTS,
  GOVERNORATE_IDS,
  assertNonBlankCanvas,
  countVisibleMapPins,
  enterOfflineAfterLocalBoot,
  findNonActiveGovMarker,
  getAppShellState,
  isMapPinVisible,
  nextFrames,
  normalizeDigits,
  requireBoundingBox,
  selectDeveloperOption,
  waitForAppReady,
  waitForStage,
} from '../helpers';

test.describe('Tier 1 — Egypt National Discovery, Filters & Bilingual Search (F-05..F-07)', () => {
  // ── F-05: Egypt National Overview & 22 Real-Coordinate Beacons ──

  test('[T1-05.1][F-05] Boots Egypt National Overview in offline-vector mode with zero console errors when offline', async ({
    page,
    context,
  }) => {
    await enterOfflineAfterLocalBoot(page, context, '/', { expectedStage: 'hero' });
    try {
      await page.locator('#hero-explore-btn').click();
      await waitForStage(page, 'egypt');

      const state = await getAppShellState(page);
      expect(state.stage).toBe('egypt');
      expect(['offline-vector', 'svg-fallback']).toContain(state.mapTiles);

      const mapSurface =
        state.webglMap === 'fallback' ? '#app-shell svg:visible' : '#app-shell canvas:visible';
      await assertNonBlankCanvas(page, mapSurface, { minWidth: 200, minHeight: 150 });
    } finally {
      await context.setOffline(false);
    }
  });

  test('[T1-05.2][F-05] Displays all 6 active governorate cards/markers and real-coordinate project beacons on Egypt map', async ({
    page,
  }) => {
    await page.goto('/?stage=egypt');
    await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });

    for (const govId of GOVERNORATE_IDS) {
      await expect(page.locator(`#gov-card-${govId}`)).toBeVisible();
      await expect(page.locator(`#gov-marker-${govId}`)).toBeAttached();
    }

    const pinCount = await countVisibleMapPins(page);
    expect(pinCount).toBe(ALL_PROJECT_IDS.length);

    const coords = new Set<string>();
    for (const projectId of ALL_PROJECT_IDS) {
      const pin = page.locator(`#map-pin-${projectId}`);
      await expect(pin).toBeAttached();
      const box = await requireBoundingBox(pin, `#map-pin-${projectId}`);
      coords.add(`${Math.round(box.x)},${Math.round(box.y)}`);
    }
    expect(coords.size).toBeGreaterThanOrEqual(10);
  });

  test('[T1-05.3][F-05] Governorate cards display verified project counts (8, 3, 3, 3, 3, 2)', async ({
    page,
  }) => {
    await page.goto('/?stage=egypt');
    await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });

    for (const govId of GOVERNORATE_IDS) {
      const card = page.locator(`#gov-card-${govId}`);
      await expect(card).toBeVisible();
      const text = normalizeDigits((await card.textContent()) ?? '');
      const expectedCount = GOVERNORATE_COUNTS[govId];
      expect(
        text,
        `Expected #gov-card-${govId} ("${text}") to include count ${expectedCount}`,
      ).toMatch(new RegExp(`\\b${expectedCount}\\b`));
    }
  });

  test('[T1-05.4][F-05] Hovering and clicking a project beacon directly on Egypt Overview opens that project', async ({
    page,
  }) => {
    await page.goto('/?stage=egypt');
    await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });

    const pin = page.locator('#map-pin-sawary');
    await expect(pin).toBeVisible();
    await pin.hover();
    await nextFrames(page, 2);

    const accessibleHint = await pin.evaluate(
      (el) =>
        el.getAttribute('aria-label') ||
        el.getAttribute('title') ||
        (el.textContent ?? '').trim(),
    );
    expect(accessibleHint.length).toBeGreaterThan(0);

    await pin.click();
    await waitForStage(page, 'project');
    const shell = page.locator('#app-shell');
    await expect(shell).toHaveAttribute('data-governorate', 'alexandria');
    await expect(shell).toHaveAttribute('data-project', 'sawary');
  });

  test('[T1-05.5][F-05] Clicking a non-active contextual Egyptian governorate shows polite advisory toast without crashing', async ({
    page,
  }) => {
    await page.goto('/?stage=egypt');
    await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });

    const nonActiveMarker = await findNonActiveGovMarker(page);
    await nonActiveMarker.click();

    const toast = page.locator('#non-active-gov-toast');
    await expect(toast).toBeVisible();
    const toastText = ((await toast.textContent()) ?? '').trim();
    expect(toastText.length).toBeGreaterThan(5);

    const shell = page.locator('#app-shell');
    await expect(shell).toHaveAttribute('data-stage', 'egypt');
    await expect(shell).toHaveAttribute('data-governorate', 'none');
    await expect(page.locator('#governorate-drawer')).toBeHidden();
  });

  // ── F-06: Governorate & Filter Dock (Secondary Menu Reveal) ──

  test('[T1-06.1][F-06] Governorate & Filter Dock stays hidden on Hero and reveals cleanly in Egypt Overview', async ({
    appPage,
  }) => {
    await expect(appPage.locator('#egypt-search-input')).toBeHidden();

    await appPage.locator('#hero-explore-btn').click();
    await waitForStage(appPage, 'egypt');

    await expect(appPage.locator('#egypt-search-input')).toBeVisible();
    await expect(appPage.locator('#filter-category-apartment')).toBeVisible();
    await expect(appPage.locator('#filter-status-ready_to_move')).toBeVisible();
    await expect(appPage.locator('#filter-developer-select')).toBeVisible();
  });

  test('[T1-06.2][F-06] Unit Category filter chip narrows visible beacons accurately (chalet cohort)', async ({
    page,
  }) => {
    await page.goto('/?stage=egypt');
    await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });

    const chaletChip = page.locator('#filter-category-chalet');
    await chaletChip.click();
    await nextFrames(page, 2);

    const chaletCount = await countVisibleMapPins(page);
    expect(chaletCount).toBeGreaterThanOrEqual(4);
    expect(chaletCount).toBeLessThan(ALL_PROJECT_IDS.length);

    await expect(page.locator('#map-pin-marassi')).toBeVisible();
    await expect(page.locator('#map-pin-azha-sokhna')).toBeVisible();
    expect(await isMapPinVisible(page, 'antoniadis-alex')).toBe(false);
  });

  test('[T1-06.3][F-06] Delivery Status filter isolates exact verified cohorts (new_launch=1, ready_to_move=4)', async ({
    page,
  }) => {
    await page.goto('/?stage=egypt');
    await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });

    await page.locator('#filter-status-new_launch').click();
    await nextFrames(page, 2);
    expect(await countVisibleMapPins(page)).toBe(1);
    await expect(page.locator('#map-pin-creeks-alex')).toBeVisible();

    await page.locator('#filter-reset-btn').click();
    await nextFrames(page, 2);
    expect(await countVisibleMapPins(page)).toBe(22);

    await page.locator('#filter-status-ready_to_move').click();
    await nextFrames(page, 2);
    expect(await countVisibleMapPins(page)).toBe(4);
    for (const id of ['valore-smouha', 'antoniadis-alex', 'san-stefano', 'north-edge-alamein']) {
      await expect(page.locator(`#map-pin-${id}`)).toBeVisible();
    }
  });

  test('[T1-06.4][F-06] Developer dropdown filters accurately across governorates (Orascom=3, Palm Hills=2)', async ({
    page,
  }) => {
    await page.goto('/?stage=egypt');
    await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });

    await selectDeveloperOption(page, /أوراسكوم|Orascom/i);
    expect(await countVisibleMapPins(page)).toBe(3);
    for (const id of ['o-west', 'el-gouna', 'makadi-heights']) {
      await expect(page.locator(`#map-pin-${id}`)).toBeVisible();
    }

    await selectDeveloperOption(page, /بالم هيلز|Palm Hills/i);
    expect(await countVisibleMapPins(page)).toBe(2);
    for (const id of ['palm-hills-alex', 'hacienda-waters']) {
      await expect(page.locator(`#map-pin-${id}`)).toBeVisible();
    }
  });

  test('[T1-06.5][F-06] Combined valid category and status filters narrow live pin count and Reset restores all 22', async ({
    page,
  }) => {
    await page.goto('/?stage=egypt');
    await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });

    await page.locator('#filter-category-villa').click();
    await page.locator('#filter-status-ready_and_phased').click();
    await nextFrames(page, 2);

    const combinedCount = await countVisibleMapPins(page);
    expect(combinedCount).toBeGreaterThan(0);
    expect(combinedCount).toBeLessThan(22);

    const resetBtn = page.locator('#filter-reset-btn');
    await expect(resetBtn).toBeVisible();
    await expect(resetBtn).toBeEnabled();

    await resetBtn.click();
    await nextFrames(page, 2);
    expect(await countVisibleMapPins(page)).toBe(22);
  });

  test('[T1-06.6][F-06] Governorate selector chips place flagship Alexandria first followed by 5 corridors', async ({
    page,
  }) => {
    await page.goto('/?stage=egypt');
    await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });

    const cardIds = await page
      .locator('[id^="gov-card-"]')
      .evaluateAll((els) => els.map((el) => el.id));

    expect(cardIds).toHaveLength(6);
    expect(cardIds[0]).toBe('gov-card-alexandria');
    for (const govId of GOVERNORATE_IDS) {
      expect(cardIds).toContain(`gov-card-${govId}`);
    }
  });

  // ── F-07: Live Bilingual Search (AR & EN) ──

  test('[T1-07.1][F-07] Normalizes Arabic Hamza and Alef Maqsura variants identically', async ({
    page,
  }) => {
    await page.goto('/?stage=egypt');
    await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });

    const input = page.locator('#egypt-search-input');
    const results = page.locator('#egypt-search-results');

    await input.fill('اسكندرية');
    await expect(results).toBeVisible();
    const textWithoutHamza = ((await results.textContent()) ?? '').trim();

    await input.fill('إسكندرية');
    await expect(results).toBeVisible();
    const textWithHamza = ((await results.textContent()) ?? '').trim();
    expect(textWithoutHamza).toBe(textWithHamza);
    expect(textWithHamza).toMatch(/الإسكندرية|اسكندرية/i);

    await input.fill('صوارى');
    await expect(results).toBeVisible();
    await expect(results).toContainText('صواري');
  });

  test('[T1-07.2][F-07] English locale search matches project, developer, and district labels cleanly', async ({
    page,
  }) => {
    await page.goto('/?lang=en&stage=egypt');
    await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });
    await expect(page.locator('#app-shell')).toHaveAttribute('data-lang', 'en');

    const input = page.locator('#egypt-search-input');
    const results = page.locator('#egypt-search-results');

    await input.fill('Palm Hills');
    await expect(results).toBeVisible();
    await expect(results).toContainText(/Palm Hills/i);
    await expect(results).toContainText(/Hacienda/i);

    await input.fill('Smouha');
    await expect(results).toBeVisible();
    await expect(results).toContainText(/Muruj/i);
    await expect(results).toContainText(/Valore/i);
  });

  test('[T1-07.3][F-07] Selecting a project from search dropdown flies directly into Stage 5 Master Plan', async ({
    page,
  }) => {
    await page.goto('/?stage=egypt');
    await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });

    await page.locator('#egypt-search-input').fill('sawary');
    const results = page.locator('#egypt-search-results');
    await expect(results).toBeVisible();

    await results
      .locator('button, [role="option"], a')
      .filter({ hasText: /صواري|Sawary/i })
      .first()
      .click();

    await waitForStage(page, 'project');
    const shell = page.locator('#app-shell');
    await expect(shell).toHaveAttribute('data-governorate', 'alexandria');
    await expect(shell).toHaveAttribute('data-project', 'sawary');
    await expect(page.locator('#project-inspector')).toBeVisible();
  });

  test('[T1-07.4][F-07] Selecting a governorate from search dropdown flies directly into Stage 4 Governorate Focus', async ({
    page,
  }) => {
    await page.goto('/?stage=egypt');
    await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });

    await page.locator('#egypt-search-input').fill('مطروح');
    const results = page.locator('#egypt-search-results');
    await expect(results).toBeVisible();

    await results
      .locator('button, [role="option"], a')
      .filter({ hasText: /مطروح|Matrouh/i })
      .first()
      .click();

    await waitForStage(page, 'governorate');
    const shell = page.locator('#app-shell');
    await expect(shell).toHaveAttribute('data-governorate', 'matrouh');
    await expect(page.locator('#governorate-drawer')).toBeVisible();
    await expect(page.locator('#governorate-drawer [id^="project-card-"]')).toHaveCount(3);
  });

  test('[T1-07.5][F-07] Keyboard ArrowDown+Enter selects search match and Escape dismisses dropdown cleanly', async ({
    page,
  }) => {
    await page.goto('/?stage=egypt');
    await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });

    const input = page.locator('#egypt-search-input');
    const results = page.locator('#egypt-search-results');

    await input.click();
    await input.fill('zed');
    await expect(results).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(results).toBeHidden();
    await expect(page.locator('#app-shell')).toHaveAttribute('data-stage', 'egypt');

    await input.fill('marassi');
    await expect(results).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    await waitForStage(page, 'project');
    await expect(page.locator('#app-shell')).toHaveAttribute('data-project', 'marassi');
  });

  test('[T1-07.6][F-07] Unmatched search query displays localized no-results notice and consultation CTA', async ({
    page,
  }) => {
    await page.goto('/?stage=egypt');
    await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });

    const input = page.locator('#egypt-search-input');
    const results = page.locator('#egypt-search-results');

    await input.fill('zzzz-no-match-999');
    await expect(results).toBeVisible();
    const arText = ((await results.textContent()) ?? '').trim();
    expect(arText.length).toBeGreaterThan(4);

    await page.locator('#lang-toggle-btn').click();
    await expect(page.locator('#app-shell')).toHaveAttribute('data-lang', 'en');
    await input.fill('zzzz-no-match-999');
    await expect(results).toBeVisible();
    const enText = ((await results.textContent()) ?? '').trim();
    expect(enText).toMatch(/no|not found|result|match|consult/i);
  });
});
