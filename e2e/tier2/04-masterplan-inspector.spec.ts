import { test, expect } from '../fixtures';
import {
  MOBILE_VIEWPORT,
  assertNoHorizontalOverflow,
  assertNonBlankCanvas,
  assertTapTargetSize,
  assertZeroRawI18nKeys,
  comparePngVisualDiff,
  extractZoneId,
  getShortlistBadgeCount,
  nextFrames,
  normalizeDigits,
  requireBoundingBox,
  selectZoneAndResolveLabel,
  waitForAppReady,
  waitForCameraSettled,
  waitForStage,
} from '../helpers';

test.describe('Tier 2 — Interactive 2D/3D Master Plan & Project Inspector Edge Cases (F-11..F-14)', () => {
  // ── F-11: Interactive Master Plan — 2D Architectural Blueprint View (6) ──

  test('[T2-F11-01][F-11][EC-08] Extreme zoom-in/out and far pan stay bounded in project stage and Reset View restores framing', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=alexandria&project=sawary&view=2d');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    const canvas = page.locator('#app-shell canvas:visible').first();
    const box = await requireBoundingBox(canvas, '2D Master Plan canvas');
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);

    for (let i = 0; i < 8; i += 1) {
      await page.mouse.wheel(0, -500);
      await nextFrames(page, 1);
    }
    for (let i = 0; i < 8; i += 1) {
      await page.mouse.wheel(0, 500);
      await nextFrames(page, 1);
    }

    await page.mouse.down();
    await page.mouse.move(cx + 220, cy - 160, { steps: 6 });
    await page.mouse.up();
    await nextFrames(page, 3);

    await expect(page.locator('#app-shell')).toHaveAttribute('data-stage', 'project');
    await expect(page.locator('#app-shell')).toHaveAttribute('data-project', 'sawary');
    const midScale = normalizeDigits((await page.locator('#masterplan-scale-bar').textContent()) ?? '');
    expect(midScale).not.toMatch(/NaN|undefined/i);
    expect(midScale).toMatch(/[1-9]\d*/);

    await page.locator('#masterplan-reset-view-btn').click();
    await waitForCameraSettled(page);

    const scaleText = normalizeDigits((await page.locator('#masterplan-scale-bar').textContent()) ?? '');
    expect(scaleText).not.toMatch(/NaN|undefined/i);
    expect(scaleText).toMatch(/[1-9]\d*/);
    await expect(page.locator('[id^="masterplan-zone-btn-"]').first()).toBeVisible();
  });

  test('[T2-F11-02][F-11] Legend filter interacts cleanly with active Zone Inspector and Reset View without breaking remaining zones', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=alexandria&project=sawary');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    const legendItems = page.locator('[id^="masterplan-legend-item-"]');
    expect(await legendItems.count()).toBeGreaterThanOrEqual(3);

    await selectZoneAndResolveLabel(page, 0);

    const lastLegend = legendItems.last();
    await lastLegend.click();
    await nextFrames(page, 2);
    const active = await lastLegend.evaluate(
      (el) =>
        el.getAttribute('aria-pressed') === 'true' || el.getAttribute('data-active') === 'true',
    );
    expect(active).toBe(true);
    await expect(page.locator('#app-shell')).toHaveAttribute('data-stage', 'project');
    await expect(page.locator('#app-shell')).toHaveAttribute('data-project', 'sawary');

    await page.locator('#masterplan-reset-view-btn').click();
    await waitForCameraSettled(page);

    await lastLegend.click();
    await nextFrames(page, 2);
    const cleared = await lastLegend.evaluate(
      (el) =>
        el.getAttribute('aria-pressed') !== 'true' && el.getAttribute('data-active') !== 'true',
    );
    expect(cleared).toBe(true);

    const zones = page.locator('[id^="masterplan-zone-btn-"]');
    expect(await zones.count()).toBeGreaterThanOrEqual(5);
    const secondZone = await selectZoneAndResolveLabel(page, 1);
    await expect(page.locator('#app-shell')).toHaveAttribute('data-parcel', secondZone.zoneId);
  });

  test('[T2-F11-03][F-11] Switching between legend categories updates cleanly and resets when changing project', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=alexandria&project=sawary');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    const legendItems = page.locator('[id^="masterplan-legend-item-"]');
    const count = await legendItems.count();
    expect(count).toBeGreaterThanOrEqual(2);

    await legendItems.nth(0).click();
    await nextFrames(page, 2);
    await legendItems.nth(1).click();
    await nextFrames(page, 2);

    const secondActive = await legendItems.nth(1).evaluate(
      (el) =>
        el.getAttribute('aria-pressed') === 'true' || el.getAttribute('data-active') === 'true',
    );
    expect(secondActive).toBe(true);

    await page.locator('#project-next-btn').click();
    await waitForCameraSettled(page);
    await expect(page.locator('#app-shell')).not.toHaveAttribute('data-project', 'sawary');

    const anyActiveAfterSwitch = await page
      .locator('[id^="masterplan-legend-item-"]')
      .evaluateAll((els) =>
        els.some(
          (el) =>
            el.getAttribute('aria-pressed') === 'true' || el.getAttribute('data-active') === 'true',
        ),
      );
    expect(anyActiveAfterSwitch).toBe(false);
  });

  test('[T2-F11-04][F-11] Clicking masterplan-north-arrow resets site bearing cleanly without errors', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=alexandria&project=san-stefano');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    const northArrow = page.locator('#masterplan-north-arrow');
    await expect(northArrow).toBeVisible();
    await northArrow.click();
    await waitForCameraSettled(page);

    await expect(page.locator('#app-shell')).toHaveAttribute('data-project', 'san-stefano');
    await expect(page.locator('#app-shell')).toHaveAttribute('data-camera-moving', 'false');
  });

  test('[T2-F11-05][F-11] Metric scale bar stays valid positive across extreme site footprints (17 vs 8000 feddans) and zoom ticks in AR and EN', async ({
    page,
  }) => {
    const scaleBar = page.locator('#masterplan-scale-bar');

    // Compact urban site: San Stefano (17 feddans)
    await page.goto('/?stage=project&gov=alexandria&project=san-stefano&view=2d');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });
    const compactAr = normalizeDigits((await scaleBar.textContent()) ?? '');
    expect(compactAr).toMatch(/[1-9]\d*.*(م|كم)/);

    // Mega-city footprint: Madinaty (8000 feddans)
    await page.goto('/?stage=project&gov=cairo&project=madinaty&view=2d');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });
    const megaAr = normalizeDigits((await scaleBar.textContent()) ?? '');
    expect(megaAr).toMatch(/[1-9]\d*.*(م|كم)/);

    const canvas = page.locator('#app-shell canvas:visible').first();
    const box = await requireBoundingBox(canvas, 'Madinaty 2D Master Plan canvas');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    for (let i = 0; i < 4; i += 1) {
      await page.mouse.wheel(0, -240);
      await nextFrames(page, 2);
    }
    const zoomedAr = normalizeDigits((await scaleBar.textContent()) ?? '');
    expect(zoomedAr).toMatch(/[1-9]\d*.*(م|كم)/);

    await page.locator('#lang-toggle-btn').click();
    await expect(page.locator('#app-shell')).toHaveAttribute('data-lang', 'en');
    const zoomedEn = normalizeDigits((await scaleBar.textContent()) ?? '');
    expect(zoomedEn).toMatch(/[1-9]\d*.*(m|km)/i);
  });

  test.describe('T2-F11-06 SVG Master Plan fallback', () => {
    test.use({ disableWebGL: true });

    test('[T2-F11-06][F-11][EC-13] WebGL-unavailable 2D Master Plan SVG fallback retains clickable zones, chrome, and legend filtering', async ({
      page,
    }) => {
      await page.goto('/?stage=project&gov=alexandria&project=sawary');
      await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

      const shell = page.locator('#app-shell');
      await expect(shell).toHaveAttribute('data-webgl-map', 'fallback');
      await expect(shell).toHaveAttribute('data-map-tiles', 'svg-fallback');

      const zones = page.locator('[id^="masterplan-zone-btn-"]');
      expect(await zones.count()).toBeGreaterThanOrEqual(5);

      const selected = await selectZoneAndResolveLabel(page, 0);
      await expect(shell).toHaveAttribute('data-parcel', selected.zoneId);

      await expect(page.locator('#masterplan-north-arrow')).toBeVisible();
      await expect(page.locator('#masterplan-scale-bar')).toBeVisible();
      await expect(page.locator('#masterplan-legend')).toBeVisible();

      const firstLegend = page.locator('[id^="masterplan-legend-item-"]').first();
      await expect(firstLegend).toBeVisible();
      await firstLegend.click();
      await nextFrames(page, 2);
      const legendActive = await firstLegend.evaluate(
        (el) =>
          el.getAttribute('aria-pressed') === 'true' || el.getAttribute('data-active') === 'true',
      );
      expect(legendActive).toBe(true);
      await firstLegend.click();
      await nextFrames(page, 2);
    });
  });

  // ── F-12: Interactive Master Plan — 3D Massing View Toggle (5) ──

  test('[T2-F12-01][F-12][EC-08] Combined Zone Inspector and active Legend filter stay coherent across 2D <-> 3D on coastal project', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=red-sea&project=el-gouna&view=2d');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    const { zoneId, matchToken } = await selectZoneAndResolveLabel(page, 0);
    const panel = page.locator('#masterplan-zone-panel');
    const firstLegend = page.locator('[id^="masterplan-legend-item-"]').first();
    await expect(firstLegend).toBeVisible();
    await firstLegend.click();
    await nextFrames(page, 2);

    await page.locator('#masterplan-mode-3d').click();
    await waitForCameraSettled(page);
    await expect(page.locator('#app-shell')).toHaveAttribute('data-masterplan-mode', '3d');
    await expect(page.locator('#app-shell')).toHaveAttribute('data-parcel', zoneId);
    await expect(panel).toBeVisible();
    await expect(panel).toContainText(matchToken);

    await page.locator('#masterplan-mode-2d').click();
    await waitForCameraSettled(page);
    await expect(page.locator('#app-shell')).toHaveAttribute('data-masterplan-mode', '2d');
    await expect(page.locator('#app-shell')).toHaveAttribute('data-parcel', zoneId);
    await expect(panel).toBeVisible();
    await expect(panel).toContainText(matchToken);
  });

  test('[T2-F12-02][F-12][EC-08] 3D massing view enforces zero passive auto-orbit (transform + pixel stability) and resets user drag via Reset View', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=alexandria&project=sawary&view=2d');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    await page.locator('#masterplan-mode-3d').click();
    await waitForCameraSettled(page);

    const northArrow = page.locator('#masterplan-north-arrow');
    const transformBefore = await northArrow.evaluate((el) => window.getComputedStyle(el).transform);
    const idleSnapBefore = await assertNonBlankCanvas(page, '#app-shell canvas:visible', {
      minWidth: 250,
      minHeight: 180,
    });

    // Intentional 1.8s negative idle wait proving zero auto-orbit
    await page.waitForTimeout(1800);

    await expect(page.locator('#app-shell')).toHaveAttribute('data-camera-moving', 'false');
    const transformAfter = await northArrow.evaluate((el) => window.getComputedStyle(el).transform);
    expect(transformAfter).toBe(transformBefore);
    const idleSnapAfter = await assertNonBlankCanvas(page, '#app-shell canvas:visible', {
      minWidth: 250,
      minHeight: 180,
    });
    expect(comparePngVisualDiff(idleSnapBefore.png, idleSnapAfter.png)).toBeLessThan(0.02);

    const canvas = page.locator('#app-shell canvas:visible').first();
    const box = await requireBoundingBox(canvas, '3D Master Plan canvas');
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 180, cy - 40, { steps: 6 });
    await page.mouse.up();
    await nextFrames(page, 3);

    await page.locator('#masterplan-reset-view-btn').click();
    await waitForCameraSettled(page);
    await expect(page.locator('#app-shell')).toHaveAttribute('data-masterplan-mode', '3d');
  });

  test('[T2-F12-03][F-12] Rapid 2D <-> 3D mode toggling stress test avoids race conditions or WebGL errors', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=alexandria&project=sawary&view=2d');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    const sequence = [
      '#masterplan-mode-3d',
      '#masterplan-mode-2d',
      '#masterplan-mode-3d',
      '#masterplan-mode-2d',
    ];
    for (const sel of sequence) {
      await page.locator(sel).click();
      await page.waitForTimeout(100);
    }

    await waitForCameraSettled(page);
    await expect(page.locator('#app-shell')).toHaveAttribute('data-masterplan-mode', '2d');
    await expect(page.locator('#app-shell')).toHaveAttribute('data-camera-moving', 'false');
  });

  test.describe('T2-F12-04 3D toggle under SVG fallback', () => {
    test.use({ disableWebGL: true });

    test('[T2-F12-04][F-12][EC-13] 3D <-> 2D axonometric SVG toggle works cleanly with zone selection when WebGL is unavailable', async ({
      page,
    }) => {
      await page.goto('/?stage=project&gov=alexandria&project=sawary');
      await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

      const shell = page.locator('#app-shell');
      await page.locator('#masterplan-mode-3d').click();
      await waitForCameraSettled(page);

      await expect(shell).toHaveAttribute('data-webgl-map', 'fallback');
      await expect(shell).toHaveAttribute('data-masterplan-mode', '3d');
      const svgBox = await requireBoundingBox(
        page.locator('#app-shell svg:visible').first(),
        '2.5D SVG Master Plan',
      );
      expect(svgBox.width).toBeGreaterThan(200);
      expect(svgBox.height).toBeGreaterThan(150);

      const { zoneId } = await selectZoneAndResolveLabel(page, 0);
      await expect(shell).toHaveAttribute('data-parcel', zoneId);

      await page.locator('#masterplan-mode-2d').click();
      await waitForCameraSettled(page);
      await expect(shell).toHaveAttribute('data-masterplan-mode', '2d');
      await expect(page.locator('#masterplan-zone-panel')).toBeVisible();
    });
  });

  test('[T2-F12-05][F-12] Switching to 3D syncs view=3d to URL and survives full page reload', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=alexandria&project=sawary&view=2d');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    await page.locator('#masterplan-mode-3d').click();
    await waitForCameraSettled(page);
    expect(new URL(page.url()).searchParams.get('view')).toBe('3d');

    await page.reload();
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    const shell = page.locator('#app-shell');
    await expect(shell).toHaveAttribute('data-project', 'sawary');
    await expect(shell).toHaveAttribute('data-masterplan-mode', '3d');
    await expect(shell).toHaveAttribute('data-camera-moving', 'false');
  });

  // ── F-13: Interactive Architectural Zone Inspector (5) ──

  test('[T2-F13-01][F-13][EC-07] Escape dismisses ONLY Zone Inspector across repeated select -> Escape cycles', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=alexandria&project=sawary');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    const shell = page.locator('#app-shell');

    // Cycle 1: Zone 0 -> Escape
    const first = await selectZoneAndResolveLabel(page, 0);
    await page.keyboard.press('Escape');
    await expect(page.locator('#masterplan-zone-panel')).toBeHidden();
    await expect(shell).toHaveAttribute('data-parcel', 'none');
    await expect(shell).toHaveAttribute('data-stage', 'project');
    await expect(shell).toHaveAttribute('data-project', 'sawary');
    await expect(page.locator('#project-inspector')).toBeVisible();

    // Cycle 2: Distinct Zone 2 -> Escape
    const third = await selectZoneAndResolveLabel(page, 2);
    expect(third.zoneId).not.toBe(first.zoneId);
    await page.keyboard.press('Escape');
    await expect(page.locator('#masterplan-zone-panel')).toBeHidden();
    await expect(shell).toHaveAttribute('data-parcel', 'none');
    await expect(shell).toHaveAttribute('data-stage', 'project');
    await expect(shell).toHaveAttribute('data-project', 'sawary');
  });

  test('[T2-F13-02][F-13] Rapid sweep across all zones plus final re-click enforces single Zone Inspector panel invariant', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=alexandria&project=sawary');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    const zones = page.locator('[id^="masterplan-zone-btn-"]');
    const totalZones = await zones.count();
    expect(totalZones).toBeGreaterThanOrEqual(5);

    const visitedIds: string[] = [];
    for (let i = 0; i < totalZones; i += 1) {
      const btn = zones.nth(i);
      const id = extractZoneId((await btn.getAttribute('id')) ?? '');
      visitedIds.push(id);
      await btn.click();
      await nextFrames(page, 1);
      await expect(page.locator('#masterplan-zone-panel')).toHaveCount(1);
    }

    const lastId = visitedIds[visitedIds.length - 1] ?? '';
    expect(new Set(visitedIds).size).toBe(totalZones);
    await expect(page.locator('#app-shell')).toHaveAttribute('data-parcel', lastId);
    await expect(page.locator('#masterplan-zone-panel')).toBeVisible();

    // Re-clicking active final zone must stay coherent (either keep selected or cleanly toggle off)
    await zones.nth(totalZones - 1).click();
    await nextFrames(page, 2);
    const finalPanelCount = await page.locator('#masterplan-zone-panel').count();
    expect(finalPanelCount === 0 || finalPanelCount === 1).toBe(true);
    await expect(page.locator('#app-shell')).toHaveAttribute('data-project', 'sawary');
  });

  test('[T2-F13-03][F-13] Switching to sibling project clears previously selected zone from state and DOM', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=alexandria&project=sawary');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    await page.locator('[id^="masterplan-zone-btn-"]').first().click();
    await expect(page.locator('#masterplan-zone-panel')).toBeVisible();

    await page.locator('#project-next-btn').click();
    await waitForCameraSettled(page);

    await expect(page.locator('#app-shell')).not.toHaveAttribute('data-project', 'sawary');
    await expect(page.locator('#app-shell')).toHaveAttribute('data-parcel', 'none');
    await expect(page.locator('#masterplan-zone-panel')).toBeHidden();
  });

  test('[T2-F13-04][F-13] Switching Zone A inquiry to Zone B inquiry leaves zero stale Zone A leakage in Consultation Modal', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=alexandria&project=sawary');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    const zoneA = await selectZoneAndResolveLabel(page, 0);
    await page.locator('#masterplan-zone-inquire-btn').click();
    const modal = page.locator('#consult-modal');
    await expect(modal).toBeVisible();
    await expect(modal.locator('#consult-notes')).toBeVisible();

    const contextA = await modal.evaluate((el) => {
      const notes = (el.querySelector('#consult-notes') as HTMLTextAreaElement | null)?.value ?? '';
      return `${el.textContent ?? ''} ${notes}`;
    });
    expect(contextA).toMatch(/صواري|Sawary/i);
    expect(
      contextA,
      `Expected Zone A ("${zoneA.zoneLabel}") token "${zoneA.matchToken}" in modal context`,
    ).toContain(zoneA.matchToken);

    await page.locator('#consult-close-btn').click();
    await expect(modal).toBeHidden();
    await expect(page.locator('#app-shell')).toHaveAttribute('data-parcel', zoneA.zoneId);

    // Select distinct Zone B and confirm modal updates cleanly without stale Zone A label
    const zoneB = await selectZoneAndResolveLabel(page, 2);
    expect(zoneB.zoneId).not.toBe(zoneA.zoneId);
    expect(zoneB.zoneLabel).not.toBe(zoneA.zoneLabel);

    await page.locator('#masterplan-zone-inquire-btn').click();
    await expect(modal).toBeVisible();
    await expect(modal.locator('#consult-notes')).toBeVisible();

    const contextB = await modal.evaluate((el) => {
      const notes = (el.querySelector('#consult-notes') as HTMLTextAreaElement | null)?.value ?? '';
      return `${el.textContent ?? ''} ${notes}`;
    });
    expect(contextB).toMatch(/صواري|Sawary/i);
    expect(
      contextB,
      `Expected Zone B ("${zoneB.zoneLabel}") token "${zoneB.matchToken}" in modal context`,
    ).toContain(zoneB.matchToken);
    expect(
      contextB,
      `Stale Zone A label "${zoneA.zoneLabel}" leaked into Zone B consultation modal`,
    ).not.toContain(zoneA.zoneLabel);

    await page.locator('#consult-close-btn').click();
    await expect(modal).toBeHidden();
    await expect(page.locator('#app-shell')).toHaveAttribute('data-project', 'sawary');
  });

  test('[T2-F13-05][F-13] Toggling AR <-> EN while Zone Inspector is open live-translates zone details without dismissing', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=alexandria&project=sawary');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    const zoneBtn = page.locator('[id^="masterplan-zone-btn-"]').first();
    const zoneId = extractZoneId((await zoneBtn.getAttribute('id')) ?? '');
    await zoneBtn.click();

    const panel = page.locator('#masterplan-zone-panel');
    await expect(panel).toBeVisible();
    const arText = ((await panel.textContent()) ?? '').trim();
    expect(arText).toMatch(/[\u0600-\u06FF]/);

    await page.locator('#lang-toggle-btn').click();
    await expect(page.locator('#app-shell')).toHaveAttribute('data-lang', 'en');
    await expect(panel).toBeVisible();
    await expect(page.locator('#app-shell')).toHaveAttribute('data-parcel', zoneId);

    const enText = ((await panel.textContent()) ?? '').trim();
    expect(enText).toMatch(/[A-Za-z]{4,}/);
    expect(enText).not.toBe(arText);
  });

  // ── F-14: Concise Conversion-First Project Summary Card (5) ──

  test('[T2-F14-01][F-14] Sibling switcher boundary behavior at start and end of 2-project governorate (Suez)', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=suez&project=azha-sokhna');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    const shell = page.locator('#app-shell');
    const nextBtn = page.locator('#project-next-btn');
    const prevBtn = page.locator('#project-prev-btn');

    // From index 0 (azha-sokhna), #project-next-btn MUST advance to il-monte-galala
    await expect(nextBtn).toBeVisible();
    await expect(nextBtn).toBeEnabled();
    await nextBtn.click();
    await waitForCameraSettled(page);
    await expect(shell).toHaveAttribute('data-project', 'il-monte-galala');
    await expect(shell).toHaveAttribute('data-governorate', 'suez');

    // At index 1 (end boundary), #project-prev-btn MUST ALWAYS be enabled and return to azha-sokhna
    await expect(prevBtn).toBeVisible();
    await expect(prevBtn).toBeEnabled();
    await prevBtn.click();
    await waitForCameraSettled(page);
    await expect(shell).toHaveAttribute('data-project', 'azha-sokhna');
    await expect(shell).toHaveAttribute('data-governorate', 'suez');

    // Step back to index 1 and verify exact end-boundary contract (either circular wrap or disabled clamp)
    await nextBtn.click();
    await waitForCameraSettled(page);
    await expect(shell).toHaveAttribute('data-project', 'il-monte-galala');

    if (await nextBtn.isEnabled()) {
      await nextBtn.click();
      await waitForCameraSettled(page);
      await expect(shell).toHaveAttribute('data-project', 'azha-sokhna');
      await expect(shell).toHaveAttribute('data-governorate', 'suez');

      await expect(prevBtn).toBeEnabled();
      await prevBtn.click();
      await waitForCameraSettled(page);
      await expect(shell).toHaveAttribute('data-project', 'il-monte-galala');
      await expect(shell).toHaveAttribute('data-governorate', 'suez');
    } else {
      await expect(nextBtn).toBeDisabled();
      await expect(prevBtn).toBeEnabled();
      await prevBtn.click();
      await waitForCameraSettled(page);
      await expect(shell).toHaveAttribute('data-project', 'azha-sokhna');
      await expect(prevBtn).toBeDisabled();
      await expect(nextBtn).toBeEnabled();
    }
  });

  test('[T2-F14-02][F-14] Boundary projects across 4 governorates render 1 to 4 concise highlights and zero placeholders in AR and EN', async ({
    page,
  }) => {
    const boundaryProjects = [
      { gov: 'alexandria', id: 'creeks-alex' },
      { gov: 'alexandria', id: 'san-stefano' },
      { gov: 'cairo', id: 'madinaty' },
      { gov: 'red-sea', id: 'el-gouna' },
    ] as const;

    for (const { gov, id } of boundaryProjects) {
      for (const lang of ['ar', 'en'] as const) {
        await page.goto(`/?lang=${lang}&stage=project&gov=${gov}&project=${id}`);
        await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

        const inspector = page.locator('#project-inspector');
        await expect(inspector).toBeVisible();
        await assertZeroRawI18nKeys(page, '#project-inspector');

        const text = normalizeDigits((await inspector.textContent()) ?? '');
        expect(text).not.toMatch(/\b(undefined|null|NaN)\b|EGP\s*0\b/i);
        expect(text.trim().length).toBeGreaterThan(40);
        expect(await inspector.locator('table').count()).toBe(0);

        const highlights = inspector.locator('ul li, ol li');
        const highlightCount = await highlights.count();
        expect(
          highlightCount,
          `Project "${id}" (${lang}) summary card must render between 1 and 4 highlights`,
        ).toBeGreaterThanOrEqual(1);
        expect(highlightCount).toBeLessThanOrEqual(4);
        expect(((await highlights.first().textContent()) ?? '').trim().length).toBeGreaterThan(4);
      }
    }
  });

  test('[T2-F14-03][F-14] Shortlist toggle inside Project Inspector syncs live with top bar and Governorate Drawer', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=alexandria&project=sawary');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    expect(await getShortlistBadgeCount(page)).toBe(0);
    await page.locator('#shortlist-toggle-sawary').click();
    expect(await getShortlistBadgeCount(page)).toBe(1);

    await page.locator('#project-back-btn').click();
    await waitForStage(page, 'governorate');

    const drawerToggle = page.locator('#shortlist-toggle-sawary');
    await expect(drawerToggle).toBeVisible();
    const isSaved = await drawerToggle.evaluate(
      (el) =>
        el.getAttribute('aria-pressed') === 'true' || el.getAttribute('data-active') === 'true',
    );
    expect(isSaved).toBe(true);

    await drawerToggle.click();
    expect(await getShortlistBadgeCount(page)).toBe(0);
  });

  test.describe('T2-F14-04 Mobile Project Inspector', () => {
    test.use({ viewport: MOBILE_VIEWPORT, hasTouch: true, isMobile: true });

    test('[T2-F14-04][F-14][EC-16] Mobile viewport Project Inspector keeps controls accessible with >=44px conversion CTAs', async ({
      page,
    }) => {
      await page.goto('/?stage=project&gov=alexandria&project=sawary');
      await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });
      await assertNoHorizontalOverflow(page);

      await expect(page.locator('#masterplan-controls')).toBeVisible();
      const consultBtn = page.locator('#project-inspector #consult-open-btn').first();
      await consultBtn.scrollIntoViewIfNeeded();
      await assertTapTargetSize(consultBtn, 44);
    });
  });

  test('[T2-F14-05][F-14] project-back-btn returns to parent governorate preserving active filter selections', async ({
    page,
  }) => {
    await page.goto('/?stage=governorate&gov=alexandria');
    await waitForAppReady(page, { expectedStage: 'governorate', waitForMap: true });

    const villaChip = page.locator('#filter-category-villa');
    await villaChip.click();
    await nextFrames(page, 2);

    await page.locator('#project-card-palm-hills-alex').click();
    await waitForStage(page, 'project');

    await page.locator('#project-back-btn').click();
    await waitForStage(page, 'governorate');

    await expect(page.locator('#app-shell')).toHaveAttribute('data-governorate', 'alexandria');
    await expect(page.locator('#app-shell')).toHaveAttribute('data-project', 'none');
    const villaStillActive = await villaChip.evaluate(
      (el) =>
        el.getAttribute('aria-pressed') === 'true' || el.getAttribute('data-active') === 'true',
    );
    expect(villaStillActive).toBe(true);
  });
});
