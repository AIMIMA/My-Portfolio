import { test, expect } from '../fixtures';
import {
  CONSULTANT_NAME_AR_REGEX,
  CONSULTANT_NAME_EN_REGEX,
  CONSULTANT_TITLE_AR_REGEX,
  CONSULTANT_TITLE_EN_REGEX,
  DESKTOP_VIEWPORT,
  MOBILE_VIEWPORT,
  assertNoBrokenImages,
  assertNoHorizontalOverflow,
  assertNonBlankCanvas,
  comparePngVisualDiff,
  driveScrollDive,
  getAppShellState,
  nextFrames,
  normalizeDigits,
  requireBoundingBox,
  trackConsultantAssetResponses,
  waitForAppReady,
  waitForStage,
} from '../helpers';

test.describe('Tier 1 — Hero Maquette & Dive Choreography (F-01..F-04)', () => {
  // ── F-01: 3D Architectural Egypt Maquette & Leaning Consultant Composition ──

  test('[T1-01.1][F-01] Renders initial Hero Maquette stage with live WebGL2 canvas and non-blank visual pixels', async ({
    appPage,
  }) => {
    const shell = appPage.locator('#app-shell');
    await expect(shell).toHaveAttribute('data-stage', 'hero');
    await expect(shell).toHaveAttribute('data-scroll-progress', '0.00');
    await expect(shell).toHaveAttribute('data-webgl-hero', 'ready');

    const stats = await assertNonBlankCanvas(appPage, '#app-shell canvas:visible', {
      minWidth: 600,
      minHeight: 400,
      minUniqueColors: 4,
      minLumStdDev: 3.0,
    });
    expect(stats.width).toBeGreaterThanOrEqual(600);
    expect(stats.height).toBeGreaterThanOrEqual(400);
    await assertNoBrokenImages(appPage, '#app-shell');
  });

  test('[T1-01.2][F-01] Hero 3D Maquette renders live visual motion driven strictly by user scroll action', async ({
    appPage,
  }) => {
    const shell = appPage.locator('#app-shell');
    await expect(shell).toHaveAttribute('data-stage', 'hero');
    await expect(shell).toHaveAttribute('data-scroll-progress', '0.00');

    const beforeStats = await assertNonBlankCanvas(appPage, '#app-shell canvas:visible', {
      minWidth: 600,
      minHeight: 400,
    });

    let reachedMid = false;
    for (let i = 0; i < 14; i += 1) {
      const res = await driveScrollDive(appPage, 1, 180, { assertMoved: false });
      if (res.finalProgress >= 0.25 && res.finalProgress <= 0.65) {
        reachedMid = true;
        break;
      }
      if (res.finalStage === 'egypt') break;
    }
    expect(reachedMid, 'Expected scroll action to advance Hero into mid-dive 0.25..0.65 band').toBe(
      true,
    );

    const midStats = await assertNonBlankCanvas(appPage, '#app-shell canvas:visible', {
      minWidth: 600,
      minHeight: 400,
    });
    const visualDelta = comparePngVisualDiff(beforeStats.png, midStats.png);
    expect(
      visualDelta,
      `Expected live 3D camera motion visual diff > 0.03 between 0.00 and mid-dive (got ${visualDelta.toFixed(4)})`,
    ).toBeGreaterThan(0.03);
  });

  test('[T1-01.3][F-01] Applies subtle pointer parallax on Hero without triggering unintended stage transition', async ({
    appPage,
  }) => {
    const points: Array<[number, number]> = [
      [200, 180],
      [1240, 180],
      [1240, 720],
      [200, 720],
      [720, 450],
    ];
    for (const [x, y] of points) {
      await appPage.mouse.move(x, y, { steps: 4 });
      await nextFrames(appPage, 2);
    }

    const state = await getAppShellState(appPage);
    expect(state.stage).toBe('hero');
    expect(state.scrollProgressRaw).toBe('0.00');
    expect(state.governorate).toBe('none');
  });

  test('[T1-01.4][F-01] Live WebGL2 Hero frames full viewport, hands off to Egypt map, and re-activates cleanly on return', async ({
    appPage,
  }) => {
    const shell = appPage.locator('#app-shell');
    await expect(shell).toHaveAttribute('data-webgl-hero', 'ready');

    const heroCanvas = appPage.locator('#app-shell canvas:visible').first();
    const heroBox = await requireBoundingBox(heroCanvas, 'Hero WebGL2 canvas');
    expect(heroBox.width).toBeGreaterThanOrEqual(Math.round(DESKTOP_VIEWPORT.width * 0.9));
    expect(heroBox.height).toBeGreaterThanOrEqual(Math.round(DESKTOP_VIEWPORT.height * 0.8));

    await appPage.locator('#hero-explore-btn').click();
    await waitForStage(appPage, 'egypt');
    await expect(shell).toHaveAttribute('data-scroll-progress', '1.00');
    await assertNonBlankCanvas(appPage, '#app-shell canvas:visible', {
      minWidth: 400,
      minHeight: 300,
    });

    await appPage.locator('#breadcrumb-hero').click();
    await waitForStage(appPage, 'hero');
    await expect(shell).toHaveAttribute('data-webgl-hero', 'ready');
    await expect(shell).toHaveAttribute('data-scroll-progress', '0.00');
    await assertNonBlankCanvas(appPage, '#app-shell canvas:visible', {
      minWidth: 600,
      minHeight: 400,
    });
  });

  test('[T1-01.5][F-01] Loads real uploaded consultant photo asset cleanly on Hero with HTTP 200 and above-the-fold CTA', async ({
    page,
  }) => {
    const assetTracker = trackConsultantAssetResponses(page);
    try {
      await page.goto('/');
      await waitForAppReady(page, { expectedStage: 'hero' });

      await expect
        .poll(() => assetTracker.okUrls.length, {
          timeout: 10_000,
          message:
            'Expected Hero stage to fetch real consultant photo asset (/assets/consultant/*) with HTTP 200 image/*',
        })
        .toBeGreaterThan(0);
      expect(
        assetTracker.failedUrls,
        `Unexpected failed consultant asset response(s): ${JSON.stringify(assetTracker.failedUrls)}`,
      ).toEqual([]);

      await assertNoBrokenImages(page, '#app-shell');
      const exploreBox = await requireBoundingBox(
        page.locator('#hero-explore-btn'),
        '#hero-explore-btn',
      );
      expect(exploreBox.y + exploreBox.height).toBeLessThanOrEqual(DESKTOP_VIEWPORT.height);
    } finally {
      assetTracker.detach();
    }
  });

  // ── F-02: Editorial Consultant Identity & Primary Actions ──

  test('[T1-02.1][F-02] Renders single H1 heading, Arabic consultant identity, title, tagline, and 3 stats', async ({
    appPage,
  }) => {
    const headings = appPage.locator('h1:visible');
    await expect(headings).toHaveCount(1);

    const heroText = normalizeDigits((await appPage.locator('#app-shell').innerText()) ?? '');
    expect(heroText).toMatch(CONSULTANT_NAME_AR_REGEX);
    expect(heroText).toMatch(CONSULTANT_TITLE_AR_REGEX);
    expect(heroText).toContain('22');
    expect(heroText).toContain('6');
    expect(heroText.trim().length).toBeGreaterThan(60);
  });

  test('[T1-02.2][F-02] Displays all three primary Hero CTAs enabled and above the fold on desktop', async ({
    appPage,
  }) => {
    const ctas = ['#hero-explore-btn', '#hero-consult-btn', '#hero-about-btn'] as const;
    for (const selector of ctas) {
      const btn = appPage.locator(selector);
      await expect(btn).toBeVisible();
      await expect(btn).toBeEnabled();
      const label = ((await btn.textContent()) ?? '').trim();
      expect(label.length).toBeGreaterThanOrEqual(3);
      const box = await requireBoundingBox(btn, selector);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThanOrEqual(DESKTOP_VIEWPORT.height);
    }
  });

  test('[T1-02.3][F-02] Hero About CTA opens Consultant Profile Modal without disturbing Hero stage', async ({
    appPage,
  }) => {
    await appPage.locator('#hero-about-btn').click();
    const profileModal = appPage.locator('#consultant-profile-modal');
    await expect(profileModal).toBeVisible();
    await expect(profileModal).toHaveAttribute('role', 'dialog');
    await expect(profileModal).toHaveAttribute('aria-modal', 'true');

    const shell = appPage.locator('#app-shell');
    await expect(shell).toHaveAttribute('data-stage', 'hero');
    await expect(shell).toHaveAttribute('data-scroll-progress', '0.00');
  });

  test('[T1-02.4][F-02] Hero Book Consultation CTA opens Consultation Modal from Hero stage', async ({
    appPage,
  }) => {
    await appPage.locator('#hero-consult-btn').click();
    const consultModal = appPage.locator('#consult-modal');
    await expect(consultModal).toBeVisible();
    await expect(consultModal).toHaveAttribute('role', 'dialog');
    await expect(appPage.locator('#consult-form')).toBeVisible();
    await expect(appPage.locator('#app-shell')).toHaveAttribute('data-stage', 'hero');
  });

  test.describe('F-02 Mobile Hero check', () => {
    test.use({ viewport: MOBILE_VIEWPORT, hasTouch: true, isMobile: true });

    test('[T1-02.5][F-02] Hero editorial card wraps cleanly without overflow on mobile 390x844 in AR and EN', async ({
      appPage,
    }) => {
      await assertNoHorizontalOverflow(appPage);
      await expect(appPage.locator('h1:visible').first()).toBeVisible();
      const exploreBoxAr = await requireBoundingBox(
        appPage.locator('#hero-explore-btn'),
        '#hero-explore-btn on mobile',
      );
      expect(exploreBoxAr.y + exploreBoxAr.height).toBeLessThanOrEqual(MOBILE_VIEWPORT.height);

      await appPage.locator('#lang-toggle-btn').click();
      await expect(appPage.locator('#app-shell')).toHaveAttribute('data-lang', 'en');
      await expect(appPage.locator('#app-shell')).toContainText(CONSULTANT_NAME_EN_REGEX);
      await expect(appPage.locator('#app-shell')).toContainText(CONSULTANT_TITLE_EN_REGEX);
      await assertNoHorizontalOverflow(appPage);
    });
  });

  // ── F-03: Scroll-Scrubbed Video-Like Dive Transition ──

  test('[T1-03.1][F-03] Wheel scrolling down scrubs diveProgress continuously through intermediate transition stage', async ({
    appPage,
  }) => {
    let sawTransition = false;
    let intermediateValue = 0;

    const canvasBox = await requireBoundingBox(
      appPage.locator('#app-shell canvas:visible').first(),
      'Hero WebGL canvas',
    );
    await appPage.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);

    for (let i = 0; i < 12; i += 1) {
      await appPage.mouse.wheel(0, 180);
      await nextFrames(appPage, 3);
      const state = await getAppShellState(appPage);
      if (
        state.stage === 'transition' &&
        state.scrollProgress > 0.05 &&
        state.scrollProgress < 0.95
      ) {
        sawTransition = true;
        intermediateValue = state.scrollProgress;
        break;
      }
      if (state.stage === 'egypt') break;
    }

    expect(
      sawTransition,
      'Expected continuous intermediate transition stage during wheel scrub',
    ).toBe(true);
    expect(intermediateValue).toBeGreaterThan(0.05);
    expect(intermediateValue).toBeLessThan(0.95);
  });

  test('[T1-03.2][F-03] Completing downward scroll enters Egypt Overview and reveals Governorate Dock', async ({
    appPage,
  }) => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const current = await getAppShellState(appPage);
      if (current.stage === 'egypt' && current.scrollProgress >= 0.99) break;
      await driveScrollDive(appPage, 3, 240, { assertMoved: false });
    }

    await waitForStage(appPage, 'egypt');
    await expect(appPage.locator('#app-shell')).toHaveAttribute('data-scroll-progress', '1.00');
    await expect(appPage.locator('#egypt-search-input')).toBeVisible();
    await expect(appPage.locator('#gov-card-alexandria')).toBeVisible();
  });

  test('[T1-03.3][F-03] Scrolling upward from Egypt Overview smoothly reverses dive back to Hero Maquette', async ({
    appPage,
  }) => {
    await appPage.locator('#hero-explore-btn').click();
    await waitForStage(appPage, 'egypt');

    for (let attempt = 0; attempt < 24; attempt += 1) {
      const current = await getAppShellState(appPage);
      if (current.stage === 'hero' && current.scrollProgress <= 0.01) break;
      await driveScrollDive(appPage, 3, -240, { assertMoved: false });
    }

    await waitForStage(appPage, 'hero');
    await expect(appPage.locator('#app-shell')).toHaveAttribute('data-scroll-progress', '0.00');
    await expect(appPage.locator('#hero-explore-btn')).toBeVisible();
  });

  test('[T1-03.4][F-03] Fine-grained downward wheel scrub advances 2-decimal progress monotonically across >=4 distinct steps', async ({
    appPage,
  }) => {
    const rawSamples: string[] = [];
    const numericSamples: number[] = [];

    const canvasBox = await requireBoundingBox(
      appPage.locator('#app-shell canvas:visible').first(),
      'Hero WebGL canvas',
    );
    await appPage.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);

    for (let i = 0; i < 40; i += 1) {
      await appPage.mouse.wheel(0, 110);
      await nextFrames(appPage, 3);
      const state = await getAppShellState(appPage);
      if (state.scrollProgressRaw !== null) {
        rawSamples.push(state.scrollProgressRaw);
        numericSamples.push(state.scrollProgress);
      }
      if (state.stage === 'egypt' && state.scrollProgress >= 0.99) break;
    }

    await waitForStage(appPage, 'egypt');
    expect(rawSamples.length).toBeGreaterThanOrEqual(4);
    for (const raw of rawSamples) {
      expect(raw, `Expected fixed 2-decimal progress string, got "${raw}"`).toMatch(
        /^(0\.\d{2}|1\.00)$/,
      );
    }

    for (let i = 1; i < numericSamples.length; i += 1) {
      const prev = numericSamples[i - 1] ?? 0;
      const curr = numericSamples[i] ?? 0;
      expect(curr, `Expected monotonic non-decreasing scrub (${prev} -> ${curr})`).toBeGreaterThanOrEqual(
        prev - 0.01,
      );
    }

    const distinctCount = new Set(rawSamples).size;
    expect(
      distinctCount,
      `Expected >= 4 distinct scroll-scrub progress steps, observed ${distinctCount}`,
    ).toBeGreaterThanOrEqual(4);
    await expect(appPage.locator('#breadcrumb-egypt')).toBeVisible();
  });

  test('[T1-03.5][F-03] Pausing user scroll mid-dive holds transition camera steady with zero passive drift', async ({
    appPage,
  }) => {
    let hitMidBand = false;
    for (let i = 0; i < 16; i += 1) {
      const res = await driveScrollDive(appPage, 1, 150, { assertMoved: false });
      if (res.finalStage === 'transition' && res.finalProgress >= 0.2 && res.finalProgress <= 0.7) {
        hitMidBand = true;
        break;
      }
      if (res.finalStage === 'egypt') break;
    }
    expect(hitMidBand, 'Expected scroll scrub to reach transition band [0.20..0.70]').toBe(true);

    // Allow short wheel inertia to finish, then confirm zero passive autoplay drift
    await nextFrames(appPage, 10);
    const settled = await getAppShellState(appPage);
    expect(settled.stage).toBe('transition');
    expect(settled.scrollProgress).toBeGreaterThanOrEqual(0.1);
    expect(settled.scrollProgress).toBeLessThanOrEqual(0.85);

    // Intentional negative-proof idle wait verifying film stays paused while user is idle
    await appPage.waitForTimeout(1500);

    const later = await getAppShellState(appPage);
    expect(later.stage).toBe('transition');
    expect(later.cameraMoving).toBe(false);
    expect(Math.abs(later.scrollProgress - settled.scrollProgress)).toBeLessThanOrEqual(0.03);
  });

  test('[T1-03.6][F-03] Scroll-scrubbed dive preserves EN LTR locale and supports immediate Alexandria drilldown', async ({
    appPage,
  }) => {
    const shell = appPage.locator('#app-shell');
    await appPage.locator('#lang-toggle-btn').click();
    await expect(shell).toHaveAttribute('data-lang', 'en');
    await expect(appPage.locator('html')).toHaveAttribute('dir', 'ltr');

    for (let attempt = 0; attempt < 22; attempt += 1) {
      const cur = await getAppShellState(appPage);
      if (cur.stage === 'egypt' && cur.scrollProgress >= 0.99) break;
      await driveScrollDive(appPage, 3, 240, { assertMoved: false });
    }

    await waitForStage(appPage, 'egypt');
    await expect(shell).toHaveAttribute('data-lang', 'en');
    await expect(appPage.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(appPage.locator('#gov-card-alexandria')).toContainText(/Alexandria/i);

    await appPage.locator('#gov-card-alexandria').click();
    await waitForStage(appPage, 'governorate');
    await expect(shell).toHaveAttribute('data-governorate', 'alexandria');
    await expect(shell).toHaveAttribute('data-lang', 'en');

    await appPage.locator('#breadcrumb-hero').click();
    await waitForStage(appPage, 'hero');
    await expect(shell).toHaveAttribute('data-scroll-progress', '0.00');
    await expect(shell).toHaveAttribute('data-lang', 'en');
  });

  // ── F-04: Deterministic Direct Dive & Stage Controls ──

  test('[T1-04.1][F-04] Clicking #hero-explore-btn runs deterministic dive to Egypt Overview', async ({
    appPage,
  }) => {
    await appPage.locator('#hero-explore-btn').click();
    await waitForStage(appPage, 'egypt');
    const shell = appPage.locator('#app-shell');
    await expect(shell).toHaveAttribute('data-scroll-progress', '1.00');
    await expect(shell).toHaveAttribute('data-camera-moving', 'false');
    await expect(appPage.locator('#gov-card-alexandria')).toBeVisible();
  });

  test('[T1-04.2][F-04] Keyboard PageDown and ArrowDown deterministically advance Hero dive into Egypt', async ({
    appPage,
  }) => {
    await appPage.locator('#app-shell').focus();
    for (let i = 0; i < 6; i += 1) {
      const s = await getAppShellState(appPage);
      if (s.stage === 'egypt') break;
      await appPage.keyboard.press(i === 0 ? 'PageDown' : 'ArrowDown');
      await nextFrames(appPage, 4);
    }
    await waitForStage(appPage, 'egypt');
    await expect(appPage.locator('#app-shell')).toHaveAttribute('data-scroll-progress', '1.00');
  });

  test('[T1-04.3][F-04] Keyboard PageUp and ArrowUp deterministically reverse Egypt Overview back to Hero', async ({
    appPage,
  }) => {
    await appPage.locator('#hero-explore-btn').click();
    await waitForStage(appPage, 'egypt');
    await appPage.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    });

    for (let i = 0; i < 6; i += 1) {
      const s = await getAppShellState(appPage);
      if (s.stage === 'hero') break;
      await appPage.keyboard.press(i === 0 ? 'PageUp' : 'ArrowUp');
      await nextFrames(appPage, 4);
    }
    await waitForStage(appPage, 'hero');
    await expect(appPage.locator('#app-shell')).toHaveAttribute('data-scroll-progress', '0.00');
  });

  test('[T1-04.4][F-04] Clicking #breadcrumb-hero deterministically returns from Governorate Focus to Hero', async ({
    page,
  }) => {
    await page.goto('/?stage=governorate&gov=alexandria');
    await waitForAppReady(page, { expectedStage: 'governorate', waitForMap: true });

    await page.locator('#breadcrumb-hero').click();
    await waitForStage(page, 'hero');
    const shell = page.locator('#app-shell');
    await expect(shell).toHaveAttribute('data-scroll-progress', '0.00');
    await expect(shell).toHaveAttribute('data-governorate', 'none');
    await expect(shell).toHaveAttribute('data-camera-moving', 'false');
  });

  test('[T1-04.5][F-04] Direct stage controls navigate cleanly through full Hero -> Egypt -> Alexandria -> Sawary -> Egypt -> Hero tour', async ({
    appPage,
  }) => {
    const shell = appPage.locator('#app-shell');

    await appPage.locator('#hero-explore-btn').click();
    await waitForStage(appPage, 'egypt');
    await expect(shell).toHaveAttribute('data-scroll-progress', '1.00');
    await expect(shell).toHaveAttribute('data-governorate', 'none');

    await appPage.locator('#gov-card-alexandria').click();
    await waitForStage(appPage, 'governorate');
    await expect(shell).toHaveAttribute('data-governorate', 'alexandria');
    await expect(shell).toHaveAttribute('data-project', 'none');

    await appPage.locator('#project-card-sawary').click();
    await waitForStage(appPage, 'project');
    await expect(shell).toHaveAttribute('data-governorate', 'alexandria');
    await expect(shell).toHaveAttribute('data-project', 'sawary');
    await expect(shell).toHaveAttribute('data-camera-moving', 'false');

    await appPage.locator('#breadcrumb-egypt').click();
    await waitForStage(appPage, 'egypt');
    await expect(shell).toHaveAttribute('data-governorate', 'none');
    await expect(shell).toHaveAttribute('data-project', 'none');

    await appPage.locator('#breadcrumb-hero').click();
    await waitForStage(appPage, 'hero');
    await expect(shell).toHaveAttribute('data-scroll-progress', '0.00');
    await expect(shell).toHaveAttribute('data-camera-moving', 'false');
    await expect(appPage.locator('#hero-explore-btn')).toBeEnabled();
  });
});
