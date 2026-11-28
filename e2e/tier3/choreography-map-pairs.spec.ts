import { test, expect } from '../fixtures';
import {
  PROJECTS_BY_GOVERNORATE,
  countVisibleMapPins,
  driveScrollDive,
  enterOfflineAfterLocalBoot,
  extractZoneId,
  getAppShellState,
  isMapPinVisible,
  nextFrames,
  requireBoundingBox,
  selectDeveloperOption,
  waitForAppReady,
  waitForCameraSettled,
  waitForStage,
} from '../helpers';

test.describe('Tier 3 — Cross-Feature Pairwise: Choreography & Spatial Map (T3-01..T3-09)', () => {
  test('[T3-01][F-03 x F-19] Scroll-scrubbed dive updates spatial breadcrumb and URL ?stage=egypt while #breadcrumb-hero reverses progress to 0.00', async ({
    appPage,
  }) => {
    for (let i = 0; i < 20; i += 1) {
      const cur = await getAppShellState(appPage);
      if (cur.stage === 'egypt' && cur.scrollProgress >= 0.99) break;
      await driveScrollDive(appPage, 2, 260, { assertMoved: false });
    }

    await waitForStage(appPage, 'egypt');
    await expect(appPage.locator('#breadcrumb-egypt')).toBeVisible();
    expect(new URL(appPage.url()).searchParams.get('stage')).toBe('egypt');

    await appPage.locator('#breadcrumb-hero').click();
    await waitForStage(appPage, 'hero');
    await expect(appPage.locator('#app-shell')).toHaveAttribute('data-scroll-progress', '0.00');
  });

  test('[T3-02][F-04 x F-08] Deterministic #hero-explore-btn dive chained rapidly into #gov-card-alexandria settles cleanly in Alexandria focus', async ({
    appPage,
  }) => {
    await appPage.locator('#hero-explore-btn').click();
    await waitForStage(appPage, 'egypt');

    await appPage.locator('#gov-card-alexandria').click();
    await waitForStage(appPage, 'governorate');

    const shell = appPage.locator('#app-shell');
    await expect(shell).toHaveAttribute('data-governorate', 'alexandria');
    await expect(shell).toHaveAttribute('data-camera-moving', 'false');
    await expect(appPage.locator('#governorate-drawer [id^="project-card-"]')).toHaveCount(8);
  });

  test('[T3-03][F-05 x F-06] Combining Unit Category and Developer filters updates national map beacons across governorates and resets all 22 cleanly', async ({
    page,
  }) => {
    await page.goto('/?stage=egypt');
    await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });

    await page.locator('#filter-category-chalet').click();
    await selectDeveloperOption(page, /أوراسكوم|Orascom/i);
    await nextFrames(page, 2);

    const filteredCount = await countVisibleMapPins(page);
    expect(filteredCount).toBeGreaterThanOrEqual(1);
    expect(filteredCount).toBeLessThanOrEqual(2);
    await expect(page.locator('#map-pin-makadi-heights')).toBeVisible();
    expect(await isMapPinVisible(page, 'o-west')).toBe(false);

    await page.locator('#filter-reset-btn').click();
    await nextFrames(page, 2);
    expect(await countVisibleMapPins(page)).toBe(22);
  });

  test('[T3-04][F-06 x F-09] Active Dock filter coordinates cleanly when entering Alexandria Governorate Focus and updating drawer items', async ({
    page,
  }) => {
    await page.goto('/?stage=egypt');
    await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });

    await page.locator('#filter-status-ready_to_move').click();
    await nextFrames(page, 2);
    expect(await countVisibleMapPins(page)).toBe(4);

    await page.locator('#gov-card-alexandria').click();
    await waitForStage(page, 'governorate');

    const cards = page.locator('#governorate-drawer [id^="project-card-"]');
    await expect(cards).toHaveCount(3);
    for (const id of ['valore-smouha', 'antoniadis-alex', 'san-stefano']) {
      await expect(page.locator(`#project-card-${id}`)).toBeVisible();
    }
  });

  test('[T3-05][F-07 x F-10] Normalized Arabic search direct project selection executes Stage 5 fly-to with auto-resolved parent governorate breadcrumb', async ({
    page,
  }) => {
    await page.goto('/?stage=egypt');
    await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });

    await page.locator('#egypt-search-input').fill('صوارى');
    await page
      .locator('#egypt-search-results')
      .locator('button, [role="option"], a')
      .filter({ hasText: /صواري|Sawary/i })
      .first()
      .click();

    await waitForStage(page, 'project');
    const shell = page.locator('#app-shell');
    await expect(shell).toHaveAttribute('data-governorate', 'alexandria');
    await expect(shell).toHaveAttribute('data-project', 'sawary');
    await expect(page.locator('#breadcrumb-governorate')).toContainText(/الإسكندرية|Alexandria/i);
    await expect(page.locator('#breadcrumb-project')).toContainText(/صواري|Sawary/i);
  });

  test('[T3-06][F-08 x F-09] Rapid lateral governorate switching (Alexandria -> Red Sea -> Giza) atomically syncs map markers, drawer cards, and hover state', async ({
    page,
  }) => {
    await page.goto('/?stage=governorate&gov=alexandria');
    await waitForAppReady(page, { expectedStage: 'governorate', waitForMap: true });

    await page.locator('#gov-card-red-sea').click();
    await page.waitForTimeout(140);
    await page.locator('#gov-card-giza').click();

    await waitForStage(page, 'governorate');
    await expect(page.locator('#app-shell')).toHaveAttribute('data-governorate', 'giza');
    await expect(page.locator('#governorate-drawer [id^="project-card-"]')).toHaveCount(3);
    for (const id of PROJECTS_BY_GOVERNORATE.giza) {
      await expect(page.locator(`#project-card-${id}`)).toBeVisible();
      await expect(page.locator(`#map-pin-${id}`)).toBeVisible();
    }

    await page.locator('#project-card-zed-west').hover();
    await nextFrames(page, 2);
    await expect(page.locator('#map-pin-zed-west')).toBeVisible();
  });

  test('[T3-07][F-03 x F-09] Drawer vertical scroll stays isolated in Alexandria while returning to Egypt restores upward scroll-to-Hero reversal', async ({
    page,
  }) => {
    await page.goto('/?stage=governorate&gov=alexandria');
    await waitForAppReady(page, { expectedStage: 'governorate', waitForMap: true });

    const drawer = page.locator('#governorate-drawer');
    const drawerBox = await requireBoundingBox(drawer, '#governorate-drawer');
    await page.mouse.move(drawerBox.x + drawerBox.width / 2, drawerBox.y + drawerBox.height / 2);
    await page.mouse.wheel(0, 500);
    await nextFrames(page, 3);
    await page.mouse.wheel(0, -600);
    await nextFrames(page, 4);

    await expect(page.locator('#app-shell')).toHaveAttribute('data-stage', 'governorate');

    await page.locator('#breadcrumb-egypt').click();
    await waitForStage(page, 'egypt');

    for (let i = 0; i < 24; i += 1) {
      const cur = await getAppShellState(page);
      if (cur.stage === 'hero' && cur.scrollProgress <= 0.01) break;
      await driveScrollDive(page, 2, -260, { assertMoved: false });
    }
    await waitForStage(page, 'hero');
    await expect(page.locator('#app-shell')).toHaveAttribute('data-scroll-progress', '0.00');
  });

  test('[T3-08][F-01 x F-05] Full offline mode (setOffline true) maintains 3D Hero Maquette to offline-vector Egypt map transition with zero errors', async ({
    page,
    context,
  }) => {
    await enterOfflineAfterLocalBoot(page, context, '/', { expectedStage: 'hero' });
    try {
      await expect(page.locator('#app-shell')).toHaveAttribute('data-stage', 'hero');
      await page.locator('#hero-explore-btn').click();
      await waitForStage(page, 'egypt');

      const state = await getAppShellState(page);
      expect(['offline-vector', 'svg-fallback']).toContain(state.mapTiles);
      await expect(page.locator('#gov-card-alexandria')).toBeVisible();
    } finally {
      await context.setOffline(false);
    }
  });

  test.describe('T3-09 WebGL-blocked full chain', () => {
    test.use({ disableWebGL: true });

    test('[T3-09][F-01 x F-12] WebGL-blocked fallback seamlessly chains Hero SVG -> Egypt SVG -> Governorate -> 2D/3D axonometric SVG Master Plan', async ({
      appPage,
    }) => {
      const shell = appPage.locator('#app-shell');
      await expect(shell).toHaveAttribute('data-webgl-hero', 'fallback');

      await appPage.locator('#hero-explore-btn').click();
      await waitForStage(appPage, 'egypt');
      await expect(shell).toHaveAttribute('data-webgl-map', 'fallback');

      await appPage.locator('#gov-card-alexandria').click();
      await waitForStage(appPage, 'governorate');

      await appPage.locator('#project-card-sawary').click();
      await waitForStage(appPage, 'project');

      await appPage.locator('#masterplan-mode-3d').click();
      await waitForCameraSettled(appPage);
      await expect(shell).toHaveAttribute('data-masterplan-mode', '3d');

      const firstZone = appPage.locator('[id^="masterplan-zone-btn-"]').first();
      const zoneId = extractZoneId((await firstZone.getAttribute('id')) ?? '');
      await firstZone.click();
      await expect(shell).toHaveAttribute('data-parcel', zoneId);
      await expect(appPage.locator('#masterplan-zone-panel')).toBeVisible();
    });
  });
});
