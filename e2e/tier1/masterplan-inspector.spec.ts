import { test, expect } from '../fixtures';
import {
  assertNonBlankCanvas,
  assertZeroRawI18nKeys,
  comparePngVisualDiff,
  extractZoneId,
  getAppShellState,
  nextFrames,
  normalizeDigits,
  requireBoundingBox,
  selectZoneAndResolveLabel,
  waitForAppReady,
  waitForCameraSettled,
  waitForStage,
} from '../helpers';

test.describe('Tier 1 — Interactive 2D/3D Master Plan & Project Inspector (F-11..F-14)', () => {
  // ── F-11: Interactive Master Plan — 2D Architectural Blueprint View ──

  test('[T1-11.1][F-11] Opens Project Master Plan in default 2D architectural mode with complete control chrome', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=alexandria&project=sawary');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    const shell = page.locator('#app-shell');
    await expect(shell).toHaveAttribute('data-stage', 'project');
    await expect(shell).toHaveAttribute('data-masterplan-mode', '2d');

    for (const selector of [
      '#masterplan-controls',
      '#masterplan-mode-2d',
      '#masterplan-mode-3d',
      '#masterplan-reset-view-btn',
      '#masterplan-north-arrow',
      '#masterplan-scale-bar',
      '#masterplan-legend',
    ]) {
      await expect(page.locator(selector)).toBeVisible();
    }
  });

  test('[T1-11.2][F-11] Renders 5 to 8 clickable architectural land-use zones with localized labels', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=alexandria&project=sawary');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    const zoneButtons = page.locator('[id^="masterplan-zone-btn-"]');
    const count = await zoneButtons.count();
    expect(count).toBeGreaterThanOrEqual(5);
    expect(count).toBeLessThanOrEqual(8);

    for (let i = 0; i < count; i += 1) {
      const btn = zoneButtons.nth(i);
      await expect(btn).toBeVisible();
      const label = ((await btn.textContent()) ?? (await btn.getAttribute('aria-label')) ?? '').trim();
      expect(label.length).toBeGreaterThan(1);
    }
  });

  test('[T1-11.3][F-11] Displays localized metric Scale Bar and clickable rotating North Arrow compass', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=alexandria&project=sawary');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    const scaleBar = page.locator('#masterplan-scale-bar');
    const arText = normalizeDigits((await scaleBar.textContent()) ?? '');
    expect(arText).toMatch(/[1-9]\d*.*(م|كم)/);

    const northArrow = page.locator('#masterplan-north-arrow');
    await expect(northArrow).toBeVisible();
    await northArrow.click();
    await waitForCameraSettled(page);

    await page.locator('#lang-toggle-btn').click();
    await expect(page.locator('#app-shell')).toHaveAttribute('data-lang', 'en');
    const enText = normalizeDigits((await scaleBar.textContent()) ?? '');
    expect(enText).toMatch(/[1-9]\d*.*(m|km)/i);
  });

  test('[T1-11.4][F-11] Interactive Legend filters zones by land-use kind and toggles back cleanly', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=alexandria&project=sawary');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    const firstLegendItem = page.locator('[id^="masterplan-legend-item-"]').first();
    await expect(firstLegendItem).toBeVisible();

    await firstLegendItem.click();
    await nextFrames(page, 2);
    const pressedOn = await firstLegendItem.evaluate(
      (el) =>
        el.getAttribute('aria-pressed') === 'true' || el.getAttribute('data-active') === 'true',
    );
    expect(pressedOn).toBe(true);

    await firstLegendItem.click();
    await nextFrames(page, 2);
    const pressedOff = await firstLegendItem.evaluate(
      (el) =>
        el.getAttribute('aria-pressed') !== 'true' && el.getAttribute('data-active') !== 'true',
    );
    expect(pressedOff).toBe(true);
  });

  test('[T1-11.5][F-11] Reset View button restores Master Plan framing after user pan/zoom', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=alexandria&project=sawary&view=2d');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    const canvas = page.locator('#app-shell canvas:visible').first();
    const box = await requireBoundingBox(canvas, '2D Master Plan canvas');
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 120, cy - 80, { steps: 6 });
    await page.mouse.up();
    await page.mouse.wheel(0, -240);
    await nextFrames(page, 4);

    await page.locator('#masterplan-reset-view-btn').click();
    await waitForCameraSettled(page);

    const shell = page.locator('#app-shell');
    await expect(shell).toHaveAttribute('data-project', 'sawary');
    await expect(shell).toHaveAttribute('data-masterplan-mode', '2d');
    await expect(page.locator('[id^="masterplan-zone-btn-"]').first()).toBeVisible();
  });

  test('[T1-11.6][F-11] Live WebGL2 georeferenced 2D CAD blueprints render distinct visual plans across projects', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=alexandria&project=sawary&view=2d');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    const sawarySnap = await assertNonBlankCanvas(page, '#app-shell canvas:visible', {
      minWidth: 300,
      minHeight: 200,
      minUniqueColors: 4,
    });
    expect(await page.locator('[id^="masterplan-legend-item-"]').count()).toBeGreaterThanOrEqual(3);
    await assertZeroRawI18nKeys(page, '#masterplan-legend');

    await page.goto('/?stage=project&gov=alexandria&project=creeks-alex&view=2d');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    const creeksSnap = await assertNonBlankCanvas(page, '#app-shell canvas:visible', {
      minWidth: 300,
      minHeight: 200,
      minUniqueColors: 4,
    });
    const planDiff = comparePngVisualDiff(sawarySnap.png, creeksSnap.png);
    expect(
      planDiff,
      `Expected distinct georeferenced 2D CAD visuals between Sawary and CREEKS (diff=${planDiff.toFixed(4)})`,
    ).toBeGreaterThan(0.03);
  });

  // ── F-12: Interactive Master Plan — 3D Massing View Toggle ──

  test('[T1-12.1][F-12] Switching 2D -> 3D updates data-masterplan-mode, active toggle state, and URL view=3d', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=alexandria&project=sawary&view=2d');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    const btn3d = page.locator('#masterplan-mode-3d');
    await btn3d.click();
    await waitForCameraSettled(page);

    await expect(page.locator('#app-shell')).toHaveAttribute('data-masterplan-mode', '3d');
    const isPressed = await btn3d.evaluate(
      (el) =>
        el.getAttribute('aria-pressed') === 'true' || el.getAttribute('data-active') === 'true',
    );
    expect(isPressed).toBe(true);
    expect(new URL(page.url()).searchParams.get('view')).toBe('3d');
  });

  test('[T1-12.2][F-12] Switching 3D -> 2D returns cleanly to top-down blueprint mode with view=2d', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=alexandria&project=sawary&view=3d');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });
    await expect(page.locator('#app-shell')).toHaveAttribute('data-masterplan-mode', '3d');

    const btn2d = page.locator('#masterplan-mode-2d');
    await btn2d.click();
    await waitForCameraSettled(page);

    await expect(page.locator('#app-shell')).toHaveAttribute('data-masterplan-mode', '2d');
    const isPressed = await btn2d.evaluate(
      (el) =>
        el.getAttribute('aria-pressed') === 'true' || el.getAttribute('data-active') === 'true',
    );
    expect(isPressed).toBe(true);

    const viewParam = new URL(page.url()).searchParams.get('view');
    expect(viewParam === '2d' || viewParam === null).toBe(true);
    await assertNonBlankCanvas(page, '#app-shell canvas:visible', { minWidth: 200, minHeight: 150 });
  });

  test('[T1-12.3][F-12] Switching 2D -> 3D produces genuine 3D massing perspective diff while keeping controls and zones interactive', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=alexandria&project=sawary&view=2d');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    const snap2d = await assertNonBlankCanvas(page, '#app-shell canvas:visible', {
      minWidth: 300,
      minHeight: 200,
    });

    await page.locator('#masterplan-mode-3d').click();
    await waitForCameraSettled(page);
    await expect(page.locator('#app-shell')).toHaveAttribute('data-masterplan-mode', '3d');

    const snap3d = await assertNonBlankCanvas(page, '#app-shell canvas:visible', {
      minWidth: 300,
      minHeight: 200,
    });
    const tiltDiff = comparePngVisualDiff(snap2d.png, snap3d.png);
    expect(
      tiltDiff,
      `Expected visual diff > 0.03 between 2D plan and 3D extruded massing view (got ${tiltDiff.toFixed(4)})`,
    ).toBeGreaterThan(0.03);

    await expect(page.locator('#masterplan-controls')).toBeVisible();
    expect(await page.locator('[id^="masterplan-zone-btn-"]').count()).toBeGreaterThanOrEqual(5);
  });

  test('[T1-12.4][F-12] 3D massing view supports user orbit drag and compass north re-alignment cleanly', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=giza&project=zed-west&view=3d');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    const canvas = page.locator('#app-shell canvas:visible').first();
    const box = await requireBoundingBox(canvas, '3D Master Plan canvas');
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 150, cy, { steps: 6 });
    await page.mouse.up();
    await nextFrames(page, 4);

    await page.locator('#masterplan-north-arrow').click();
    await waitForCameraSettled(page);
    await expect(page.locator('#app-shell')).toHaveAttribute('data-project', 'zed-west');
    await expect(page.locator('#app-shell')).toHaveAttribute('data-masterplan-mode', '3d');

    await page.locator('#masterplan-reset-view-btn').click();
    await waitForCameraSettled(page);
    await expect(page.locator('#app-shell')).toHaveAttribute('data-masterplan-mode', '3d');
  });

  test('[T1-12.5][F-12] Sibling project switching from 3D view renders live 3D Master Plan and zones seamlessly', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=alexandria&project=san-stefano&view=3d');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });
    await expect(page.locator('#app-shell')).toHaveAttribute('data-masterplan-mode', '3d');

    await page.locator('#project-prev-btn').click();
    await waitForCameraSettled(page);

    const state = await getAppShellState(page);
    expect(state.stage).toBe('project');
    expect(state.governorate).toBe('alexandria');
    expect(state.project).not.toBe('san-stefano');

    if (state.masterplanMode !== '3d') {
      await page.locator('#masterplan-mode-3d').click();
      await waitForCameraSettled(page);
    }

    await expect(page.locator('#app-shell')).toHaveAttribute('data-masterplan-mode', '3d');
    await assertNonBlankCanvas(page, '#app-shell canvas:visible', { minWidth: 250, minHeight: 180 });
    expect(await page.locator('[id^="masterplan-zone-btn-"]').count()).toBeGreaterThanOrEqual(5);
  });

  // ── F-13: Interactive Architectural Zone Inspector ──

  test('[T1-13.1][F-13] Clicking any master plan zone updates data-parcel and reveals #masterplan-zone-panel', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=alexandria&project=sawary');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    const firstZone = page.locator('[id^="masterplan-zone-btn-"]').first();
    const zoneId = extractZoneId((await firstZone.getAttribute('id')) ?? '');
    await firstZone.click();

    await expect(page.locator('#app-shell')).toHaveAttribute('data-parcel', zoneId);
    const panel = page.locator('#masterplan-zone-panel');
    await expect(panel).toBeVisible();
    expect(((await panel.textContent()) ?? '').trim().length).toBeGreaterThan(15);
    await expect(page.locator('#masterplan-zone-inquire-btn')).toBeVisible();
  });

  test('[T1-13.2][F-13] Clicking a second zone switches data-parcel and refreshes Zone Inspector content', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=alexandria&project=sawary');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    const zones = page.locator('[id^="masterplan-zone-btn-"]');
    const firstId = extractZoneId((await zones.nth(0).getAttribute('id')) ?? '');
    const secondId = extractZoneId((await zones.nth(1).getAttribute('id')) ?? '');
    expect(secondId).not.toBe(firstId);

    await zones.nth(0).click();
    await expect(page.locator('#app-shell')).toHaveAttribute('data-parcel', firstId);
    const firstPanelText = ((await page.locator('#masterplan-zone-panel').textContent()) ?? '').trim();

    await zones.nth(1).click();
    await expect(page.locator('#app-shell')).toHaveAttribute('data-parcel', secondId);
    const secondPanelText = ((await page.locator('#masterplan-zone-panel').textContent()) ?? '').trim();
    expect(secondPanelText).not.toBe(firstPanelText);
  });

  test('[T1-13.3][F-13] Hovering zones does not hijack click selection and stepping back clears active parcel cleanly', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=red-sea&project=el-gouna');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    const zones = page.locator('[id^="masterplan-zone-btn-"]');
    expect(await zones.count()).toBeGreaterThanOrEqual(5);

    for (let i = 0; i < 3; i += 1) {
      await zones.nth(i).hover();
      await nextFrames(page, 2);
      await expect(page.locator('#app-shell')).toHaveAttribute('data-parcel', 'none');
      await expect(page.locator('#masterplan-zone-panel')).toBeHidden();
    }

    const { zoneId } = await selectZoneAndResolveLabel(page, 2);
    await expect(page.locator('#app-shell')).toHaveAttribute('data-parcel', zoneId);
    await expect(page.locator('#masterplan-zone-inquire-btn')).toBeEnabled();

    await page.locator('#project-back-btn').click();
    await waitForStage(page, 'governorate');

    const shell = page.locator('#app-shell');
    await expect(shell).toHaveAttribute('data-governorate', 'red-sea');
    await expect(shell).toHaveAttribute('data-project', 'none');
    await expect(shell).toHaveAttribute('data-parcel', 'none');
    await expect(page.locator('#masterplan-zone-panel')).toBeHidden();
  });

  test('[T1-13.4][F-13] Zone Inquiry CTA opens Consultation Modal prefilled with BOTH Project and Zone', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=alexandria&project=palm-hills-alex');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    const { zoneLabel, matchToken } = await selectZoneAndResolveLabel(page, 0);

    await page.locator('#masterplan-zone-inquire-btn').click();
    const modal = page.locator('#consult-modal');
    await expect(modal).toBeVisible();
    await expect(modal.locator('#consult-notes')).toBeVisible();

    const modalFullContext = await modal.evaluate((el) => {
      const notes = (el.querySelector('#consult-notes') as HTMLTextAreaElement | null)?.value ?? '';
      return `${el.textContent ?? ''} ${notes}`;
    });
    expect(modalFullContext).toMatch(/بالم هيلز|Palm Hills/i);
    expect(
      modalFullContext,
      `Expected Consultation Modal context to prefill selected zone "${zoneLabel}" (token "${matchToken}")`,
    ).toContain(matchToken);
  });

  test('[T1-13.5][F-13] Zone Inspector renders human-readable localized land-use copy in AR and EN', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=alexandria&project=creeks-alex');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    await page.locator('[id^="masterplan-zone-btn-"]').first().click();
    await expect(page.locator('#masterplan-zone-panel')).toBeVisible();
    await assertZeroRawI18nKeys(page, '#masterplan-zone-panel');

    await page.locator('#lang-toggle-btn').click();
    await expect(page.locator('#app-shell')).toHaveAttribute('data-lang', 'en');
    await expect(page.locator('#masterplan-zone-panel')).toBeVisible();
    await assertZeroRawI18nKeys(page, '#masterplan-zone-panel');
  });

  // ── F-14: Concise Conversion-First Project Summary Card ──

  test('[T1-14.1][F-14] Project Summary Card renders high-signal metadata with 1 to 4 concise highlights', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=alexandria&project=sawary');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    const inspector = page.locator('#project-inspector');
    await expect(inspector).toBeVisible();
    const text = normalizeDigits((await inspector.textContent()) ?? '');
    expect(text).toMatch(/صواري|Sawary/i);
    expect(text).toMatch(/السعودية المصرية|Saudi Egyptian/i);
    expect(text).toMatch(/417/);
    expect(text).toMatch(/%/);

    const highlights = inspector.locator('ul li, ol li');
    const highlightCount = await highlights.count();
    expect(
      highlightCount,
      'Project Summary Card must render between 1 and 4 highlights',
    ).toBeGreaterThanOrEqual(1);
    expect(highlightCount).toBeLessThanOrEqual(4);
    expect(((await highlights.first().textContent()) ?? '').trim().length).toBeGreaterThan(4);
  });

  test('[T1-14.2][F-14] Frames pricing as concise indicative guidance paired with Consultation & WhatsApp CTAs', async ({
    page,
  }) => {
    for (const projectId of ['sawary', 'san-stefano']) {
      await page.goto(`/?stage=project&gov=alexandria&project=${projectId}`);
      await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

      const inspector = page.locator('#project-inspector');
      await expect(inspector.locator('#consult-open-btn')).toBeVisible();
      await expect(inspector.locator('a[href*="wa.me"]').first()).toBeVisible();
      expect(await inspector.locator('table').count()).toBe(0);
    }
  });

  test('[T1-14.3][F-14] Prev/Next sibling buttons cycle between projects in the same governorate', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=alexandria&project=sawary');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    await page.locator('#project-next-btn').click();
    await waitForCameraSettled(page);
    const nextState = await getAppShellState(page);
    expect(nextState.stage).toBe('project');
    expect(nextState.governorate).toBe('alexandria');
    expect(nextState.project).not.toBe('sawary');

    await page.locator('#project-prev-btn').click();
    await waitForCameraSettled(page);
    await expect(page.locator('#app-shell')).toHaveAttribute('data-project', 'sawary');
  });

  test('[T1-14.4][F-14] Shortlist toggle inside Project Summary saves project to Shortlist Drawer', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=alexandria&project=alex-west');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    await page.locator('#shortlist-toggle-alex-west').click();
    await page.locator('#shortlist-open-btn').click();

    const drawer = page.locator('#shortlist-drawer');
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText(/أليكس ويست|Alex West/i);
  });

  test('[T1-14.5][F-14] Clicking #project-back-btn returns from Master Plan to parent Governorate Focus', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=cairo&project=il-bosco-nac');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    await page.locator('#project-back-btn').click();
    await waitForStage(page, 'governorate');

    const shell = page.locator('#app-shell');
    await expect(shell).toHaveAttribute('data-governorate', 'cairo');
    await expect(shell).toHaveAttribute('data-project', 'none');
    await expect(shell).toHaveAttribute('data-parcel', 'none');
    await expect(page.locator('#governorate-drawer')).toBeVisible();
    await expect(page.locator('#governorate-drawer [id^="project-card-"]')).toHaveCount(3);
  });
});
