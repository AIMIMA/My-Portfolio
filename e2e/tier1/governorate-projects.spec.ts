import { test, expect } from '../fixtures';
import {
  ALEXANDRIA_PROJECT_IDS,
  GOVERNORATE_COUNTS,
  PROJECTS_BY_GOVERNORATE,
  assertNonBlankCanvas,
  comparePngVisualDiff,
  getAppShellState,
  getShortlistBadgeCount,
  nextFrames,
  normalizeDigits,
  waitForAppReady,
  waitForStage,
} from '../helpers';
import type { GovernorateId } from '../helpers';

test.describe('Tier 1 — Governorate Focus, Projects Drawer & Project Flights (F-08..F-10)', () => {
  // ── F-08: Governorate Cinematic Fly-To & Spatial Focus ──

  test('[T1-08.1][F-08] Clicking #gov-card-alexandria executes cinematic fly-to and opens Alexandria focus', async ({
    page,
  }) => {
    await page.goto('/?stage=egypt');
    await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });

    await page.locator('#gov-card-alexandria').click();
    await waitForStage(page, 'governorate');

    const shell = page.locator('#app-shell');
    await expect(shell).toHaveAttribute('data-governorate', 'alexandria');
    await expect(shell).toHaveAttribute('data-camera-moving', 'false');
    await expect(page.locator('#breadcrumb-governorate')).toBeVisible();
    await expect(page.locator('#governorate-drawer')).toBeVisible();
  });

  test('[T1-08.2][F-08] Clicking map marker #gov-marker-cairo transitions equivalently into Cairo focus', async ({
    page,
  }) => {
    await page.goto('/?stage=egypt');
    await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });

    await page.locator('#gov-marker-cairo').click();
    await waitForStage(page, 'governorate');

    await expect(page.locator('#app-shell')).toHaveAttribute('data-governorate', 'cairo');
    for (const id of PROJECTS_BY_GOVERNORATE.cairo) {
      await expect(page.locator(`#project-card-${id}`)).toBeVisible();
    }
  });

  test('[T1-08.3][F-08] Lateral governorate switch transitions smoothly without snapping back to Egypt', async ({
    page,
  }) => {
    await page.goto('/?stage=governorate&gov=alexandria');
    await waitForAppReady(page, { expectedStage: 'governorate', waitForMap: true });

    await page.locator('#gov-card-red-sea').click();
    await waitForStage(page, 'governorate');

    await expect(page.locator('#app-shell')).toHaveAttribute('data-governorate', 'red-sea');
    await expect(page.locator('#app-shell')).toHaveAttribute('data-camera-moving', 'false');
    for (const id of PROJECTS_BY_GOVERNORATE['red-sea']) {
      await expect(page.locator(`#project-card-${id}`)).toBeVisible();
    }
  });

  test('[T1-08.4][F-08] Focusing Matrouh produces genuine bounding-box map zoom diff and reveals coastal project cards', async ({
    page,
  }) => {
    await page.goto('/?stage=egypt');
    const egyptState = await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });

    const mapSurface =
      egyptState.webglMap === 'fallback' ? '#app-shell svg:visible' : '#app-shell canvas:visible';
    const egyptSnap = await assertNonBlankCanvas(page, mapSurface, {
      minWidth: 300,
      minHeight: 200,
    });

    await page.locator('#gov-card-matrouh').click();
    await waitForStage(page, 'governorate');

    await expect(page.locator('#app-shell')).toHaveAttribute('data-governorate', 'matrouh');
    await expect(page.locator('#breadcrumb-governorate')).toContainText(/مطروح|Matrouh/i);
    for (const id of PROJECTS_BY_GOVERNORATE.matrouh) {
      await expect(page.locator(`#project-card-${id}`)).toBeVisible();
    }
    await expect(page.locator('#map-pin-marassi')).toBeVisible();

    const postState = await getAppShellState(page);
    const postSurface =
      postState.webglMap === 'fallback' ? '#app-shell svg:visible' : '#app-shell canvas:visible';
    const matrouhSnap = await assertNonBlankCanvas(page, postSurface, {
      minWidth: 300,
      minHeight: 200,
    });
    const zoomDiff = comparePngVisualDiff(egyptSnap.png, matrouhSnap.png);
    expect(
      zoomDiff,
      `Expected visual diff > 0.03 after zooming Egypt overview into Matrouh (got ${zoomDiff.toFixed(4)})`,
    ).toBeGreaterThan(0.03);
  });

  test('[T1-08.5][F-08] Clicking #breadcrumb-egypt exits Governorate Focus back to Egypt Overview', async ({
    page,
  }) => {
    await page.goto('/?stage=governorate&gov=giza');
    await waitForAppReady(page, { expectedStage: 'governorate', waitForMap: true });

    await page.locator('#breadcrumb-egypt').click();
    await waitForStage(page, 'egypt');

    const shell = page.locator('#app-shell');
    await expect(shell).toHaveAttribute('data-governorate', 'none');
    await expect(shell).toHaveAttribute('data-project', 'none');
    await expect(page.locator('#governorate-drawer')).toBeHidden();
  });

  // ── F-09: Governorate Projects Drawer & Bidirectional Map Sync ──

  test('[T1-09.1][F-09] Alexandria Drawer renders all 8 verified real Alexandria compounds', async ({
    page,
  }) => {
    await page.goto('/?stage=governorate&gov=alexandria');
    await waitForAppReady(page, { expectedStage: 'governorate', waitForMap: true });

    const drawer = page.locator('#governorate-drawer');
    await expect(drawer).toBeVisible();
    await expect(drawer.locator('[id^="project-card-"]')).toHaveCount(8);

    for (const projectId of ALEXANDRIA_PROJECT_IDS) {
      await expect(drawer.locator(`#project-card-${projectId}`)).toBeAttached();
    }
  });

  test('[T1-09.2][F-09] Project drawer cards show developer, feddans, delivery badge, and shortlist toggle', async ({
    page,
  }) => {
    await page.goto('/?stage=governorate&gov=alexandria');
    await waitForAppReady(page, { expectedStage: 'governorate', waitForMap: true });

    const sawaryCard = page.locator('#project-card-sawary');
    await expect(sawaryCard).toBeVisible();
    const sawaryText = normalizeDigits((await sawaryCard.textContent()) ?? '');
    expect(sawaryText).toMatch(/صواري|Sawary/i);
    expect(sawaryText).toMatch(/417/);
    await expect(page.locator('#shortlist-toggle-sawary')).toBeVisible();

    const sanStefanoCard = page.locator('#project-card-san-stefano');
    await sanStefanoCard.scrollIntoViewIfNeeded();
    await expect(sanStefanoCard).toBeVisible();
    const sanText = normalizeDigits((await sanStefanoCard.textContent()) ?? '');
    expect(sanText).toMatch(/سان ستيفانو|San Stefano/i);
    expect(sanText).toMatch(/17/);
    await expect(page.locator('#shortlist-toggle-san-stefano')).toBeVisible();
  });

  test('[T1-09.3][F-09] Bidirectional hover sync links drawer cards and map pins reciprocally', async ({
    page,
  }) => {
    await page.goto('/?stage=governorate&gov=alexandria');
    await waitForAppReady(page, { expectedStage: 'governorate', waitForMap: true });

    const sawaryPin = page.locator('#map-pin-sawary');
    const pinBefore = await sawaryPin.evaluate((el) => ({
      cls: el.className,
      hl: el.getAttribute('data-highlighted'),
      active: el.getAttribute('data-active'),
      transform: window.getComputedStyle(el).transform,
      zIndex: window.getComputedStyle(el).zIndex,
    }));

    await page.locator('#project-card-sawary').hover();
    await nextFrames(page, 3);

    const pinAfter = await sawaryPin.evaluate((el) => ({
      cls: el.className,
      hl: el.getAttribute('data-highlighted'),
      active: el.getAttribute('data-active'),
      transform: window.getComputedStyle(el).transform,
      zIndex: window.getComputedStyle(el).zIndex,
    }));

    const pinChanged =
      pinAfter.hl === 'true' ||
      pinAfter.active === 'true' ||
      pinAfter.cls !== pinBefore.cls ||
      pinAfter.transform !== pinBefore.transform ||
      pinAfter.zIndex !== pinBefore.zIndex;
    expect(pinChanged, 'Hovering #project-card-sawary should highlight #map-pin-sawary').toBe(true);

    const sanCard = page.locator('#project-card-san-stefano');
    const cardBefore = await sanCard.evaluate((el) => ({
      cls: el.className,
      hl: el.getAttribute('data-highlighted'),
      active: el.getAttribute('data-active'),
      borderColor: window.getComputedStyle(el).borderColor,
    }));

    await page.locator('#map-pin-san-stefano').hover();
    await nextFrames(page, 3);

    const cardAfter = await sanCard.evaluate((el) => ({
      cls: el.className,
      hl: el.getAttribute('data-highlighted'),
      active: el.getAttribute('data-active'),
      borderColor: window.getComputedStyle(el).borderColor,
    }));

    const cardChanged =
      cardAfter.hl === 'true' ||
      cardAfter.active === 'true' ||
      cardAfter.cls !== cardBefore.cls ||
      cardAfter.borderColor !== cardBefore.borderColor;
    expect(
      cardChanged,
      'Hovering #map-pin-san-stefano should highlight #project-card-san-stefano',
    ).toBe(true);
  });

  test('[T1-09.4][F-09] Clicking shortlist button inside project card stops propagation and keeps Governorate Focus', async ({
    page,
  }) => {
    await page.goto('/?stage=governorate&gov=alexandria');
    await waitForAppReady(page, { expectedStage: 'governorate', waitForMap: true });

    const beforeCount = await getShortlistBadgeCount(page);
    await page.locator('#shortlist-toggle-sawary').click();
    await nextFrames(page, 2);

    const shell = page.locator('#app-shell');
    await expect(shell).toHaveAttribute('data-stage', 'governorate');
    await expect(shell).toHaveAttribute('data-project', 'none');
    expect(await getShortlistBadgeCount(page)).toBe(beforeCount + 1);
  });

  test('[T1-09.5][F-09] Governorate Drawer updates heading, card count, and project list across all 6 governorates', async ({
    page,
  }) => {
    await page.goto('/?stage=governorate&gov=alexandria');
    await waitForAppReady(page, { expectedStage: 'governorate', waitForMap: true });

    const drawer = page.locator('#governorate-drawer');
    await expect(drawer).toBeVisible();
    await expect(drawer.locator('[id^="project-card-"]')).toHaveCount(8);

    const sequence: Array<{ govId: GovernorateId; labelRe: RegExp }> = [
      { govId: 'matrouh', labelRe: /مطروح|Matrouh/i },
      { govId: 'cairo', labelRe: /القاهرة|Cairo/i },
      { govId: 'giza', labelRe: /الجيزة|Giza/i },
      { govId: 'red-sea', labelRe: /البحر الأحمر|Red Sea/i },
      { govId: 'suez', labelRe: /السويس|السخنة|Suez|Sokhna/i },
    ];

    for (const step of sequence) {
      await page.locator(`#gov-card-${step.govId}`).click();
      await waitForStage(page, 'governorate');
      await expect(page.locator('#app-shell')).toHaveAttribute('data-governorate', step.govId);
      await expect(drawer).toBeVisible();
      await expect(drawer.locator('[id^="project-card-"]')).toHaveCount(
        GOVERNORATE_COUNTS[step.govId],
      );
      await expect(drawer).toContainText(step.labelRe);
    }

    await page.locator('#project-card-azha-sokhna').click();
    await waitForStage(page, 'project');
    await expect(page.locator('#app-shell')).toHaveAttribute('data-governorate', 'suez');
    await expect(page.locator('#app-shell')).toHaveAttribute('data-project', 'azha-sokhna');
  });

  // ── F-10: Project Cinematic Fly-To Transition ──

  test('[T1-10.1][F-10] Clicking #project-card-sawary flies into Project Master Plan stage', async ({
    page,
  }) => {
    await page.goto('/?stage=governorate&gov=alexandria');
    await waitForAppReady(page, { expectedStage: 'governorate', waitForMap: true });

    await page.locator('#project-card-sawary').click();
    await waitForStage(page, 'project');

    const shell = page.locator('#app-shell');
    await expect(shell).toHaveAttribute('data-project', 'sawary');
    await expect(shell).toHaveAttribute('data-camera-moving', 'false');
    await expect(page.locator('#project-inspector')).toBeVisible();
    await expect(page.locator('#masterplan-controls')).toBeVisible();
  });

  test('[T1-10.2][F-10] Clicking #map-pin-palm-hills-alex on the map triggers identical Project Fly-To', async ({
    page,
  }) => {
    await page.goto('/?stage=governorate&gov=alexandria');
    await waitForAppReady(page, { expectedStage: 'governorate', waitForMap: true });

    await page.locator('#map-pin-palm-hills-alex').click();
    await waitForStage(page, 'project');

    const shell = page.locator('#app-shell');
    await expect(shell).toHaveAttribute('data-governorate', 'alexandria');
    await expect(shell).toHaveAttribute('data-project', 'palm-hills-alex');
    await expect(page.locator('#breadcrumb-project')).toContainText(/بالم هيلز|Palm Hills/i);
  });

  test('[T1-10.3][F-10] Direct project jump from Egypt Overview auto-resolves parent governorate', async ({
    page,
  }) => {
    await page.goto('/?stage=egypt');
    await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });

    await page.locator('#map-pin-el-gouna').click();
    await waitForStage(page, 'project');

    const shell = page.locator('#app-shell');
    await expect(shell).toHaveAttribute('data-governorate', 'red-sea');
    await expect(shell).toHaveAttribute('data-project', 'el-gouna');
    await expect(page.locator('#breadcrumb-governorate')).toContainText(/البحر الأحمر|Red Sea/i);
  });

  test('[T1-10.4][F-10] Project Back button and Governorate breadcrumb both exit settled projects back to Alexandria cleanly', async ({
    page,
  }) => {
    await page.goto('/?stage=governorate&gov=alexandria');
    await waitForAppReady(page, { expectedStage: 'governorate', waitForMap: true });

    // 1. Enter creeks-alex and exit via #project-back-btn
    await page.locator('#project-card-creeks-alex').click();
    await waitForStage(page, 'project');
    await expect(page.locator('#app-shell')).toHaveAttribute('data-project', 'creeks-alex');

    await page.locator('#project-back-btn').click();
    await waitForStage(page, 'governorate');
    await expect(page.locator('#app-shell')).toHaveAttribute('data-governorate', 'alexandria');
    await expect(page.locator('#app-shell')).toHaveAttribute('data-project', 'none');

    // 2. Enter muruj-smouha and exit via #breadcrumb-governorate
    const murujCard = page.locator('#project-card-muruj-smouha');
    await murujCard.scrollIntoViewIfNeeded();
    await murujCard.click();
    await waitForStage(page, 'project');
    await expect(page.locator('#app-shell')).toHaveAttribute('data-project', 'muruj-smouha');

    await page.locator('#breadcrumb-governorate').click();
    await waitForStage(page, 'governorate');
    await expect(page.locator('#app-shell')).toHaveAttribute('data-governorate', 'alexandria');
    await expect(page.locator('#app-shell')).toHaveAttribute('data-project', 'none');
  });

  test('[T1-10.5][F-10] Project fly-to works identically across non-flagship governorates (Suez -> IL Monte Galala)', async ({
    page,
  }) => {
    await page.goto('/?stage=governorate&gov=suez');
    await waitForAppReady(page, { expectedStage: 'governorate', waitForMap: true });

    await page.locator('#project-card-il-monte-galala').click();
    await waitForStage(page, 'project');

    const shell = page.locator('#app-shell');
    await expect(shell).toHaveAttribute('data-governorate', 'suez');
    await expect(shell).toHaveAttribute('data-project', 'il-monte-galala');

    const inspectorText = normalizeDigits((await page.locator('#project-inspector').textContent()) ?? '');
    expect(inspectorText).toMatch(/تطوير مصر|Tatweer Misr/i);
    expect(inspectorText).toMatch(/533/);
  });
});
