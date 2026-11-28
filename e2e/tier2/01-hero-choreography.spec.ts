import { test, expect } from '../fixtures';
import {
  COMPACT_MOBILE_VIEWPORT,
  CONSULTANT_NAME_AR_REGEX,
  CONSULTANT_NAME_EN_REGEX,
  CONSULTANT_TITLE_AR_REGEX,
  CONSULTANT_TITLE_EN_REGEX,
  DESKTOP_VIEWPORT,
  MOBILE_VIEWPORT,
  PROJECTS_BY_GOVERNORATE,
  assertNoBrokenImages,
  assertNoHorizontalOverflow,
  assertNonBlankCanvas,
  assertTapTargets,
  boxesDoNotOverlap,
  breakPortraitAsset,
  comparePngVisualDiff,
  driveScrollDive,
  getAppShellState,
  getProfileConsultButton,
  nextFrames,
  requireBoundingBox,
  waitForAppReady,
  waitForCameraSettled,
  waitForStage,
} from '../helpers';

test.describe('Tier 2 — Hero Maquette & Choreography Boundary Cases (F-01..F-04)', () => {
  // ── F-01: 3D Architectural Egypt Maquette & Leaning Consultant Composition (6) ──

  test('[T2-F01-01][F-01][EC-15] Slow-404 broken consultant portrait asset is intercepted and falls back without broken img or collapse', async ({
    page,
    errors,
  }) => {
    const portraitFault = await breakPortraitAsset(page, {
      mode: 'slow-404',
      delayMs: 350,
      errorCollector: errors,
    });
    try {
      await page.goto('/');
      await waitForAppReady(page, { expectedStage: 'hero' });

      await expect
        .poll(() => portraitFault.interceptedUrls.length, {
          timeout: 8_000,
          message:
            'EC-15: Expected Hero stage to request a real consultant portrait asset intercepted by breakPortraitAsset',
        })
        .toBeGreaterThan(0);

      await assertNoBrokenImages(page, '#app-shell');

      const visualBox = await requireBoundingBox(
        page.locator('#app-shell canvas:visible, #app-shell svg:visible').first(),
        'Hero fallback visual',
      );
      expect(visualBox.width).toBeGreaterThanOrEqual(80);
      expect(visualBox.height).toBeGreaterThanOrEqual(120);

      await expect(page.locator('#hero-explore-btn')).toBeEnabled();
      await page.locator('#hero-explore-btn').click();
      await waitForStage(page, 'egypt');
    } finally {
      await portraitFault.restore();
    }
  });

  test.describe('T2-F01-02 WebGL unavailable fallback', () => {
    test.use({ disableWebGL: true });

    test('[T2-F01-02][F-01][EC-13] WebGL unavailable falls back to interactive 2.5D SVG Hero maquette across full dive round-trip', async ({
      appPage,
    }) => {
      const shell = appPage.locator('#app-shell');
      await expect(shell).toHaveAttribute('data-webgl-hero', 'fallback');
      await expect(shell).toHaveAttribute('data-stage', 'hero');

      const svg = appPage.locator('#app-shell svg:visible').first();
      const box = await requireBoundingBox(svg, 'Hero 2.5D SVG fallback');
      expect(box.width).toBeGreaterThan(200);
      expect(box.height).toBeGreaterThan(150);

      await appPage.locator('#hero-explore-btn').click();
      await waitForStage(appPage, 'egypt');
      await expect(shell).toHaveAttribute('data-webgl-map', 'fallback');
      await expect(shell).toHaveAttribute('data-map-tiles', 'svg-fallback');

      await appPage.locator('#breadcrumb-hero').click();
      await waitForStage(appPage, 'hero');
      await expect(shell).toHaveAttribute('data-webgl-hero', 'fallback');
      const returnedBox = await requireBoundingBox(
        appPage.locator('#app-shell svg:visible').first(),
        'Returned Hero 2.5D SVG fallback',
      );
      expect(returnedBox.width).toBeGreaterThan(200);
      expect(returnedBox.height).toBeGreaterThan(150);
    });
  });

  test('[T2-F01-03][F-01][EC-13] Runtime webglcontextlost on Hero canvas degrades gracefully to 2.5D SVG fallback without crash', async ({
    appPage,
  }) => {
    const shell = appPage.locator('#app-shell');
    await expect(shell).toHaveAttribute('data-webgl-hero', 'ready');

    const dispatchResult = await appPage.evaluate(() => {
      const shellEl = document.getElementById('app-shell');
      if (!shellEl) return { foundCanvas: false, defaultPrevented: false };

      const cx = Math.floor(window.innerWidth / 2);
      const cy = Math.floor(window.innerHeight / 2);
      const stacked = document.elementsFromPoint(cx, cy);
      const isPaintedCanvas = (el: Element): el is HTMLCanvasElement => {
        if (!(el instanceof HTMLCanvasElement) || !shellEl.contains(el)) return false;
        const cs = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return (
          cs.display !== 'none' &&
          cs.visibility !== 'hidden' &&
          Number.parseFloat(cs.opacity) > 0 &&
          rect.width >= 100 &&
          rect.height >= 100
        );
      };

      const heroCanvas =
        stacked.find(isPaintedCanvas) ??
        Array.from(shellEl.querySelectorAll('canvas')).find(isPaintedCanvas) ??
        null;

      if (!heroCanvas) return { foundCanvas: false, defaultPrevented: false };
      const evt = new Event('webglcontextlost', { cancelable: true, bubbles: false });
      heroCanvas.dispatchEvent(evt);
      return { foundCanvas: true, defaultPrevented: evt.defaultPrevented };
    });

    expect(
      dispatchResult.foundCanvas,
      'Expected a visible Hero WebGL <canvas> before simulating webglcontextlost',
    ).toBe(true);
    expect(
      dispatchResult.defaultPrevented,
      'Hero WebGL canvas must intercept webglcontextlost with event.preventDefault()',
    ).toBe(true);

    await expect(
      shell,
      'HeroStage must set data-webgl-hero="fallback" on unrecovered webglcontextlost',
    ).toHaveAttribute('data-webgl-hero', 'fallback');

    const fallbackSvg = appPage.locator('#app-shell svg:visible').first();
    const svgBox = await requireBoundingBox(fallbackSvg, 'Hero 2.5D SVG fallback');
    expect(svgBox.width).toBeGreaterThan(150);
    expect(svgBox.height).toBeGreaterThan(100);

    await expect(appPage.locator('#hero-explore-btn')).toBeVisible();
    await expect(appPage.locator('#hero-consult-btn')).toBeVisible();

    await appPage.locator('#hero-explore-btn').click();
    await waitForStage(appPage, 'egypt');
    await expect(shell).toHaveAttribute('data-scroll-progress', '1.00');
  });

  test('[T2-F01-04][F-01] Extreme out-of-bounds pointer parallax sweeps and rapid jitter clamp CTAs inside viewport', async ({
    appPage,
  }) => {
    const extremePoints: Array<[number, number]> = [
      [-50, -50],
      [1500, -50],
      [1500, 950],
      [-50, 950],
    ];
    for (const [x, y] of extremePoints) {
      await appPage.mouse.move(x, y);
      await nextFrames(appPage, 2);
    }

    for (let step = 0; step < 20; step += 1) {
      const x = step % 2 === 0 ? 1435 : 5;
      const y = step % 3 === 0 ? 895 : 10;
      await appPage.mouse.move(x, y);
    }
    await nextFrames(appPage, 3);

    const shell = appPage.locator('#app-shell');
    await expect(shell).toHaveAttribute('data-stage', 'hero');
    await expect(shell).toHaveAttribute('data-scroll-progress', '0.00');
    await assertNoHorizontalOverflow(appPage);

    for (const selector of ['#hero-explore-btn', '#hero-consult-btn', '#hero-about-btn'] as const) {
      const box = await requireBoundingBox(appPage.locator(selector), selector);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(DESKTOP_VIEWPORT.width + 1);
      expect(box.y + box.height).toBeLessThanOrEqual(DESKTOP_VIEWPORT.height + 1);
    }
  });

  test('[T2-F01-05][F-01][EC-16] Dynamic viewport resize and orientation flip on Hero preserves framing', async ({
    appPage,
  }) => {
    const viewports = [
      DESKTOP_VIEWPORT,
      MOBILE_VIEWPORT,
      { width: 844, height: 390 },
    ] as const;

    for (const vp of viewports) {
      await appPage.setViewportSize(vp);
      await nextFrames(appPage, 4);
      await assertNoHorizontalOverflow(appPage);

      const visual = appPage.locator('#app-shell canvas:visible, #app-shell svg:visible').first();
      const visualBox = await requireBoundingBox(visual, `Hero visual at ${vp.width}x${vp.height}`);
      expect(visualBox.width).toBeGreaterThanOrEqual(200);
      expect(visualBox.height).toBeGreaterThanOrEqual(150);
      expect(visualBox.width).toBeLessThanOrEqual(vp.width + 2);
      await expect(appPage.locator('#hero-explore-btn')).toBeVisible();
    }
  });

  test('[T2-F01-06][F-01][EC-01] Pixel-level and DOM zero-autoplay invariant holds over 2.5s idle period on Hero', async ({
    appPage,
  }) => {
    const before = await assertNonBlankCanvas(appPage, '#app-shell canvas:visible', {
      minWidth: 600,
      minHeight: 400,
    });

    // Intentional 2.5s negative idle check proving zero passive autoplay
    await appPage.waitForTimeout(2500);

    const after = await assertNonBlankCanvas(appPage, '#app-shell canvas:visible', {
      minWidth: 600,
      minHeight: 400,
    });
    const idleDiff = comparePngVisualDiff(before.png, after.png);
    expect(
      idleDiff,
      `Expected < 0.02 pixel drift over untouched 2.5s idle wait, got ${idleDiff.toFixed(4)}`,
    ).toBeLessThan(0.02);

    const state = await getAppShellState(appPage);
    expect(state.stage).toBe('hero');
    expect(state.scrollProgressRaw).toBe('0.00');
    expect(state.cameraMoving).toBe(false);
    expect(state.governorate).toBe('none');
    expect(state.project).toBe('none');
    const scrollY = await appPage.evaluate(() => window.scrollY);
    expect(scrollY).toBe(0);
  });

  // ── F-02: Editorial Consultant Identity & Primary Actions (5) ──

  test('[T2-F02-01][F-02] Hero maintains single H1 semantic hierarchy, verified AR/EN title, and zero placeholder strings', async ({
    appPage,
  }) => {
    await expect(appPage.locator('h1:visible')).toHaveCount(1);
    await expect(appPage.locator('h1:visible').first()).toContainText(CONSULTANT_NAME_AR_REGEX);
    const arBody = (await appPage.locator('#app-shell').innerText()) ?? '';
    expect(arBody).toMatch(CONSULTANT_TITLE_AR_REGEX);
    expect(arBody).not.toMatch(/\b(lorem|todo|tbd|placeholder|undefined|nan)\b/i);

    await appPage.locator('#lang-toggle-btn').click();
    await expect(appPage.locator('#app-shell')).toHaveAttribute('data-lang', 'en');
    await expect(appPage.locator('h1:visible')).toHaveCount(1);
    await expect(appPage.locator('h1:visible').first()).toContainText(CONSULTANT_NAME_EN_REGEX);
    const enBody = (await appPage.locator('#app-shell').innerText()) ?? '';
    expect(enBody).toMatch(CONSULTANT_TITLE_EN_REGEX);
    expect(enBody).not.toMatch(/\b(lorem|todo|tbd|placeholder|undefined|nan)\b/i);
  });

  test('[T2-F02-02][F-02][EC-14] Long Arabic and English identity typography wraps cleanly without clipping or CTA overlap', async ({
    appPage,
  }) => {
    for (const vp of [DESKTOP_VIEWPORT, MOBILE_VIEWPORT]) {
      await appPage.setViewportSize(vp);
      for (const expectedLang of ['ar', 'en'] as const) {
        const current = await getAppShellState(appPage);
        if (current.lang !== expectedLang) {
          await appPage.locator('#lang-toggle-btn').click();
          await expect(appPage.locator('#app-shell')).toHaveAttribute('data-lang', expectedLang);
        }
        await nextFrames(appPage, 2);
        await assertNoHorizontalOverflow(appPage);

        const h1Clipped = await appPage.locator('h1:visible').first().evaluate((el) => {
          return el.scrollWidth > el.clientWidth + 2;
        });
        expect(h1Clipped, `H1 clipped at ${vp.width}x${vp.height} in ${expectedLang}`).toBe(false);

        const explore = appPage.locator('#hero-explore-btn');
        const consult = appPage.locator('#hero-consult-btn');
        const about = appPage.locator('#hero-about-btn');

        expect(await boxesDoNotOverlap(explore, consult)).toBe(true);
        expect(await boxesDoNotOverlap(explore, about)).toBe(true);
        expect(await boxesDoNotOverlap(consult, about)).toBe(true);
      }
    }
  });

  test('[T2-F02-03][F-02][EC-16] Compact mobile viewports (390x844 & 375x667) fit Hero above the fold with >=44px tap targets', async ({
    page,
  }) => {
    for (const vp of [MOBILE_VIEWPORT, COMPACT_MOBILE_VIEWPORT]) {
      await page.setViewportSize(vp);
      await page.goto('/');
      await waitForAppReady(page, { expectedStage: 'hero' });
      await assertNoHorizontalOverflow(page);

      const h1Box = await requireBoundingBox(page.locator('h1:visible').first(), 'Mobile Hero H1');
      const exploreBox = await requireBoundingBox(
        page.locator('#hero-explore-btn'),
        'Mobile #hero-explore-btn',
      );
      expect(h1Box.y).toBeGreaterThanOrEqual(0);
      expect(exploreBox.y + exploreBox.height).toBeLessThanOrEqual(vp.height);

      await assertTapTargets(
        [
          page.locator('#hero-explore-btn'),
          page.locator('#hero-consult-btn'),
          page.locator('#hero-about-btn'),
        ],
        44,
      );
    }
  });

  test('[T2-F02-04][F-02] Rapidly cycling Hero overlays (About -> Consult -> Escape -> Lang -> About) enforces single dialog invariant', async ({
    appPage,
  }) => {
    const shell = appPage.locator('#app-shell');
    const dialogs = appPage.locator('[role="dialog"]:visible');

    for (let cycle = 0; cycle < 3; cycle += 1) {
      await appPage.locator('#hero-about-btn').click();
      await expect(appPage.locator('#consultant-profile-modal')).toBeVisible();
      expect(await dialogs.count()).toBe(1);

      const profileConsultBtn = await getProfileConsultButton(appPage);
      await profileConsultBtn.click();
      await expect(appPage.locator('#consult-modal')).toBeVisible();
      expect(await dialogs.count()).toBe(1);

      await appPage.keyboard.press('Escape');
      await expect(appPage.locator('#consult-modal')).toBeHidden();
      expect(await dialogs.count()).toBe(0);

      await appPage.locator('#lang-toggle-btn').click();
      await nextFrames(appPage, 2);

      await appPage.locator('#hero-about-btn').click();
      await expect(appPage.locator('#consultant-profile-modal')).toBeVisible();
      expect(await dialogs.count()).toBe(1);

      await appPage.keyboard.press('Escape');
      await expect(appPage.locator('#consultant-profile-modal')).toBeHidden();
      expect(await dialogs.count()).toBe(0);
    }

    await expect(shell).toHaveAttribute('data-stage', 'hero');
    await expect(shell).toHaveAttribute('data-scroll-progress', '0.00');
    await expect(shell).toHaveAttribute('data-governorate', 'none');
  });

  test('[T2-F02-05][F-02] Hero Arabic typography preserves zero letter-spacing and bans gradient text fills', async ({
    appPage,
  }) => {
    await expect(appPage.locator('#app-shell')).toHaveAttribute('data-lang', 'ar');
    await expect(appPage.locator('html')).toHaveAttribute('dir', 'rtl');

    const styles = await appPage.locator('h1:visible').first().evaluate((el) => {
      const cs = window.getComputedStyle(el);
      const webkitClip = cs.getPropertyValue('-webkit-background-clip');
      return {
        letterSpacing: cs.letterSpacing,
        backgroundClip: cs.backgroundClip,
        webkitClip,
      };
    });

    expect(['normal', '0px']).toContain(styles.letterSpacing);
    expect(styles.backgroundClip).not.toBe('text');
    expect(styles.webkitClip).not.toBe('text');
  });

  // ── F-03: Scroll-Scrubbed Video-Like Dive Transition (6) ──

  test('[T2-F03-01][F-03][EC-01] Triple rapid sawtooth reversals mid-dive remain clamped and resolve cleanly to Egypt', async ({
    appPage,
  }) => {
    const allSamples: number[] = [];

    // Leg 1: forward to >= 0.35
    let peak1 = 0;
    for (let i = 0; i < 14; i += 1) {
      const res = await driveScrollDive(appPage, 1, 180, { assertMoved: false });
      allSamples.push(...res.samples);
      peak1 = Math.max(peak1, res.finalProgress);
      if (res.finalProgress >= 0.35) break;
    }
    expect(peak1).toBeGreaterThanOrEqual(0.3);

    // Reversal 1: back down by >= 0.08 (target <= 0.22)
    let trough1 = peak1;
    for (let i = 0; i < 12; i += 1) {
      const res = await driveScrollDive(appPage, 1, -180, { assertMoved: false });
      allSamples.push(...res.samples);
      trough1 = Math.min(trough1, res.finalProgress);
      if (res.finalProgress <= Math.min(0.22, peak1 - 0.1)) break;
    }
    expect(peak1 - trough1).toBeGreaterThanOrEqual(0.08);

    // Leg 2: forward to >= 0.65
    let peak2 = trough1;
    for (let i = 0; i < 16; i += 1) {
      const res = await driveScrollDive(appPage, 1, 200, { assertMoved: false });
      allSamples.push(...res.samples);
      peak2 = Math.max(peak2, res.finalProgress);
      if (res.finalProgress >= 0.65) break;
    }
    expect(peak2 - trough1).toBeGreaterThanOrEqual(0.2);

    // Reversal 2: back down by >= 0.08 (target <= 0.45)
    let trough2 = peak2;
    for (let i = 0; i < 12; i += 1) {
      const res = await driveScrollDive(appPage, 1, -200, { assertMoved: false });
      allSamples.push(...res.samples);
      trough2 = Math.min(trough2, res.finalProgress);
      if (res.finalProgress <= Math.min(0.45, peak2 - 0.1)) break;
    }
    expect(peak2 - trough2).toBeGreaterThanOrEqual(0.08);

    // Final leg: finish dive to Egypt 1.00
    for (let i = 0; i < 24; i += 1) {
      const cur = await getAppShellState(appPage);
      if (cur.stage === 'egypt' && cur.scrollProgress >= 0.99) break;
      const res = await driveScrollDive(appPage, 2, 260, { assertMoved: false });
      allSamples.push(...res.samples);
    }

    for (const val of allSamples) {
      expect(Number.isFinite(val)).toBe(true);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(1);
    }

    await waitForStage(appPage, 'egypt');
    await expect(appPage.locator('#app-shell')).toHaveAttribute('data-scroll-progress', '1.00');
    await expect(appPage.locator('#gov-card-alexandria')).toBeVisible();
  });

  test('[T2-F03-02][F-03] Extreme vertical and diagonal overscroll bursts clamp strictly to [0.00, 1.00] without overflow', async ({
    appPage,
  }) => {
    const heroCanvas = await requireBoundingBox(
      appPage.locator('#app-shell canvas:visible').first(),
      'Hero canvas',
    );
    await appPage.mouse.move(heroCanvas.x + heroCanvas.width / 2, heroCanvas.y + heroCanvas.height / 2);

    for (let i = 0; i < 6; i += 1) {
      await appPage.mouse.wheel(-800, -1400);
      await nextFrames(appPage, 2);
    }
    let state = await getAppShellState(appPage);
    expect(state.scrollProgressRaw).toBe('0.00');
    expect(state.stage).toBe('hero');
    await assertNoHorizontalOverflow(appPage);

    await appPage.locator('#hero-explore-btn').click();
    await waitForStage(appPage, 'egypt');

    for (let i = 0; i < 6; i += 1) {
      await appPage.mouse.wheel(800, 1400);
      await nextFrames(appPage, 2);
    }
    state = await getAppShellState(appPage);
    expect(state.scrollProgressRaw).toBe('1.00');
    expect(state.stage).toBe('egypt');
    expect(state.governorate).toBe('none');
    await assertNoHorizontalOverflow(appPage);
  });

  test('[T2-F03-03][F-03] Repeated 2x full scroll-dive round-trips preserve map interactivity without WebGL state corruption', async ({
    appPage,
  }) => {
    const diveToEgypt = async (): Promise<void> => {
      for (let i = 0; i < 24; i += 1) {
        const cur = await getAppShellState(appPage);
        if (cur.stage === 'egypt' && cur.scrollProgress >= 0.99) break;
        await driveScrollDive(appPage, 2, 260, { assertMoved: false });
      }
      await waitForStage(appPage, 'egypt');
      await expect(appPage.locator('#app-shell')).toHaveAttribute('data-scroll-progress', '1.00');
      await expect(appPage.locator('#app-shell')).toHaveAttribute('data-camera-moving', 'false');
    };

    const returnToHero = async (): Promise<void> => {
      for (let i = 0; i < 28; i += 1) {
        const cur = await getAppShellState(appPage);
        if (cur.stage === 'hero' && cur.scrollProgress <= 0.01) break;
        await driveScrollDive(appPage, 2, -260, { assertMoved: false });
      }
      await waitForStage(appPage, 'hero');
      await expect(appPage.locator('#app-shell')).toHaveAttribute('data-scroll-progress', '0.00');
      await expect(appPage.locator('#app-shell')).toHaveAttribute('data-camera-moving', 'false');
    };

    await diveToEgypt();
    await returnToHero();
    await diveToEgypt();
    await returnToHero();
    await diveToEgypt();

    await appPage.locator('#gov-card-cairo').click();
    await waitForStage(appPage, 'governorate');
    await expect(appPage.locator('#app-shell')).toHaveAttribute('data-governorate', 'cairo');
    for (const projectId of PROJECTS_BY_GOVERNORATE.cairo) {
      await expect(appPage.locator(`#project-card-${projectId}`)).toBeVisible();
    }
  });

  test('[T2-F03-04][F-03][EC-02] Wheel scrolling inside open overlays on Hero does not scrub underlying camera', async ({
    appPage,
  }) => {
    await appPage.locator('#hero-about-btn').click();
    const modal = appPage.locator('#consultant-profile-modal');
    await expect(modal).toBeVisible();

    const box = await requireBoundingBox(modal, '#consultant-profile-modal');
    await appPage.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    for (let i = 0; i < 4; i += 1) {
      await appPage.mouse.wheel(0, 800);
      await nextFrames(appPage, 3);
    }

    const shell = appPage.locator('#app-shell');
    await expect(shell).toHaveAttribute('data-stage', 'hero');
    await expect(shell).toHaveAttribute('data-scroll-progress', '0.00');

    await appPage.keyboard.press('Escape');
    await expect(modal).toBeHidden();
    await expect(shell).toHaveAttribute('data-stage', 'hero');
    await expect(shell).toHaveAttribute('data-scroll-progress', '0.00');
  });

  test('[T2-F03-05][F-03] Optical cross-dissolve midpoint (0.55..0.88) stays error-free and resolves without dual-HUD collision', async ({
    appPage,
  }) => {
    let hitOpticalBand = false;
    for (let i = 0; i < 20; i += 1) {
      const res = await driveScrollDive(appPage, 1, 160, { assertMoved: false });
      if (res.finalProgress >= 0.5 && res.finalProgress <= 0.9) {
        hitOpticalBand = true;
        expect(res.finalStage).toBe('transition');
        break;
      }
      if (res.finalStage === 'egypt') break;
    }
    expect(hitOpticalBand).toBe(true);

    for (let i = 0; i < 16; i += 1) {
      const cur = await getAppShellState(appPage);
      if (cur.stage === 'egypt' && cur.scrollProgress >= 0.99) break;
      await driveScrollDive(appPage, 2, 220, { assertMoved: false });
    }

    await waitForStage(appPage, 'egypt');
    await expect(appPage.locator('#gov-card-alexandria')).toBeVisible();
    await appPage.locator('#gov-card-alexandria').click();
    await waitForStage(appPage, 'governorate');
    await expect(appPage.locator('#app-shell')).toHaveAttribute('data-governorate', 'alexandria');
  });

  test.describe('T2-F03-06 Mobile touch dive', () => {
    test.use({ viewport: MOBILE_VIEWPORT, hasTouch: true, isMobile: true });

    test('[T2-F03-06][F-03][EC-16] Mobile touch scroll/swipe drives Hero dive into Egypt overview cleanly', async ({
      appPage,
    }) => {
      // 1. Drive native mobile scroll track (PROJECT.md: 220vh scroll track)
      for (let i = 0; i < 12; i += 1) {
        const cur = await getAppShellState(appPage);
        if (cur.stage === 'egypt' && cur.scrollProgress >= 0.99) break;
        await appPage.evaluate(() => {
          window.scrollBy({ top: 320, behavior: 'instant' });
        });
        await nextFrames(appPage, 3);
      }

      // 2. If touch-gesture driven rather than window.scrollY, dispatch real mobile touch swipes (never desktop wheel)
      if ((await getAppShellState(appPage)).stage !== 'egypt') {
        const cdp = await appPage.context().newCDPSession(appPage);
        try {
          const x = Math.round(MOBILE_VIEWPORT.width / 2);
          for (let swipe = 0; swipe < 8; swipe += 1) {
            const cur = await getAppShellState(appPage);
            if (cur.stage === 'egypt' && cur.scrollProgress >= 0.99) break;
            await cdp.send('Input.dispatchTouchEvent', {
              type: 'touchStart',
              touchPoints: [{ x, y: 680, radiusX: 12, radiusY: 12, force: 1 }],
            });
            for (let step = 1; step <= 6; step += 1) {
              const y = Math.round(680 - (480 * step) / 6);
              await cdp.send('Input.dispatchTouchEvent', {
                type: 'touchMove',
                touchPoints: [{ x, y, radiusX: 12, radiusY: 12, force: 1 }],
              });
              await nextFrames(appPage, 1);
            }
            await cdp.send('Input.dispatchTouchEvent', {
              type: 'touchEnd',
              touchPoints: [],
            });
            await nextFrames(appPage, 3);
          }
        } finally {
          await cdp.detach();
        }
      }

      await waitForStage(appPage, 'egypt');
      await expect(appPage.locator('#app-shell')).toHaveAttribute('data-scroll-progress', '1.00');
      await expect(appPage.locator('#gov-card-alexandria')).toBeVisible();
    });
  });

  // ── F-04: Deterministic Direct Dive & Stage Controls (5) ──

  test('[T2-F04-01][F-04] Boundary keyboard clamping at Hero 0.00 and Egypt 1.00 plus alternating PageDown/PageUp stays stable', async ({
    appPage,
  }) => {
    const shell = appPage.locator('#app-shell');
    await shell.focus();

    // 4x PageUp / ArrowUp at Hero 0.00 must clamp cleanly at hero / 0.00
    for (let i = 0; i < 4; i += 1) {
      await appPage.keyboard.press(i % 2 === 0 ? 'PageUp' : 'ArrowUp');
      await nextFrames(appPage, 3);
    }
    await expect(shell).toHaveAttribute('data-stage', 'hero');
    await expect(shell).toHaveAttribute('data-scroll-progress', '0.00');

    // Alternating mid-flight PageDown -> PageUp pulse must never deadlock
    await appPage.keyboard.press('PageDown');
    await nextFrames(appPage, 3);
    await appPage.keyboard.press('PageUp');
    await waitForCameraSettled(appPage);
    const settledMid = await getAppShellState(appPage);
    expect(settledMid.cameraMoving).toBe(false);
    expect(settledMid.scrollProgress).toBeGreaterThanOrEqual(0);
    expect(settledMid.scrollProgress).toBeLessThanOrEqual(1);

    // Advance deterministically into Egypt and verify 4x PageDown / ArrowDown clamps at egypt / 1.00
    await appPage.goto('/?stage=egypt');
    await waitForAppReady(appPage, { expectedStage: 'egypt', waitForMap: true });
    await appPage.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    });
    for (let i = 0; i < 4; i += 1) {
      await appPage.keyboard.press(i % 2 === 0 ? 'PageDown' : 'ArrowDown');
      await nextFrames(appPage, 3);
    }
    await expect(shell).toHaveAttribute('data-stage', 'egypt');
    await expect(shell).toHaveAttribute('data-scroll-progress', '1.00');
    await expect(shell).toHaveAttribute('data-governorate', 'none');
  });

  test('[T2-F04-02][F-04][EC-03] Mid-dive preemption via breadcrumb-hero cancels animated dive cleanly', async ({
    appPage,
  }) => {
    await appPage.locator('#hero-explore-btn').click();
    // Intentional mid-spline preemption timing pulse
    await appPage.waitForTimeout(150);

    const crumb = appPage.locator('#breadcrumb-hero');
    if (await crumb.isVisible()) {
      await crumb.click();
    } else {
      await appPage.keyboard.press('Escape');
    }

    await waitForStage(appPage, 'hero');
    const shell = appPage.locator('#app-shell');
    await expect(shell).toHaveAttribute('data-stage', 'hero');
    await expect(shell).toHaveAttribute('data-scroll-progress', '0.00');
    await expect(shell).toHaveAttribute('data-camera-moving', 'false');
    await expect(appPage.locator('#hero-explore-btn')).toBeEnabled();
  });

  test('[T2-F04-03][F-04] Rapid repeated clicks on hero-explore-btn are idempotent without deadlock', async ({
    appPage,
  }) => {
    const exploreBtn = appPage.locator('#hero-explore-btn');
    await expect(exploreBtn).toBeVisible();
    await expect(exploreBtn).toBeEnabled();
    await exploreBtn.click();

    // Rapid follow-up spam clicks while hero overlay may be fading/unmounting mid-dive
    for (let i = 0; i < 3; i += 1) {
      await appPage.waitForTimeout(50);
      if (await exploreBtn.isVisible()) {
        await exploreBtn.click({ force: true }).catch(() => undefined);
      }
    }

    await waitForStage(appPage, 'egypt');
    await expect(appPage.locator('#app-shell')).toHaveAttribute('data-scroll-progress', '1.00');
    await expect(appPage.locator('#app-shell')).toHaveAttribute('data-camera-moving', 'false');
    await expect(appPage.locator('#gov-card-alexandria')).toBeEnabled();
  });

  test.describe('T2-F04-04 Reduced motion timing', () => {
    test.use({ reducedMotion: 'reduce' });

    test('[T2-F04-04][F-04][EC-17] Reduced-motion direct dive and breadcrumb return complete rapidly', async ({
      appPage,
    }) => {
      const startDive = Date.now();
      await appPage.locator('#hero-explore-btn').click();
      await waitForStage(appPage, 'egypt');
      expect(Date.now() - startDive).toBeLessThanOrEqual(1500);

      const startReturn = Date.now();
      await appPage.locator('#breadcrumb-hero').click();
      await waitForStage(appPage, 'hero');
      expect(Date.now() - startReturn).toBeLessThanOrEqual(1500);
      await expect(appPage.locator('#app-shell')).toHaveAttribute('data-scroll-progress', '0.00');
    });
  });

  test('[T2-F04-05][F-04] Arrow and digit keys typed inside search input do not trigger stage or governorate shortcuts', async ({
    page,
  }) => {
    await page.goto('/?stage=egypt');
    await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });

    const input = page.locator('#egypt-search-input');
    await input.click();
    await input.type('123');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('PageUp');
    await waitForCameraSettled(page);

    const shell = page.locator('#app-shell');
    await expect(shell).toHaveAttribute('data-stage', 'egypt');
    await expect(shell).toHaveAttribute('data-governorate', 'none');
    await expect(input).toHaveValue('123');
  });
});
