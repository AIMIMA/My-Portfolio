import { test, expect } from '../fixtures';
import {
  COMPACT_MOBILE_VIEWPORT,
  MOBILE_VIEWPORT,
  PROJECTS_BY_GOVERNORATE,
  assertNoHorizontalOverflow,
  assertTapTargetSize,
  getAppShellState,
  getShortlistBadgeCount,
  nextFrames,
  requireBoundingBox,
  waitForAppReady,
  waitForCameraSettled,
  waitForStage,
} from '../helpers';

test.describe('Tier 2 — Governorate & Project Flight Preemption and Drawer Edge Cases (F-08..F-10)', () => {
  // ── F-08: Governorate Cinematic Fly-To & Spatial Focus (5) ──

  test('[T2-F08-01][F-08][EC-03] Mid-flight lateral governorate preemption (Alexandria -> Cairo) cancels stale flight and syncs URL/drawer exclusively', async ({
    page,
  }) => {
    await page.goto('/?stage=egypt');
    await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });

    await page.locator('#gov-card-alexandria').click();
    // Intentional mid-flight preemption pulse
    await page.waitForTimeout(160);
    await page.locator('#gov-card-cairo').click();

    await waitForStage(page, 'governorate');
    await expect(page.locator('#app-shell')).toHaveAttribute('data-governorate', 'cairo');
    expect(new URL(page.url()).searchParams.get('gov')).toBe('cairo');
    await expect(page.locator('#breadcrumb-governorate')).toContainText(/القاهرة|Cairo/i);
    await expect(page.locator('#governorate-drawer [id^="project-card-"]')).toHaveCount(3);
    for (const id of PROJECTS_BY_GOVERNORATE.cairo) {
      await expect(page.locator(`#project-card-${id}`)).toBeVisible();
    }
    await expect(page.locator('#project-card-sawary')).toHaveCount(0);
  });

  test('[T2-F08-02][F-08][EC-03] Rapid 4-governorate switching settles cleanly on last clicked target', async ({
    page,
  }) => {
    await page.goto('/?stage=egypt');
    await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });

    await page.locator('#gov-card-alexandria').click();
    await page.waitForTimeout(100);
    await page.locator('#gov-card-matrouh').click();
    await page.waitForTimeout(100);
    await page.locator('#gov-card-red-sea').click();
    await page.waitForTimeout(100);
    await page.locator('#gov-card-suez').click();

    await waitForStage(page, 'governorate');
    await expect(page.locator('#app-shell')).toHaveAttribute('data-governorate', 'suez');
    await expect(page.locator('#governorate-drawer [id^="project-card-"]')).toHaveCount(2);
    for (const id of PROJECTS_BY_GOVERNORATE.suez) {
      await expect(page.locator(`#project-card-${id}`)).toBeVisible();
    }
  });

  test('[T2-F08-03][F-08] Re-clicking already-active governorate card is idempotent and non-destructive', async ({
    page,
  }) => {
    await page.goto('/?stage=governorate&gov=alexandria');
    await waitForAppReady(page, { expectedStage: 'governorate', waitForMap: true });

    await page.locator('#gov-card-alexandria').click();
    await waitForCameraSettled(page);

    await expect(page.locator('#app-shell')).toHaveAttribute('data-stage', 'governorate');
    await expect(page.locator('#app-shell')).toHaveAttribute('data-governorate', 'alexandria');
    await expect(page.locator('#governorate-drawer [id^="project-card-"]')).toHaveCount(8);
  });

  test.describe('T2-F08-04 Reduced-motion governorate flights', () => {
    test.use({ reducedMotion: 'reduce' });

    test('[T2-F08-04][F-08][EC-17] Reduced-motion governorate focus and lateral switch settle rapidly', async ({
      page,
    }) => {
      await page.goto('/?stage=egypt');
      await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });

      const t0 = Date.now();
      await page.locator('#gov-card-alexandria').click();
      await waitForStage(page, 'governorate');
      expect(Date.now() - t0).toBeLessThan(1500);

      await page.locator('#gov-card-giza').click();
      await waitForStage(page, 'governorate');
      await expect(page.locator('#app-shell')).toHaveAttribute('data-governorate', 'giza');
      for (const id of PROJECTS_BY_GOVERNORATE.giza) {
        await expect(page.locator(`#project-card-${id}`)).toBeVisible();
      }
    });
  });

  test('[T2-F08-05][F-08][EC-03] Mid-flight governorate cancel via breadcrumb-egypt aborts cleanly without stale drawer', async ({
    page,
  }) => {
    await page.goto('/?stage=egypt');
    await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });

    await page.locator('#gov-card-red-sea').click();
    // Intentional mid-flight cancel pulse
    await page.waitForTimeout(150);
    await page.locator('#breadcrumb-egypt').click();

    await waitForStage(page, 'egypt');
    await expect(page.locator('#app-shell')).toHaveAttribute('data-governorate', 'none');
    await expect(page.locator('#governorate-drawer')).toBeHidden();
  });

  // ── F-09: Governorate Projects Drawer & Bidirectional Map Sync (5) ──

  test('[T2-F09-01][F-09][EC-02] Aggressive Alexandria 8-project drawer wheel bursts stay isolated and keep bottom card reachable', async ({
    page,
  }) => {
    await page.goto('/?stage=governorate&gov=alexandria');
    await waitForAppReady(page, { expectedStage: 'governorate', waitForMap: true });

    const drawer = page.locator('#governorate-drawer');
    await expect(drawer.locator('[id^="project-card-"]')).toHaveCount(8);

    const box = await requireBoundingBox(drawer, '#governorate-drawer');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

    for (const delta of [800, 800, -1000, 700, -900]) {
      await page.mouse.wheel(0, delta);
      await nextFrames(page, 3);
    }

    const shell = page.locator('#app-shell');
    await expect(shell).toHaveAttribute('data-stage', 'governorate');
    await expect(shell).toHaveAttribute('data-governorate', 'alexandria');
    await expect(shell).toHaveAttribute('data-scroll-progress', '1.00');
    await expect(shell).toHaveAttribute('data-camera-moving', 'false');

    const lastCard = page.locator('#project-card-san-stefano');
    await lastCard.scrollIntoViewIfNeeded();
    await expect(lastCard).toBeVisible();
    await expect(shell).toHaveAttribute('data-stage', 'governorate');
  });

  test('[T2-F09-02][F-09] Rapid 5-card hover sweep clears cleanly on unhover and resets highlights across lateral governorate switch', async ({
    page,
  }) => {
    await page.goto('/?stage=governorate&gov=alexandria');
    await waitForAppReady(page, { expectedStage: 'governorate', waitForMap: true });

    const sweepIds = [
      'sawary',
      'palm-hills-alex',
      'creeks-alex',
      'alex-west',
      'muruj-smouha',
    ] as const;

    for (const id of sweepIds) {
      await page.locator(`#project-card-${id}`).hover();
      await nextFrames(page, 1);
    }

    await page.mouse.move(5, 5);
    await nextFrames(page, 3);

    const stuckHighlights = await page.evaluate(() => {
      const pins = Array.from(document.querySelectorAll<HTMLElement>('[id^="map-pin-"]'));
      return pins
        .filter(
          (pin) =>
            pin.getAttribute('data-highlighted') === 'true' ||
            pin.getAttribute('data-active') === 'true',
        )
        .map((pin) => pin.id);
    });
    expect(stuckHighlights, 'Expected zero pins stuck highlighted after unhover').toEqual([]);

    // Hover Sawary then switch governorate immediately -> zero stale highlights in Cairo
    await page.locator('#project-card-sawary').hover();
    await nextFrames(page, 1);
    await page.locator('#gov-card-cairo').click();
    await waitForStage(page, 'governorate');
    await expect(page.locator('#app-shell')).toHaveAttribute('data-governorate', 'cairo');

    const staleInCairo = await page.evaluate(() => {
      const pins = Array.from(document.querySelectorAll<HTMLElement>('[id^="map-pin-"]'));
      return pins
        .filter((pin) => pin.getAttribute('data-highlighted') === 'true')
        .map((pin) => pin.id);
    });
    expect(staleInCairo).toEqual([]);
  });

  test.describe('T2-F09-03 Mobile bottom sheet', () => {
    test.use({ viewport: MOBILE_VIEWPORT, hasTouch: true, isMobile: true });

    test('[T2-F09-03][F-09][EC-16] Mobile 390x844 and compact 375x667 render bounded bottom sheet with reachable last card and >=44px tap target', async ({
      page,
    }) => {
      for (const vp of [MOBILE_VIEWPORT, COMPACT_MOBILE_VIEWPORT]) {
        await page.setViewportSize(vp);
        await page.goto('/?stage=governorate&gov=alexandria');
        await waitForAppReady(page, { expectedStage: 'governorate', waitForMap: true });
        await assertNoHorizontalOverflow(page);

        const drawer = page.locator('#governorate-drawer');
        const box = await requireBoundingBox(
          drawer,
          `Mobile #governorate-drawer at ${vp.width}x${vp.height}`,
        );
        expect(box.y).toBeGreaterThanOrEqual(150);
        expect(box.height).toBeLessThanOrEqual(0.72 * vp.height);

        const lastCard = page.locator('#project-card-san-stefano');
        await lastCard.scrollIntoViewIfNeeded();
        await expect(lastCard).toBeVisible();
        await assertTapTargetSize(page.locator('#shortlist-toggle-san-stefano'), 44);
      }
    });
  });

  test('[T2-F09-04][F-09] Rapid save/unsave/cap-rejection toggle cycle directly on drawer cards preserves aria-pressed and zero-launch invariant', async ({
    page,
  }) => {
    await page.goto('/?stage=governorate&gov=alexandria');
    await waitForAppReady(page, { expectedStage: 'governorate', waitForMap: true });

    const shell = page.locator('#app-shell');
    const isToggleActive = async (projectId: string): Promise<boolean> =>
      page.locator(`#shortlist-toggle-${projectId}`).evaluate((el) => {
        return (
          el.getAttribute('aria-pressed') === 'true' ||
          el.getAttribute('data-active') === 'true' ||
          el.getAttribute('data-shortlisted') === 'true'
        );
      });

    const clickToggleAndAssertStay = async (projectId: string, expectedBadge: number): Promise<void> => {
      const btn = page.locator(`#shortlist-toggle-${projectId}`);
      await btn.scrollIntoViewIfNeeded();
      await btn.click();
      await nextFrames(page, 2);
      await expect(shell).toHaveAttribute('data-stage', 'governorate');
      await expect(shell).toHaveAttribute('data-project', 'none');
      expect(await getShortlistBadgeCount(page)).toBe(expectedBadge);
    };

    // Cycle sawary ON -> OFF -> ON
    await clickToggleAndAssertStay('sawary', 1);
    await clickToggleAndAssertStay('sawary', 0);
    await clickToggleAndAssertStay('sawary', 1);

    // Fill to 3-item cap
    await clickToggleAndAssertStay('palm-hills-alex', 2);
    await clickToggleAndAssertStay('creeks-alex', 3);

    // 4th attempt rejected cleanly while staying on governorate
    await clickToggleAndAssertStay('alex-west', 3);

    // Unsave palm-hills-alex directly from its drawer card
    await clickToggleAndAssertStay('palm-hills-alex', 2);

    expect(await isToggleActive('sawary')).toBe(true);
    expect(await isToggleActive('creeks-alex')).toBe(true);
    expect(await isToggleActive('palm-hills-alex')).toBe(false);
    expect(await isToggleActive('alex-west')).toBe(false);
  });

  test('[T2-F09-05][F-09] Filtering inside Alexandria focus dynamically updates drawer list and resets cleanly', async ({
    page,
  }) => {
    await page.goto('/?stage=governorate&gov=alexandria');
    await waitForAppReady(page, { expectedStage: 'governorate', waitForMap: true });

    await page.locator('#filter-status-ready_to_move').click();
    await nextFrames(page, 2);

    const cards = page.locator('#governorate-drawer [id^="project-card-"]');
    await expect(cards).toHaveCount(3);
    for (const id of ['valore-smouha', 'antoniadis-alex', 'san-stefano']) {
      await expect(page.locator(`#project-card-${id}`)).toBeVisible();
    }

    await page.locator('#filter-reset-btn').click();
    await nextFrames(page, 2);
    await expect(cards).toHaveCount(8);
  });

  // ── F-10: Project Cinematic Fly-To Transition (5) ──

  test('[T2-F10-01][F-10][EC-03] Mid-flight preemption from governorate fly-to straight into Sawary project settles cleanly', async ({
    page,
  }) => {
    await page.goto('/?stage=egypt');
    await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });

    await page.locator('#gov-card-alexandria').click();
    await page.waitForTimeout(150);

    const card = page.locator('#project-card-sawary');
    if (await card.isVisible()) {
      await card.click();
    } else {
      await page.locator('#map-pin-sawary').click();
    }

    await waitForStage(page, 'project');
    const shell = page.locator('#app-shell');
    await expect(shell).toHaveAttribute('data-governorate', 'alexandria');
    await expect(shell).toHaveAttribute('data-project', 'sawary');
    await expect(page.locator('#project-inspector')).toBeVisible();
    await expect(page.locator('#masterplan-controls')).toBeVisible();
  });

  test('[T2-F10-02][F-10][EC-03] Pressing Escape mid-project-flight aborts cleanly back to parent governorate', async ({
    page,
  }) => {
    await page.goto('/?stage=governorate&gov=alexandria');
    await waitForAppReady(page, { expectedStage: 'governorate', waitForMap: true });

    await page.locator('#project-card-alex-west').click();
    await page.waitForTimeout(150);
    await page.keyboard.press('Escape');

    await waitForStage(page, 'governorate');
    const shell = page.locator('#app-shell');
    await expect(shell).toHaveAttribute('data-governorate', 'alexandria');
    await expect(shell).toHaveAttribute('data-project', 'none');
    await expect(page.locator('#project-inspector')).toBeHidden();
  });

  test('[T2-F10-03][F-10] Rapid multi-click on project-next-btn advances cleanly without stale inspector overlays', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=alexandria&project=sawary');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    for (let i = 0; i < 3; i += 1) {
      await page.locator('#project-next-btn').click();
      await page.waitForTimeout(100);
    }

    await waitForCameraSettled(page);
    const state = await getAppShellState(page);
    expect(state.stage).toBe('project');
    expect(state.governorate).toBe('alexandria');
    expect(state.project).not.toBe('sawary');
    expect(state.parcel).toBe('none');
    await expect(page.locator('#project-inspector')).toHaveCount(1);
    await expect(page.locator('#project-inspector')).toBeVisible();
  });

  test('[T2-F10-04][F-10] Direct project entry from Egypt search preserves parent governorate for Back step-out', async ({
    page,
  }) => {
    await page.goto('/?stage=egypt');
    await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });

    await page.locator('#egypt-search-input').fill('Marassi');
    await page
      .locator('#egypt-search-results')
      .locator('button, [role="option"], a')
      .filter({ hasText: /مراسي|Marassi/i })
      .first()
      .click();

    await waitForStage(page, 'project');
    await expect(page.locator('#app-shell')).toHaveAttribute('data-governorate', 'matrouh');
    await expect(page.locator('#app-shell')).toHaveAttribute('data-project', 'marassi');

    await page.locator('#project-back-btn').click();
    await waitForStage(page, 'governorate');
    await expect(page.locator('#app-shell')).toHaveAttribute('data-governorate', 'matrouh');
    await expect(page.locator('#app-shell')).toHaveAttribute('data-project', 'none');
    await expect(page.locator('#governorate-drawer [id^="project-card-"]')).toHaveCount(3);
  });

  test.describe('T2-F10-05 Reduced motion project fly-to', () => {
    test.use({ reducedMotion: 'reduce' });

    test('[T2-F10-05][F-10][EC-17] Reduced-motion project fly-to and return complete immediately without animation lag', async ({
      page,
    }) => {
      await page.goto('/?stage=governorate&gov=alexandria');
      await waitForAppReady(page, { expectedStage: 'governorate', waitForMap: true });

      const t0 = Date.now();
      await page.locator('#project-card-palm-hills-alex').click();
      await waitForStage(page, 'project');
      expect(Date.now() - t0).toBeLessThan(1500);
      await expect(page.locator('#app-shell')).toHaveAttribute('data-project', 'palm-hills-alex');

      const t1 = Date.now();
      await page.locator('#project-back-btn').click();
      await waitForStage(page, 'governorate');
      expect(Date.now() - t1).toBeLessThan(1500);
      await expect(page.locator('#app-shell')).toHaveAttribute('data-project', 'none');
    });
  });
});
