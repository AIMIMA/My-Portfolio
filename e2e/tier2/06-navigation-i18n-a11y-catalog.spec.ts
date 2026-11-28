import { test, expect } from '../fixtures';
import {
  CONSULTANT_NAME_AR_REGEX,
  CONSULTANT_NAME_EN_REGEX,
  CONSULTANT_TITLE_AR_REGEX,
  CONSULTANT_TITLE_EN_REGEX,
  CONSULTANT_WHATSAPP_DIGITS,
  DESKTOP_VIEWPORT,
  GOVERNORATE_COUNTS,
  GOVERNORATE_IDS,
  MOBILE_VIEWPORT,
  PROJECTS_BY_GOVERNORATE,
  REFERENCE_ID_REGEX,
  assertConsultantPhotoLoaded,
  assertNoBrokenImages,
  assertNoHorizontalOverflow,
  assertSafeWhatsAppLink,
  assertZeroRawI18nKeys,
  enterOfflineAfterLocalBoot,
  extractZoneId,
  getAppShellState,
  nextFrames,
  normalizeDigits,
  requireBoundingBox,
  selectZoneAndResolveLabel,
  submitValidConsultation,
  verifyDialogFocusTrap,
  waitForAppReady,
  waitForCameraSettled,
  waitForStage,
} from '../helpers';
import type { GovernorateId } from '../helpers';

