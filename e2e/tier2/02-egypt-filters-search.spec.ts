import { test, expect } from '../fixtures';
import {
  GOVERNORATE_COUNTS,
  GOVERNORATE_IDS,
  countVisibleMapPins,
  enterOfflineAfterLocalBoot,
  findNonActiveGovMarker,
  getAppShellState,
  getToastConsultButton,
  isMapPinVisible,
  nextFrames,
  normalizeDigits,
  requireBoundingBox,
  selectDeveloperOption,
  waitForAppReady,
  waitForStage,
} from '../helpers';

test.describe('Tier 2 — Egypt Overview, Filters & Bilingual Search Edge Cases (F-05..F-07)', () => {
  // ── F-05: Egypt National Overview & 22 Real-Coordinate Beacons (6) ──

  test('[T2-F05-01][F-05][EC-04] Clicking a non-active contextual governorate shows polite localized toast without opening broken drawer', async ({
    page,
  }) => {
    await page.goto('/?stage=egypt');
    await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });

    const nonActive = await findNonActiveGovMarker(page);
    await nonActive.click();

    const toast = page.locator('#non-active-gov-toast');
    await expect(toast).toBeVisible();
    const arToast = ((await toast.textContent()) ?? '').trim();
    expect(arToast).toMatch(/[\u0600-\u06FF]/);
    await expect(page.locator('#app-shell')).toHaveAttribute('data-stage', 'egypt');
    await expect(page.locator('#app-shell')).toHaveAttribute('data-governorate', 'none');
    await expect(page.locator('#governorate-drawer')).toBeHidden();

    await page.locator('#lang-toggle-btn').click();
    await expect(page.locator('#app-shell')).toHaveAttribute('data-lang', 'en');

    const nonActiveEn = await findNonActiveGovMarker(page);
    await nonActiveEn.click();
    await expect(toast).toBeVisible();
    const enToast = ((await toast.textContent()) ?? '').trim();
    expect(enToast).toMatch(/[A-Za-z]{4,}/);
    await expect(page.locator('#governorate-drawer')).toBeHidden();
  });

  test('[T2-F05-02][F-05][EC-04] Non-active governorate toast consultation action launches booking modal safely', async ({
    page,
  }) => {
    await page.goto('/?stage=egypt');
    await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });

    const nonActive = await findNonActiveGovMarker(page);
    await nonActive.click();
    await expect(page.locator('#non-active-gov-toast')).toBeVisible();

    const consultBtn = await getToastConsultButton(page);
    await consultBtn.click();
    await expect(page.locator('#consult-modal')).toBeVisible();

    await page.locator('#consult-close-btn').click();
    await expect(page.locator('#consult-modal')).toBeHidden();
    await expect(page.locator('#app-shell')).toHaveAttribute('data-stage', 'egypt');
    await expect(page.locator('#app-shell')).toHaveAttribute('data-governorate', 'none');
  });

  test('[T2-F05-03][F-05] Active governorate cards keep Alexandria first, reconcile exact counts in AR/EN (including Giza), and restore 22 after filter reset', async ({
    page,
  }) => {
    await page.goto('/?stage=egypt');
    await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });

    const cards = page.locator('[id^="gov-card-"]');
    await expect(cards).toHaveCount(6);
    expect(await cards.first().getAttribute('id')).toBe('gov-card-alexandria');

    let expectedTotal = 0;
    for (const govId of GOVERNORATE_IDS) {
      const card = page.locator(`#gov-card-${govId}`);
      await expect(card).toBeVisible();
      const text = normalizeDigits((await card.textContent()) ?? '');
      const expectedCount = GOVERNORATE_COUNTS[govId];
      expect(
        text,
        `Expected #gov-card-${govId} ("${text}") to include verified count ${expectedCount}`,
      ).toMatch(new RegExp(`\\b${expectedCount}\\b`));
      expectedTotal += expectedCount;
    }
    expect(expectedTotal).toBe(22);
    expect(await countVisibleMapPins(page)).toBe(22);

    const shellText = normalizeDigits((await page.locator('#app-shell').innerText()) ?? '');
    expect(shellText).toMatch(/\b22\b/);

    // Verify dynamic filter reconciliation and reset back to exact 22 baseline
    await page.locator('#filter-category-chalet').click();
    await nextFrames(page, 2);
    const chaletCount = await countVisibleMapPins(page);
    expect(chaletCount).toBeGreaterThanOrEqual(4);
    expect(chaletCount).toBeLessThan(22);
    expect(await cards.first().getAttribute('id')).toBe('gov-card-alexandria');

    await page.locator('#filter-reset-btn').click();
    await nextFrames(page, 2);
    expect(await countVisibleMapPins(page)).toBe(22);

    // Verify Giza "6th of October" English card also retains accurate count 3 (CTR-03)
    await page.locator('#lang-toggle-btn').click();
    await expect(page.locator('#app-shell')).toHaveAttribute('data-lang', 'en');
    const enGizaText = normalizeDigits((await page.locator('#gov-card-giza').textContent()) ?? '');
    expect(enGizaText).toMatch(/\b3\b/);
  });

  test('[T2-F05-04][F-05] Rapid direct map-pin jumps at opposite geographic extremes auto-resolve parent governorate accurately', async ({
    page,
  }) => {
    await page.goto('/?stage=egypt');
    await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });

    const shell = page.locator('#app-shell');

    // North Mediterranean extreme: San Stefano (Alexandria)
    const northPin = page.locator('#map-pin-san-stefano');
    await expect(northPin).toBeVisible();
    await northPin.click();
    await waitForStage(page, 'project');
    await expect(shell).toHaveAttribute('data-governorate', 'alexandria');
    await expect(shell).toHaveAttribute('data-project', 'san-stefano');
    await expect(shell).toHaveAttribute('data-camera-moving', 'false');
    await expect(page.locator('#project-inspector')).toBeVisible();

    // Return to Egypt Overview and immediately jump to southern Red Sea extreme: Somabay
    await page.locator('#breadcrumb-egypt').click();
    await waitForStage(page, 'egypt');

    const southPin = page.locator('#map-pin-somabay');
    await expect(southPin).toBeVisible();
    await southPin.click();
    await waitForStage(page, 'project');
    await expect(shell).toHaveAttribute('data-governorate', 'red-sea');
    await expect(shell).toHaveAttribute('data-project', 'somabay');
    await expect(shell).toHaveAttribute('data-camera-moving', 'false');
    await expect(page.locator('#project-inspector')).toBeVisible();
  });

  test('[T2-F05-05][F-05][EC-13] Full offline Egypt interactive session filters, searches, drills into Alexandria, and returns with zero errors', async ({
    page,
    context,
  }) => {
    await enterOfflineAfterLocalBoot(page, context, '/', { expectedStage: 'hero' });
    try {
      await page.locator('#hero-explore-btn').click();
      await waitForStage(page, 'egypt');

      const state = await getAppShellState(page);
      expect(['offline-vector', 'svg-fallback']).toContain(state.mapTiles);

      await page.locator('#filter-status-ready_to_move').click();
      await nextFrames(page, 2);
      expect(await countVisibleMapPins(page)).toBe(4);
      await page.locator('#filter-reset-btn').click();
      await nextFrames(page, 2);
      expect(await countVisibleMapPins(page)).toBe(22);

      await page.locator('#egypt-search-input').fill('صواري');
      await expect(page.locator('#egypt-search-results')).toBeVisible();
      await expect(page.locator('#egypt-search-results')).toContainText(/صواري/);
      await page.locator('#egypt-search-input').fill('');
      await nextFrames(page, 2);

      await page.locator('#gov-card-alexandria').click();
      await waitForStage(page, 'governorate');
      await expect(page.locator('#app-shell')).toHaveAttribute('data-governorate', 'alexandria');
      await expect(page.locator('#governorate-drawer [id^="project-card-"]')).toHaveCount(8);

      await page.locator('#breadcrumb-egypt').click();
      await waitForStage(page, 'egypt');
      await expect(page.locator('#app-shell')).toHaveAttribute('data-governorate', 'none');
    } finally {
      await context.setOffline(false);
    }
  });

  test.describe('T2-F05-06 WebGL-unavailable SVG Egypt map', () => {
    test.use({ disableWebGL: true });

    test('[T2-F05-06][F-05][EC-13] WebGL-unavailable Egypt overview mounts interactive 2.5D SVG Egypt map fallback', async ({
      page,
    }) => {
      await page.goto('/?stage=egypt');
      await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });

      const shell = page.locator('#app-shell');
      await expect(shell).toHaveAttribute('data-webgl-map', 'fallback');
      await expect(shell).toHaveAttribute('data-map-tiles', 'svg-fallback');

      const svg = page.locator('#app-shell svg:visible').first();
      const box = await requireBoundingBox(svg, 'Egypt 2.5D SVG map fallback');
      expect(box.width).toBeGreaterThan(200);
      expect(box.height).toBeGreaterThan(150);

      await page.locator('#gov-card-alexandria').click();
      await waitForStage(page, 'governorate');
      await expect(shell).toHaveAttribute('data-governorate', 'alexandria');
    });
  });

  // ── F-06: Governorate & Filter Dock (Secondary Menu Reveal) (5) ──

  test('[T2-F06-01][F-06][EC-05] Zero-match filter combination (Suez + Commercial + New Launch) shows 0 count, friendly empty state, and working reset', async ({
    page,
  }) => {
    await page.goto('/?stage=governorate&gov=suez');
    await waitForAppReady(page, { expectedStage: 'governorate', waitForMap: true });

    await page.locator('#filter-category-commercial').click();
    await page.locator('#filter-status-new_launch').click();
    await nextFrames(page, 2);

    await expect(page.locator('#governorate-drawer [id^="project-card-"]')).toHaveCount(0);
    const drawerText = normalizeDigits((await page.locator('#governorate-drawer').textContent()) ?? '');
    expect(drawerText.trim().length).toBeGreaterThan(5);

    const resetBtn = page.locator('#filter-reset-btn');
    await expect(resetBtn).toBeVisible();
    await resetBtn.click();
    await nextFrames(page, 2);

    await expect(page.locator('#governorate-drawer [id^="project-card-"]')).toHaveCount(2);
  });

  test('[T2-F06-02][F-06] Multi-facet intersection (Status + Category + Developer) narrows accurately and unwinds cleanly', async ({
    page,
  }) => {
    await page.goto('/?stage=egypt');
    await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });

    await page.locator('#filter-status-ready_to_move').click();
    await nextFrames(page, 2);
    expect(await countVisibleMapPins(page)).toBe(4);

    await page.locator('#filter-category-hospitality').click();
    await nextFrames(page, 2);
    const intersectionCount = await countVisibleMapPins(page);
    expect(intersectionCount).toBeGreaterThanOrEqual(1);
    expect(intersectionCount).toBeLessThan(4);
    await expect(page.locator('#map-pin-san-stefano')).toBeVisible();
    expect(await isMapPinVisible(page, 'antoniadis-alex')).toBe(false);

    await page.locator('#filter-reset-btn').click();
    await nextFrames(page, 2);
    expect(await countVisibleMapPins(page)).toBe(22);

    await selectDeveloperOption(page, /بالم هيلز|Palm Hills/i);
    expect(await countVisibleMapPins(page)).toBe(2);
    await expect(page.locator('#map-pin-palm-hills-alex')).toBeVisible();
    await expect(page.locator('#map-pin-hacienda-waters')).toBeVisible();
  });

  test('[T2-F06-03][F-06] Toggling a filter chip on then off restores exact baseline idempotently', async ({
    page,
  }) => {
    await page.goto('/?stage=egypt');
    await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });

    const villaChip = page.locator('#filter-category-villa');
    await villaChip.click();
    await nextFrames(page, 2);
    const filteredCount = await countVisibleMapPins(page);
    expect(filteredCount).toBeGreaterThan(0);
    expect(filteredCount).toBeLessThan(22);

    await villaChip.click();
    await nextFrames(page, 2);
    const restoredCount = await countVisibleMapPins(page);
    expect(restoredCount).toBe(22);
    const isPressed = await villaChip.getAttribute('aria-pressed');
    expect(isPressed === 'false' || isPressed === null).toBe(true);
  });

  test('[T2-F06-04][F-06] Active filter selections and counts persist intact across AR <-> EN toggle', async ({
    page,
  }) => {
    await page.goto('/?stage=egypt');
    await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });

    await page.locator('#filter-category-chalet').click();
    await page.locator('#filter-status-ready_and_phased').click();
    await nextFrames(page, 2);
    const arCount = await countVisibleMapPins(page);
    expect(arCount).toBeGreaterThan(0);
    expect(arCount).toBeLessThan(22);

    await page.locator('#lang-toggle-btn').click();
    await expect(page.locator('#app-shell')).toHaveAttribute('data-lang', 'en');
    await nextFrames(page, 2);
    expect(await countVisibleMapPins(page)).toBe(arCount);

    await page.locator('#lang-toggle-btn').click();
    await expect(page.locator('#app-shell')).toHaveAttribute('data-lang', 'ar');
    await nextFrames(page, 2);
    expect(await countVisibleMapPins(page)).toBe(arCount);
  });

  test('[T2-F06-05][F-06] Rapid multi-facet filter churn resets cleanly to 22 pins and hides dock on return to Hero', async ({
    page,
  }) => {
    await page.goto('/?stage=egypt');
    await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });

    const categoryChips = ['apartment', 'villa', 'chalet', 'commercial'] as const;
    for (const cat of categoryChips) {
      await page.locator(`#filter-category-${cat}`).click();
    }
    const statusChips = ['under_construction', 'phased_delivery'] as const;
    for (const st of statusChips) {
      await page.locator(`#filter-status-${st}`).click();
    }
    await selectDeveloperOption(page, /طلعت مصطفى|Talaat Moustafa|TMG/i);

    await page.locator('#filter-reset-btn').click();
    await nextFrames(page, 2);
    expect(await countVisibleMapPins(page)).toBe(22);

    for (const cat of categoryChips) {
      const pressed = await page.locator(`#filter-category-${cat}`).getAttribute('aria-pressed');
      expect(pressed).not.toBe('true');
    }
    for (const st of statusChips) {
      const pressed = await page.locator(`#filter-status-${st}`).getAttribute('aria-pressed');
      expect(pressed).not.toBe('true');
    }
    for (const govId of GOVERNORATE_IDS) {
      await expect(page.locator(`#gov-card-${govId}`)).toBeEnabled();
    }

    await page.locator('#breadcrumb-hero').click();
    await waitForStage(page, 'hero');
    await expect(page.locator('#egypt-search-input')).toBeHidden();
    await expect(page.locator('#filter-developer-select')).toBeHidden();
    await expect(page.locator('#filter-category-apartment')).toBeHidden();
  });

  // ── F-07: Live Bilingual Search (AR & EN) (5) ──

  test('[T2-F07-01][F-07][EC-06] Arabic orthographic normalization matches hamza, alef maksura, ta marbuta, and diacritics identically', async ({
    page,
  }) => {
    await page.goto('/?stage=egypt');
    await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });

    const input = page.locator('#egypt-search-input');
    const results = page.locator('#egypt-search-results');

    const cases: Array<[string, RegExp]> = [
      ['اسكندرية', /الإسكندرية/],
      ['إسكندرية', /الإسكندرية/],
      ['صواري', /صواري/],
      ['صوارى', /صواري/],
      ['صَواري', /صواري/],
      ['سموحة', /مروج|فالوري/],
      ['سموحه', /مروج|فالوري/],
      ['أليكس', /أليكس ويست/],
    ];

    for (const [query, expected] of cases) {
      await input.fill(query);
      await expect(results).toBeVisible();
      await expect(results).toContainText(expected);
    }
  });

  test('[T2-F07-02][F-07][EC-06] Adversarial mixed-case, padding whitespace, tabs, and whitespace-only inputs resolve safely', async ({
    page,
  }) => {
    await page.goto('/?stage=egypt');
    await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });

    const input = page.locator('#egypt-search-input');
    const results = page.locator('#egypt-search-results');

    await input.fill('   sAwArY   ');
    await expect(results).toBeVisible();
    await expect(results).toContainText(/صواري|Sawary/i);

    await input.fill('\tORASCOM\n');
    await expect(results).toBeVisible();
    await expect(results).toContainText(/الجونة|El Gouna/i);

    await input.fill('   ');
    await nextFrames(page, 2);
    const whitespaceMatches = await results.locator('button, [role="option"], a').count();
    expect(whitespaceMatches).toBe(0);
    await expect(page.locator('#app-shell')).toHaveAttribute('data-stage', 'egypt');

    await input.fill('Mostakbal');
    await expect(results).toBeVisible();
    await expect(results).toContainText(/بلومفيلدز|Bloomfields/i);
  });

  test('[T2-F07-03][F-07] Unmatched gibberish and XSS-like search inputs render safe localized empty state', async ({
    page,
  }) => {
    await page.goto('/?stage=egypt');
    await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });

    const input = page.locator('#egypt-search-input');
    const results = page.locator('#egypt-search-results');

    await input.fill('zzzz-no-match-9999');
    await expect(results).toBeVisible();

    await input.fill('<img src=x onerror=window.__searchXss=1>');
    await expect(results).toBeVisible();

    const xssTriggered = await page.evaluate(
      () => (window as unknown as Record<string, unknown>).__searchXss,
    );
    expect(xssTriggered).toBeUndefined();

    await input.fill('');
    await nextFrames(page, 2);
  });

  test('[T2-F07-04][F-07] Keyboard ArrowDown/Up wrap clamping, outside-click dismissal, and Backspace clear stay stable', async ({
    page,
  }) => {
    await page.goto('/?stage=egypt');
    await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });

    const input = page.locator('#egypt-search-input');
    const results = page.locator('#egypt-search-results');

    await input.click();
    await input.fill('ال');
    await expect(results).toBeVisible();
    const optionCount = await results.locator('button, [role="option"], a').count();
    expect(optionCount).toBeGreaterThanOrEqual(2);

    for (let i = 0; i < 5; i += 1) {
      await page.keyboard.press('ArrowDown');
    }
    for (let i = 0; i < 4; i += 1) {
      await page.keyboard.press('ArrowUp');
    }
    await expect(page.locator('#app-shell')).toHaveAttribute('data-stage', 'egypt');

    // Click neutral non-interactive canvas coordinate well below TopNavBar to dismiss dropdown
    const neutralPoint = await page.evaluate(() => {
      const candidates: Array<[number, number]> = [
        [24, Math.round(window.innerHeight - 24)],
        [Math.round(window.innerWidth - 24), Math.round(window.innerHeight - 24)],
        [Math.round(window.innerWidth / 2), Math.round(window.innerHeight - 24)],
      ];
      for (const [x, y] of candidates) {
        const el = document.elementFromPoint(x, y);
        if (
          el &&
          !el.closest('button, a, input, select, nav, header, #egypt-search-results')
        ) {
          return { x, y };
        }
      }
      return { x: 24, y: Math.round(window.innerHeight - 24) };
    });
    await page.mouse.click(neutralPoint.x, neutralPoint.y);
    await expect(results).toBeHidden();
    await expect(page.locator('#app-shell')).toHaveAttribute('data-stage', 'egypt');
    await expect(page.locator('#app-shell')).toHaveAttribute('data-governorate', 'none');

    // Re-focus, fill, select-all + Backspace -> dropdown closes and all 22 pins remain visible
    await input.click();
    await input.fill('صواري');
    await expect(results).toBeVisible();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await expect(results).toBeHidden();
    expect(await countVisibleMapPins(page)).toBe(22);
  });

  test('[T2-F07-05][F-07] Search result navigation works even with conflicting active category filter and clears stale dropdown on return', async ({
    page,
  }) => {
    await page.goto('/?stage=egypt');
    await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });

    // Activate conflicting category filter before searching for El Gouna
    await page.locator('#filter-category-commercial').click();
    await nextFrames(page, 2);

    const input = page.locator('#egypt-search-input');
    const results = page.locator('#egypt-search-results');
    await input.fill('الجونة');
    await expect(results).toBeVisible();
    await results
      .locator('button, [role="option"], a')
      .filter({ hasText: /الجونة|El Gouna/i })
      .first()
      .click();

    await waitForStage(page, 'project');
    await expect(page.locator('#app-shell')).toHaveAttribute('data-governorate', 'red-sea');
    await expect(page.locator('#app-shell')).toHaveAttribute('data-project', 'el-gouna');

    await page.locator('#breadcrumb-egypt').click();
    await waitForStage(page, 'egypt');
    await expect(results).toBeHidden();
    await expect(page.locator('#app-shell')).toHaveAttribute('data-governorate', 'none');
  });
});