test.describe('Tier 2 — Navigation, Deep-Links, i18n, A11y & Catalog Edge Cases (F-19..F-22)', () => {
  // ── F-19: Spatial Breadcrumb Trail & History Deep-Linking (6) ──

  test('[T2-F19-01][F-19][EC-12] Multi-vector malformed deep-link params sanitize safely across all invalid combinations', async ({
    page,
  }) => {
    const malformedUrls = [
      '/?stage=project&gov=mars&project=nonexistent&lang=fr&view=99d',
      '/?stage=governorate&gov=atlantis&lang=de',
      '/?stage=invalid_stage&view=4d',
    ] as const;

    for (const url of malformedUrls) {
      await page.goto(url);
      await waitForAppReady(page);

      const state = await getAppShellState(page);
      expect(state.lang, `Expected safe AR fallback on "${url}"`).toBe('ar');
      expect(state.htmlDir, `Expected RTL fallback on "${url}"`).toBe('rtl');
      expect(state.governorate, `Expected governorate="none" on "${url}"`).toBe('none');
      expect(state.project, `Expected project="none" on "${url}"`).toBe('none');
      expect(state.masterplanMode, `Expected 2d fallback on "${url}"`).toBe('2d');
      expect(['egypt', 'hero']).toContain(state.stage);
    }
  });

  test('[T2-F19-02][F-19][EC-12] Mismatched gov/project pair (gov=cairo&project=sawary) and project-only deep link resolve consistently', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=cairo&project=sawary');
    await waitForAppReady(page);
    const first = await getAppShellState(page);
    expect(first.governorate === 'cairo' && first.project === 'sawary').toBe(false);
    if (first.project === 'sawary') {
      expect(first.governorate).toBe('alexandria');
    } else {
      expect(first.project).toBe('none');
    }

    await page.goto('/?project=marassi');
    await waitForAppReady(page);
    const second = await getAppShellState(page);
    expect(second.stage).toBe('project');
    expect(second.governorate).toBe('matrouh');
    expect(second.project).toBe('marassi');
  });

  test('[T2-F19-03][F-19][EC-12] Adversarial XSS-like and oversized URL query params execute zero scripts and sanitize cleanly', async ({
    page,
  }) => {
    const xssQuery =
      '/?gov=' +
      encodeURIComponent('<script>window.__urlXss=1</script>') +
      '&project=' +
      encodeURIComponent('"><svg/onload=window.__urlXss=2>') +
      '&lang=' +
      encodeURIComponent('ar"><img src=x onerror=window.__urlXss=3>');

    await page.goto(xssQuery);
    await waitForAppReady(page);

    const xssFlag = await page.evaluate(
      () => (window as unknown as Record<string, unknown>).__urlXss,
    );
    expect(xssFlag).toBeUndefined();

    const state = await getAppShellState(page);
    expect(['hero', 'egypt']).toContain(state.stage);
    expect(state.governorate).toBe('none');
    expect(state.project).toBe('none');
  });

  test('[T2-F19-04][F-19] Popstate across lateral gov switch, 3D mode, sibling jump, and modal keeps URL and DOM strictly synced', async ({
    page,
  }) => {
    await page.goto('/?stage=egypt');
    await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });

    await page.locator('#gov-card-alexandria').click();
    await waitForStage(page, 'governorate');
    await page.locator('#gov-card-giza').click();
    await waitForStage(page, 'governorate');

    await page.locator('#project-card-zed-west').click();
    await waitForStage(page, 'project');
    await page.locator('#masterplan-mode-3d').click();
    await waitForCameraSettled(page);
    await page.locator('#project-next-btn').click();
    await waitForCameraSettled(page);

    // Open and close Profile Modal before popstate navigation
    await page.locator('#profile-open-btn').click();
    await expect(page.locator('#consultant-profile-modal')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#consultant-profile-modal')).toBeHidden();

    // Issue Back -> Back -> Forward sequence and assert strict URL <-> DOM alignment
    await page.goBack();
    await waitForCameraSettled(page);
    await page.goBack();
    await waitForCameraSettled(page);
    await page.goForward();
    await waitForCameraSettled(page);

    const state = await getAppShellState(page);
    expect(state.cameraMoving).toBe(false);
    await expect(page.locator('#consultant-profile-modal')).toBeHidden();
    await expect(page.locator('#masterplan-zone-panel')).toBeHidden();

    const params = new URL(page.url()).searchParams;
    const urlGov = params.get('gov');
    const urlProject = params.get('project');
    if (urlProject) {
      expect(state.stage).toBe('project');
      expect(state.project).toBe(urlProject);
      await expect(page.locator('#project-inspector')).toBeVisible();
    } else if (urlGov) {
      expect(state.stage).toBe('governorate');
      expect(state.governorate).toBe(urlGov);
      await expect(page.locator('#governorate-drawer')).toBeVisible();
    } else {
      expect(['egypt', 'hero']).toContain(state.stage);
    }
  });

  test('[T2-F19-05][F-19] Clicking breadcrumb-hero directly from Stage 5 with active zone unwinds all nested state', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=alexandria&project=sawary&view=3d');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    await page.locator('[id^="masterplan-zone-btn-"]').first().click();
    await expect(page.locator('#masterplan-zone-panel')).toBeVisible();

    await page.locator('#breadcrumb-hero').click();
    await waitForStage(page, 'hero');

    const shell = page.locator('#app-shell');
    await expect(shell).toHaveAttribute('data-scroll-progress', '0.00');
    await expect(shell).toHaveAttribute('data-governorate', 'none');
    await expect(shell).toHaveAttribute('data-project', 'none');
    await expect(shell).toHaveAttribute('data-parcel', 'none');
    await expect(page.locator('#project-inspector')).toBeHidden();
    await expect(page.locator('#masterplan-zone-panel')).toBeHidden();
  });

  test('[T2-F19-06][F-19] Partial, implicit-stage, fragment-suffixed, and duplicate-key deep-link URLs resolve deterministically', async ({
    page,
  }) => {
    // 1. Implicit stage from ?gov=red-sea
    await page.goto('/?gov=red-sea');
    await waitForAppReady(page, { expectedStage: 'governorate', waitForMap: true });
    await expect(page.locator('#app-shell')).toHaveAttribute('data-governorate', 'red-sea');
    await expect(page.locator('#governorate-drawer [id^="project-card-"]')).toHaveCount(3);

    // 2. ?stage=egypt&view=3d (view param on non-project stage stays error-free)
    await page.goto('/?stage=egypt&view=3d');
    await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });
    await expect(page.locator('#app-shell')).toHaveAttribute('data-project', 'none');

    // 3. Hash fragment suffix (#masterplan) does not break parameter parsing
    await page.goto('/?stage=project&gov=suez&project=il-monte-galala&lang=en#masterplan');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });
    const fragState = await getAppShellState(page);
    expect(fragState.lang).toBe('en');
    expect(fragState.htmlDir).toBe('ltr');
    expect(fragState.governorate).toBe('suez');
    expect(fragState.project).toBe('il-monte-galala');

    // 4. Duplicate ?gov= keys settle on a single valid governorate matching its exact drawer count
    await page.goto('/?stage=governorate&gov=alexandria&gov=cairo');
    await waitForAppReady(page, { expectedStage: 'governorate', waitForMap: true });
    const dupState = await getAppShellState(page);
    expect(['alexandria', 'cairo']).toContain(dupState.governorate);
    const resolvedGov = dupState.governorate as GovernorateId;
    await expect(page.locator('#governorate-drawer [id^="project-card-"]')).toHaveCount(
      GOVERNORATE_COUNTS[resolvedGov],
    );
  });

  // ── F-20: Bilingual Arabic (RTL Primary) & English (LTR) Toggle (5) ──

  test('[T2-F20-01][F-20][EC-14] Zero horizontal overflow across all 5 stages and 3 modals on Desktop 1440x900 in both AR (RTL) and EN (LTR)', async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);

    for (const lang of ['ar', 'en'] as const) {
      const expectedDir = lang === 'ar' ? 'rtl' : 'ltr';
      const stages = [
        `/?lang=${lang}`,
        `/?lang=${lang}&stage=egypt`,
        `/?lang=${lang}&stage=governorate&gov=alexandria`,
        `/?lang=${lang}&stage=project&gov=alexandria&project=sawary&view=2d`,
        `/?lang=${lang}&stage=project&gov=alexandria&project=sawary&view=3d`,
      ];

      for (const url of stages) {
        await page.goto(url);
        await waitForAppReady(page);
        await expect(page.locator('html')).toHaveAttribute('lang', lang);
        await expect(page.locator('html')).toHaveAttribute('dir', expectedDir);
        await assertNoHorizontalOverflow(page);
      }

      // Zone panel + 3 overlays
      await page.locator('[id^="masterplan-zone-btn-"]').first().click();
      await expect(page.locator('#masterplan-zone-panel')).toBeVisible();
      await assertNoHorizontalOverflow(page);

      await page.locator('#profile-open-btn').click();
      await expect(page.locator('#consultant-profile-modal')).toBeVisible();
      await assertNoHorizontalOverflow(page);
      await page.keyboard.press('Escape');

      await page.locator('#consult-open-btn').click();
      await expect(page.locator('#consult-modal')).toBeVisible();
      await assertNoHorizontalOverflow(page);
      await page.keyboard.press('Escape');

      await page.locator('#shortlist-open-btn').click();
      await expect(page.locator('#shortlist-drawer')).toBeVisible();
      await assertNoHorizontalOverflow(page);
      await page.keyboard.press('Escape');
    }
  });

  test('[T2-F20-02][F-20][EC-14] Zero horizontal overflow across all 5 stages and 3 modals on Mobile 390x844 in both AR (RTL) and EN (LTR)', async ({
    page,
  }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);

    for (const lang of ['ar', 'en'] as const) {
      const stages = [
        `/?lang=${lang}`,
        `/?lang=${lang}&stage=egypt`,
        `/?lang=${lang}&stage=governorate&gov=alexandria`,
        `/?lang=${lang}&stage=project&gov=alexandria&project=sawary&view=2d`,
        `/?lang=${lang}&stage=project&gov=alexandria&project=sawary&view=3d`,
      ];

      for (const url of stages) {
        await page.goto(url);
        await waitForAppReady(page);
        await assertNoHorizontalOverflow(page);
      }

      for (const id of ['#lang-toggle-btn', '#profile-open-btn', '#shortlist-open-btn']) {
        const box = await requireBoundingBox(page.locator(id), `Mobile topbar ${id}`);
        expect(box.x + box.width).toBeLessThanOrEqual(MOBILE_VIEWPORT.width + 2);
      }

      await page.locator('#profile-open-btn').click();
      await expect(page.locator('#consultant-profile-modal')).toBeVisible();
      await assertNoHorizontalOverflow(page);
      await page.keyboard.press('Escape');

      await page.locator('#consult-open-btn').click();
      await expect(page.locator('#consult-modal')).toBeVisible();
      await assertNoHorizontalOverflow(page);
      await page.keyboard.press('Escape');

      await page.locator('#shortlist-open-btn').click();
      await expect(page.locator('#shortlist-drawer')).toBeVisible();
      await assertNoHorizontalOverflow(page);
      await page.keyboard.press('Escape');
    }
  });

  test('[T2-F20-03][F-20] Corrupted localStorage locale recovers safely to AR RTL on bare root load and resolves conflicting ?lang= precedence', async ({
    appPage,
  }) => {
    await expect(appPage.locator('#app-shell')).toHaveAttribute('data-lang', 'ar');
    await appPage.locator('#lang-toggle-btn').click();
    await expect(appPage.locator('#app-shell')).toHaveAttribute('data-lang', 'en');

    // Corrupt locale entries via opaque-box value inspection (zero hardcoded storage key)
    await appPage.evaluate(() => {
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const key = window.localStorage.key(i);
        if (!key) continue;
        const val = (window.localStorage.getItem(key) ?? '').trim();
        if (val === 'ar' || val === 'en' || val === '"ar"' || val === '"en"' || /lang|locale/i.test(key)) {
          window.localStorage.setItem(key, 'fr-CA');
        }
      }
    });

    // Bare root navigation (no ?lang= query param) must recover cleanly to AR / RTL
    await appPage.goto('/');
    await waitForAppReady(appPage, { expectedStage: 'hero' });
    await expect(appPage.locator('#app-shell')).toHaveAttribute('data-lang', 'ar');
    await expect(appPage.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(appPage.locator('html')).toHaveAttribute('dir', 'rtl');

    // Valid URL override (?lang=en) overrides stored default
    await appPage.goto('/?lang=en&stage=egypt');
    await waitForAppReady(appPage, { expectedStage: 'egypt', waitForMap: true });
    await expect(appPage.locator('#app-shell')).toHaveAttribute('data-lang', 'en');
    await expect(appPage.locator('html')).toHaveAttribute('dir', 'ltr');

    // Unsupported URL param (?lang=xx) resolves to a valid synchronized locale without crashing
    await appPage.goto('/?lang=xx&stage=egypt');
    await waitForAppReady(appPage, { expectedStage: 'egypt', waitForMap: true });
    const resolved = await getAppShellState(appPage);
    expect(['ar', 'en']).toContain(resolved.lang);
    expect(resolved.htmlLang).toBe(resolved.lang);
    expect(resolved.htmlDir).toBe(resolved.lang === 'ar' ? 'rtl' : 'ltr');
  });

  test('[T2-F20-04][F-20] Logical CSS mirroring flips drawer docking between RTL and LTR with zero raw i18n keys', async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto('/?lang=ar&stage=governorate&gov=alexandria');
    await waitForAppReady(page, { expectedStage: 'governorate', waitForMap: true });

    const drawer = page.locator('#governorate-drawer');
    const rtlBox = await requireBoundingBox(drawer, 'RTL #governorate-drawer');
    await assertZeroRawI18nKeys(page);

    await page.locator('#lang-toggle-btn').click();
    await expect(page.locator('#app-shell')).toHaveAttribute('data-lang', 'en');
    await nextFrames(page, 3);

    const ltrBox = await requireBoundingBox(drawer, 'LTR #governorate-drawer');
    expect(Math.abs(rtlBox.x - ltrBox.x)).toBeGreaterThan(200);
    await assertZeroRawI18nKeys(page);
  });

  test('[T2-F20-05][F-20] Rapid 5x locale toggle on Project 3D view preserves exact project, mode, and selected zone', async ({
    page,
  }) => {
    await page.goto('/?lang=ar&stage=project&gov=alexandria&project=sawary&view=3d');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    const firstZone = page.locator('[id^="masterplan-zone-btn-"]').first();
    const zoneId = extractZoneId((await firstZone.getAttribute('id')) ?? '');
    await firstZone.click();

    for (let i = 0; i < 5; i += 1) {
      await page.locator('#lang-toggle-btn').click();
      await nextFrames(page, 2);
    }

    const shell = page.locator('#app-shell');
    await expect(shell).toHaveAttribute('data-lang', 'en');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(shell).toHaveAttribute('data-stage', 'project');
    await expect(shell).toHaveAttribute('data-project', 'sawary');
    await expect(shell).toHaveAttribute('data-masterplan-mode', '3d');
    await expect(shell).toHaveAttribute('data-parcel', zoneId);
  });

  // ── F-21: Full Keyboard Navigation, A11y & Reduced Motion (6) ──

  test('[T2-F21-01][F-21][EC-07] Sequential Escape presses unwind full 6-level hierarchy plus root-level Hero Escape idempotency', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=alexandria&project=sawary');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    await page.locator('[id^="masterplan-zone-btn-"]').first().click();
    await expect(page.locator('#masterplan-zone-panel')).toBeVisible();
    await page.locator('#masterplan-zone-inquire-btn').click();
    await expect(page.locator('#consult-modal')).toBeVisible();

    const shell = page.locator('#app-shell');

    // Escape #1: Close Consultation Modal
    await page.keyboard.press('Escape');
    await expect(page.locator('#consult-modal')).toBeHidden();
    await expect(page.locator('#masterplan-zone-panel')).toBeVisible();
    await expect(shell).toHaveAttribute('data-stage', 'project');

    // Escape #2: Close Zone Inspector
    await page.keyboard.press('Escape');
    await expect(page.locator('#masterplan-zone-panel')).toBeHidden();
    await expect(shell).toHaveAttribute('data-parcel', 'none');
    await expect(shell).toHaveAttribute('data-stage', 'project');

    // Escape #3: Step back to Governorate Focus
    await page.keyboard.press('Escape');
    await waitForStage(page, 'governorate');
    await expect(shell).toHaveAttribute('data-governorate', 'alexandria');
    await expect(shell).toHaveAttribute('data-project', 'none');

    // Escape #4: Step back to Egypt Overview
    await page.keyboard.press('Escape');
    await waitForStage(page, 'egypt');
    await expect(shell).toHaveAttribute('data-governorate', 'none');

    // Escape #5: Return to Hero Maquette
    await page.keyboard.press('Escape');
    await waitForStage(page, 'hero');
    await expect(shell).toHaveAttribute('data-scroll-progress', '0.00');

    // Escape #6: Extra root-level Escape at Hero 0.00 must be safely idempotent
    await page.keyboard.press('Escape');
    await nextFrames(page, 3);
    await expect(shell).toHaveAttribute('data-stage', 'hero');
    await expect(shell).toHaveAttribute('data-scroll-progress', '0.00');
    await expect(page.locator('#hero-explore-btn')).toBeEnabled();
  });

  test('[T2-F21-02][F-21] Consultation Modal traps Tab and Shift+Tab keyboard focus strictly inside dialog', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=alexandria&project=sawary');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    await page.locator('#consult-open-btn').click();
    await verifyDialogFocusTrap(page, '#consult-modal', 20);
  });

  test('[T2-F21-03][F-21] ARIA live region emits distinct localized announcements across stage transitions in AR and EN', async ({
    appPage,
  }) => {
    const live = appPage.locator('[aria-live="polite"]').first();
    await expect(live).toBeAttached();

    await appPage.locator('#hero-explore-btn').click();
    await waitForStage(appPage, 'egypt');
    await expect
      .poll(async () => ((await live.textContent()) ?? '').trim().length)
      .toBeGreaterThan(0);

    await appPage.locator('#gov-card-alexandria').click();
    await waitForStage(appPage, 'governorate');
    const govAr = ((await live.textContent()) ?? '').trim();
    expect(govAr).toMatch(/[\u0600-\u06FF]/);

    await appPage.locator('#project-card-sawary').click();
    await waitForStage(appPage, 'project');
    await expect
      .poll(async () => ((await live.textContent()) ?? '').trim())
      .not.toBe(govAr);

    // Switch to English and verify polite live announcements localize in English on stage steps
    await appPage.locator('#lang-toggle-btn').click();
    await expect(appPage.locator('#app-shell')).toHaveAttribute('data-lang', 'en');

    await appPage.locator('#breadcrumb-governorate').click();
    await waitForStage(appPage, 'governorate');
    await expect
      .poll(async () => ((await live.textContent()) ?? '').trim())
      .toMatch(/[A-Za-z]{3,}/);
    const govEn = ((await live.textContent()) ?? '').trim();

    await appPage.locator('#breadcrumb-egypt').click();
    await waitForStage(appPage, 'egypt');
    await expect
      .poll(async () => ((await live.textContent()) ?? '').trim())
      .not.toBe(govEn);
  });

  test.describe('T2-F21-04 Reduced-motion full funnel', () => {
    test.use({ reducedMotion: 'reduce' });

    test('[T2-F21-04][F-21][EC-17] Complete end-to-end journey under prefers-reduced-motion: reduce stays snappy and fully functional', async ({
      appPage,
    }) => {
      const t0 = Date.now();
      await appPage.locator('#hero-explore-btn').click();
      await waitForStage(appPage, 'egypt');
      expect(Date.now() - t0).toBeLessThan(1500);

      await appPage.locator('#gov-card-alexandria').click();
      await waitForStage(appPage, 'governorate');

      await appPage.locator('#project-card-sawary').click();
      await waitForStage(appPage, 'project');

      await appPage.locator('#masterplan-mode-3d').click();
      await waitForCameraSettled(appPage);
      await expect(appPage.locator('#app-shell')).toHaveAttribute('data-masterplan-mode', '3d');

      await appPage.locator('[id^="masterplan-zone-btn-"]').first().click();
      await expect(appPage.locator('#masterplan-zone-panel')).toBeVisible();

      await appPage.locator('#masterplan-zone-inquire-btn').click();
      await expect(appPage.locator('#consult-modal')).toBeVisible();
    });
  });

  test('[T2-F21-05][F-21] Real keyboard Tab activates visible :focus-visible ring on Hero CTA and traps focus inside Shortlist Drawer', async ({
    appPage,
  }) => {
    const heroExplore = appPage.locator('#hero-explore-btn');
    let reachedByTab = false;
    for (let i = 0; i < 20; i += 1) {
      await appPage.keyboard.press('Tab');
      if (await heroExplore.evaluate((el) => document.activeElement === el)) {
        reachedByTab = true;
        break;
      }
    }
    expect(reachedByTab, 'Expected #hero-explore-btn to be reachable via keyboard Tab').toBe(true);
    await expect(heroExplore).toBeFocused();

    const focusStyle = await heroExplore.evaluate((el) => {
      const cs = window.getComputedStyle(el);
      return {
        matchesFocusVisible: el.matches(':focus-visible'),
        outlineStyle: cs.outlineStyle,
        outlineWidth: cs.outlineWidth,
        boxShadow: cs.boxShadow,
      };
    });
    expect(focusStyle.matchesFocusVisible).toBe(true);
    expect(
      (focusStyle.outlineStyle !== 'none' && focusStyle.outlineWidth !== '0px') ||
        focusStyle.boxShadow !== 'none',
      `Expected visible :focus-visible ring on #hero-explore-btn, got ${JSON.stringify(focusStyle)}`,
    ).toBe(true);

    // Verify TopBar #shortlist-open-btn opens Shortlist Drawer with focus trap & restoration
    await appPage.locator('#shortlist-open-btn').focus();
    await appPage.keyboard.press('Enter');
    await verifyDialogFocusTrap(appPage, '#shortlist-drawer', 10);
    await appPage.keyboard.press('Escape');
    await expect(appPage.locator('#shortlist-drawer')).toBeHidden();
    const restoredId = await appPage.evaluate(() => document.activeElement?.id ?? '');
    expect(restoredId).toBe('shortlist-open-btn');
  });

  test('[T2-F21-06][F-21] Landmark and accessible-name audit finds zero unlabeled visible buttons or unlabeled dialogs', async ({
    page,
  }) => {
    const urls = [
      '/',
      '/?stage=egypt',
      '/?stage=governorate&gov=alexandria',
      '/?stage=project&gov=alexandria&project=sawary',
    ];

    for (const url of urls) {
      await page.goto(url);
      await waitForAppReady(page);

      const unlabeled = await page.evaluate(() => {
        const bad: string[] = [];
        const controls = Array.from(document.querySelectorAll<HTMLElement>('button, a'));
        for (const el of controls) {
          const cs = window.getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden') continue;
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;

          const text = (el.innerText ?? '').trim();
          const ariaLabel = (el.getAttribute('aria-label') ?? '').trim();
          const ariaLabelledBy = (el.getAttribute('aria-labelledby') ?? '').trim();
          const title = (el.getAttribute('title') ?? '').trim();
          if (!text && !ariaLabel && !ariaLabelledBy && !title) {
            bad.push(`${el.tagName.toLowerCase()}#${el.id || '<no-id>'}`);
          }
        }
        return bad;
      });
      expect(unlabeled, `Unlabeled controls on ${url}: ${unlabeled.join(', ')}`).toEqual([]);
    }

    await page.locator('#profile-open-btn').click();
    const dialogNamed = await page.locator('#consultant-profile-modal').evaluate((el) => {
      return Boolean(el.getAttribute('aria-label') || el.getAttribute('aria-labelledby'));
    });
    expect(dialogNamed).toBe(true);
  });

  // ── F-22: Single-File Owner & Project Catalog Customization (5) ──

  test('[T2-F22-01][F-22][EC-18] Catalog integrity audit verifies exact 8+3+3+3+3+2 = 22 unique projects across all 6 governorates', async ({
    page,
  }) => {
    const unique = new Set<string>();
    const expectedTotal = 22;

    for (const govId of GOVERNORATE_IDS) {
      await page.goto(`/?stage=governorate&gov=${govId}`);
      await waitForAppReady(page, { expectedStage: 'governorate', waitForMap: true });

      const rendered = await page
        .locator('#governorate-drawer [id^="project-card-"]')
        .evaluateAll((els) => els.map((el) => el.id.replace(/^project-card-/, '')));

      const expected = PROJECTS_BY_GOVERNORATE[govId];
      expect(rendered).toHaveLength(expected.length);
      for (const slug of expected) {
        expect(rendered).toContain(slug);
        expect(unique.has(slug), `Duplicate project slug "${slug}"`).toBe(false);
        unique.add(slug);
      }
    }

    expect(unique.size).toBe(expectedTotal);
  });

  test('[T2-F22-02][F-22][EC-18] One boundary project per governorate renders >=5 clickable zones, valid scale bar, and zero raw i18n keys in AR/EN', async ({
    page,
  }) => {
    const boundarySamples: Array<[GovernorateId, string]> = [
      ['alexandria', 'san-stefano'],
      ['matrouh', 'north-edge-alamein'],
      ['cairo', 'bloomfields'],
      ['giza', 'o-west'],
      ['red-sea', 'el-gouna'],
      ['suez', 'il-monte-galala'],
    ];

    for (const [gov, project] of boundarySamples) {
      await page.goto(`/?lang=ar&stage=project&gov=${gov}&project=${project}`);
      await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

      const zoneCount = await page.locator('[id^="masterplan-zone-btn-"]').count();
      expect(zoneCount, `${project} must have >= 5 clickable zones`).toBeGreaterThanOrEqual(5);

      await selectZoneAndResolveLabel(page, 0);
      const scaleAr = normalizeDigits((await page.locator('#masterplan-scale-bar').textContent()) ?? '');
      expect(scaleAr).toMatch(/[1-9]\d*/);
      await assertZeroRawI18nKeys(page, '#project-inspector');
      await assertZeroRawI18nKeys(page, '#masterplan-zone-panel');

      await page.locator('#lang-toggle-btn').click();
      await expect(page.locator('#app-shell')).toHaveAttribute('data-lang', 'en');
      await assertZeroRawI18nKeys(page, '#project-inspector');
      await assertZeroRawI18nKeys(page, '#masterplan-zone-panel');
    }
  });

  test('[T2-F22-03][F-22][EC-18] Complete offline mode (context.setOffline(true)) runs full Hero-to-Consultation funnel with zero errors', async ({
    page,
    context,
  }) => {
    await enterOfflineAfterLocalBoot(page, context, '/', { expectedStage: 'hero' });

    try {
      await page.locator('#hero-explore-btn').click();
      await waitForStage(page, 'egypt');
      const state = await getAppShellState(page);
      expect(['offline-vector', 'svg-fallback']).toContain(state.mapTiles);

      await page.locator('#gov-card-alexandria').click();
      await waitForStage(page, 'governorate');

      await page.locator('#project-card-sawary').click();
      await waitForStage(page, 'project');

      await page.locator('#masterplan-mode-3d').click();
      await waitForCameraSettled(page);

      await page.locator('[id^="masterplan-zone-btn-"]').first().click();
      await expect(page.locator('#masterplan-zone-panel')).toBeVisible();

      await page.locator('#masterplan-zone-inquire-btn').click();
      const result = await submitValidConsultation(page, {
        name: 'وليد سامح',
        phone: '01280249440',
      });
      expect(result.referenceId).toMatch(REFERENCE_ID_REGEX);
    } finally {
      await context.setOffline(false);
    }
  });

  test('[T2-F22-04][F-22] External tile and font endpoint outage (503/abort) degrades silently without hanging or crashing', async ({
    appPage,
  }) => {
    // blockExternal: true aborts tiles.openfreemap.org & fonts.googleapis.com
    await appPage.locator('#hero-explore-btn').click();
    await waitForStage(appPage, 'egypt');
    const state = await getAppShellState(appPage);
    expect(['offline-vector', 'svg-fallback']).toContain(state.mapTiles);

    await appPage.locator('#gov-card-alexandria').click();
    await waitForStage(appPage, 'governorate');

    await appPage.locator('#project-card-sawary').click();
    await waitForStage(appPage, 'project');

    const titleVisible = await appPage.locator('#project-inspector').isVisible();
    expect(titleVisible).toBe(true);
  });

  test('[T2-F22-05][F-22] Negative placeholder sweep confirms real consultant identity, photo, and zero template leaks across all stages and overlays', async ({
    appPage,
  }) => {
    const forbiddenLeaksRe =
      /01000000000|201000000000|example\.com|John\s+Doe|Lorem\s+ipsum|\bTBD\b|\bTODO\b/i;

    const assertNoLeaks = async (surfaceLabel: string): Promise<void> => {
      const bodyText = (await appPage.locator('body').innerText()) ?? '';
      expect(bodyText, `Placeholder/template leak detected on ${surfaceLabel}`).not.toMatch(
        forbiddenLeaksRe,
      );
    };

    // Hero AR
    await expect(appPage.locator('#app-shell')).toContainText(CONSULTANT_NAME_AR_REGEX);
    await expect(appPage.locator('#app-shell')).toContainText(CONSULTANT_TITLE_AR_REGEX);
    await assertNoBrokenImages(appPage, '#app-shell');
    await assertNoLeaks('Hero AR');

    // Profile Modal AR
    await appPage.locator('#hero-about-btn').click();
    const profileModal = appPage.locator('#consultant-profile-modal');
    await expect(profileModal).toBeVisible();
    await assertConsultantPhotoLoaded(appPage, '#consultant-profile-modal');
    await expect(profileModal).toContainText(CONSULTANT_NAME_AR_REGEX);
    await expect(profileModal).toContainText(CONSULTANT_TITLE_AR_REGEX);
    const profileWa = await assertSafeWhatsAppLink(profileModal.locator('a[href*="wa.me"]').first());
    expect(profileWa.href).not.toMatch(forbiddenLeaksRe);
    await assertNoLeaks('Profile Modal AR');
    await appPage.keyboard.press('Escape');

    // Egypt + Governorate + Project EN + Overlays
    for (const [label, url] of [
      ['Egypt EN', '/?lang=en&stage=egypt'],
      ['Governorate EN', '/?lang=en&stage=governorate&gov=alexandria'],
      ['Project EN', '/?lang=en&stage=project&gov=alexandria&project=sawary'],
    ] as const) {
      await appPage.goto(url);
      await waitForAppReady(appPage);
      await assertNoLeaks(label);
    }

    await appPage.locator('#profile-open-btn').click();
    await expect(profileModal).toContainText(CONSULTANT_NAME_EN_REGEX);
    await expect(profileModal).toContainText(CONSULTANT_TITLE_EN_REGEX);
    await assertNoLeaks('Profile Modal EN');
    await appPage.keyboard.press('Escape');

    await appPage.locator('#shortlist-open-btn').click();
    await expect(appPage.locator('#shortlist-drawer')).toBeVisible();
    await assertNoLeaks('Shortlist Drawer EN');
    await appPage.keyboard.press('Escape');

    const res = await submitValidConsultation(appPage, {
      name: 'Hany Nabil',
      phone: '01012345678',
    });
    expect(res.whatsappHref).toContain(CONSULTANT_WHATSAPP_DIGITS);
    expect(res.whatsappHref).not.toMatch(forbiddenLeaksRe);
    await assertNoLeaks('Consultation Receipt EN');
  });
});
