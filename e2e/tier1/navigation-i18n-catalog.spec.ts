import { test, expect } from '../fixtures';
import {
  ALEXANDRIA_PROJECT_IDS,
  ALL_PROJECT_IDS,
  CONSULTANT_NAME_AR_REGEX,
  CONSULTANT_NAME_EN_REGEX,
  CONSULTANT_TITLE_AR_REGEX,
  CONSULTANT_TITLE_EN_REGEX,
  CONSULTANT_WHATSAPP_DIGITS,
  GOVERNORATE_IDS,
  MOBILE_VIEWPORT,
  assertConsultantPhotoLoaded,
  assertNoBrokenImages,
  assertSafeWhatsAppLink,
  assertTapTargetSize,
  assertValidMailtoLink,
  assertZeroRawI18nKeys,
  countVisibleMapPins,
  getAppShellState,
  nextFrames,
  normalizeDigits,
  requireBoundingBox,
  submitValidConsultation,
  waitForAppReady,
  waitForCameraSettled,
  waitForStage,
} from '../helpers';

test.describe('Tier 1 — Spatial Navigation, Bilingual i18n, A11y & Catalog Integrity (F-19..F-22)', () => {
  // ── F-19: Spatial Breadcrumb Trail & History Deep-Linking ──

  test('[T1-19.1][F-19] Renders progressive spatial breadcrumbs and navigates cleanly back on parent click', async ({
    appPage,
  }) => {
    await appPage.locator('#hero-explore-btn').click();
    await waitForStage(appPage, 'egypt');
    await expect(appPage.locator('#breadcrumb-hero')).toBeVisible();
    await expect(appPage.locator('#breadcrumb-egypt')).toBeVisible();

    await appPage.locator('#gov-card-alexandria').click();
    await waitForStage(appPage, 'governorate');
    await expect(appPage.locator('#breadcrumb-governorate')).toBeVisible();

    await appPage.locator('#project-card-sawary').click();
    await waitForStage(appPage, 'project');
    await expect(appPage.locator('#breadcrumb-project')).toBeVisible();

    await appPage.locator('#breadcrumb-governorate').click();
    await waitForStage(appPage, 'governorate');
    await expect(appPage.locator('#app-shell')).toHaveAttribute('data-project', 'none');

    await appPage.locator('#breadcrumb-egypt').click();
    await waitForStage(appPage, 'egypt');
    await expect(appPage.locator('#app-shell')).toHaveAttribute('data-governorate', 'none');

    await appPage.locator('#breadcrumb-hero').click();
    await waitForStage(appPage, 'hero');
    await expect(appPage.locator('#app-shell')).toHaveAttribute('data-scroll-progress', '0.00');
  });

  test('[T1-19.2][F-19] Synchronizes URL query params (?lang=&stage=&gov=&project=&view=) on SPA navigation', async ({
    appPage,
  }) => {
    await appPage.locator('#hero-explore-btn').click();
    await waitForStage(appPage, 'egypt');

    await appPage.locator('#gov-card-alexandria').click();
    await waitForStage(appPage, 'governorate');

    await appPage.locator('#project-card-sawary').click();
    await waitForStage(appPage, 'project');

    await appPage.locator('#masterplan-mode-3d').click();
    await waitForCameraSettled(appPage);

    await appPage.locator('#lang-toggle-btn').click();
    await expect(appPage.locator('#app-shell')).toHaveAttribute('data-lang', 'en');

    const params = new URL(appPage.url()).searchParams;
    expect(params.get('lang')).toBe('en');
    expect(params.get('gov')).toBe('alexandria');
    expect(params.get('project')).toBe('sawary');
    expect(params.get('view')).toBe('3d');
  });

  test('[T1-19.3][F-19] Hydrates directly into deep-linked English 3D Master Plan on cold page load', async ({
    page,
  }) => {
    await page.goto('/?lang=en&gov=alexandria&project=san-stefano&view=3d');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    const state = await getAppShellState(page);
    expect(state.lang).toBe('en');
    expect(state.htmlLang).toBe('en');
    expect(state.htmlDir).toBe('ltr');
    expect(state.stage).toBe('project');
    expect(state.governorate).toBe('alexandria');
    expect(state.project).toBe('san-stefano');
    expect(state.masterplanMode).toBe('3d');
  });

  test('[T1-19.4][F-19] Supports Browser Back and Forward across Hero, Egypt, Governorate, and Project', async ({
    appPage,
  }) => {
    await appPage.locator('#hero-explore-btn').click();
    await waitForStage(appPage, 'egypt');

    await appPage.locator('#gov-card-matrouh').click();
    await waitForStage(appPage, 'governorate');

    await appPage.locator('#project-card-marassi').click();
    await waitForStage(appPage, 'project');

    await appPage.goBack();
    await waitForStage(appPage, 'governorate');
    await expect(appPage.locator('#app-shell')).toHaveAttribute('data-governorate', 'matrouh');

    await appPage.goBack();
    await waitForStage(appPage, 'egypt');

    await appPage.goBack();
    await waitForStage(appPage, 'hero');

    await appPage.goForward();
    await waitForStage(appPage, 'egypt');

    await appPage.goForward();
    await waitForStage(appPage, 'governorate');
    await expect(appPage.locator('#app-shell')).toHaveAttribute('data-governorate', 'matrouh');
  });

  test('[T1-19.5][F-19] Breadcrumb trail updates live on sibling navigation, translates AR -> EN, and collapses on Egypt return', async ({
    page,
  }) => {
    await page.goto('/?lang=ar&stage=project&gov=alexandria&project=sawary');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    await expect(page.locator('#breadcrumb-hero')).toBeVisible();
    await expect(page.locator('#breadcrumb-egypt')).toBeVisible();
    await expect(page.locator('#breadcrumb-governorate')).toContainText(/الإسكندرية/);
    await expect(page.locator('#breadcrumb-project')).toContainText(/صواري/);

    await page.locator('#project-next-btn').click();
    await waitForCameraSettled(page);
    await expect(page.locator('#app-shell')).not.toHaveAttribute('data-project', 'sawary');
    await expect(page.locator('#breadcrumb-governorate')).toContainText(/الإسكندرية/);
    await expect(page.locator('#breadcrumb-project')).not.toContainText(/صواري/);

    await page.locator('#lang-toggle-btn').click();
    await expect(page.locator('#app-shell')).toHaveAttribute('data-lang', 'en');
    await expect(page.locator('#breadcrumb-governorate')).toContainText(/Alexandria/i);
    await expect(page.locator('#breadcrumb-project')).toContainText(/[A-Za-z]{3,}/);

    await page.locator('#breadcrumb-egypt').click();
    await waitForStage(page, 'egypt');
    await expect(page.locator('#breadcrumb-governorate')).toBeHidden();
    await expect(page.locator('#breadcrumb-project')).toBeHidden();
  });

  // ── F-20: Bilingual Arabic (RTL Primary) & English (LTR) Toggle ──

  test('[T1-20.1][F-20] Defaults to Arabic RTL (<html lang="ar" dir="rtl">) on clean session', async ({
    page,
  }) => {
    await page.goto('/');
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    await waitForAppReady(page, { expectedStage: 'hero' });

    const state = await getAppShellState(page);
    expect(state.lang).toBe('ar');
    expect(state.htmlLang).toBe('ar');
    expect(state.htmlDir).toBe('rtl');
    await expect(page.locator('#app-shell')).toContainText(CONSULTANT_NAME_AR_REGEX);
  });

  test('[T1-20.2][F-20] Toggles instantly AR <-> EN without reload or losing active project stage', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=alexandria&project=sawary');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    await expect(page.locator('#project-inspector')).toContainText('صواري');

    await page.locator('#lang-toggle-btn').click();
    await expect(page.locator('#app-shell')).toHaveAttribute('data-lang', 'en');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.locator('#app-shell')).toHaveAttribute('data-project', 'sawary');
    await expect(page.locator('#project-inspector')).toContainText(/Sawary/i);

    await page.locator('#lang-toggle-btn').click();
    await expect(page.locator('#app-shell')).toHaveAttribute('data-lang', 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('#app-shell')).toHaveAttribute('data-project', 'sawary');
    await expect(page.locator('#project-inspector')).toContainText('صواري');
  });

  test('[T1-20.3][F-20] Persists locale preference in localStorage on bare root load and honors explicit ?lang= URL override', async ({
    appPage,
  }) => {
    await appPage.locator('#lang-toggle-btn').click();
    await expect(appPage.locator('#app-shell')).toHaveAttribute('data-lang', 'en');

    // Bare root navigation (zero ?lang= query param) proves genuine localStorage persistence
    await appPage.goto('/');
    await waitForAppReady(appPage, { expectedStage: 'hero' });
    await expect(appPage.locator('#app-shell')).toHaveAttribute('data-lang', 'en');
    await expect(appPage.locator('html')).toHaveAttribute('lang', 'en');
    await expect(appPage.locator('html')).toHaveAttribute('dir', 'ltr');

    await appPage.goto('/?lang=ar');
    await waitForAppReady(appPage, { expectedStage: 'hero' });
    await expect(appPage.locator('#app-shell')).toHaveAttribute('data-lang', 'ar');
    await expect(appPage.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(appPage.locator('html')).toHaveAttribute('dir', 'rtl');
  });

  test('[T1-20.4][F-20] Synchronizes html lang/dir, enforces zero Arabic letter-spacing across headings, and updates toggle label', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForAppReady(page, { expectedStage: 'hero' });

    const toggleBtn = page.locator('#lang-toggle-btn');
    const arToggleLabel = ((await toggleBtn.textContent()) ?? '').trim();
    expect(arToggleLabel.length).toBeGreaterThanOrEqual(2);

    const heroLetterSpacing = await page
      .locator('h1:visible')
      .first()
      .evaluate((el) => window.getComputedStyle(el).letterSpacing);
    expect(['normal', '0px']).toContain(heroLetterSpacing);

    await page.goto('/?stage=project&gov=alexandria&project=sawary');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    const inspectorHeadingSpacing = await page
      .locator('#project-inspector h1, #project-inspector h2, #project-inspector h3')
      .first()
      .evaluate((el) => window.getComputedStyle(el).letterSpacing);
    expect(['normal', '0px']).toContain(inspectorHeadingSpacing);

    await toggleBtn.click();
    await expect(page.locator('#app-shell')).toHaveAttribute('data-lang', 'en');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    const enToggleLabel = ((await toggleBtn.textContent()) ?? '').trim();
    expect(enToggleLabel).not.toBe(arToggleLabel);
  });

  test('[T1-20.5][F-20] Renders zero raw i18n dot-keys, TODOs, or undefined strings across all stages in AR and EN', async ({
    page,
  }) => {
    for (const lang of ['ar', 'en'] as const) {
      for (const url of [
        `/?lang=${lang}`,
        `/?lang=${lang}&stage=egypt`,
        `/?lang=${lang}&stage=governorate&gov=alexandria`,
        `/?lang=${lang}&stage=project&gov=alexandria&project=sawary`,
      ]) {
        await page.goto(url);
        await waitForAppReady(page);
        await assertZeroRawI18nKeys(page);
      }

      await page.locator('#profile-open-btn').click();
      await expect(page.locator('#consultant-profile-modal')).toBeVisible();
      await assertZeroRawI18nKeys(page, '#consultant-profile-modal');
      await page.keyboard.press('Escape');

      await page.locator('#consult-open-btn').click();
      await expect(page.locator('#consult-modal')).toBeVisible();
      await assertZeroRawI18nKeys(page, '#consult-modal');
      await page.keyboard.press('Escape');
    }
  });

  // ── F-21: Full Keyboard Navigation, A11y & Reduced Motion ──

  test('[T1-21.1][F-21] Escape dismisses Shortlist Drawer and Profile Modal cleanly while preserving Governorate stage and keyboard flow', async ({
    page,
  }) => {
    await page.goto('/?stage=governorate&gov=alexandria');
    await waitForAppReady(page, { expectedStage: 'governorate', waitForMap: true });

    const shell = page.locator('#app-shell');

    await page.locator('#shortlist-open-btn').click();
    await expect(page.locator('#shortlist-drawer')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#shortlist-drawer')).toBeHidden();
    await expect(shell).toHaveAttribute('data-stage', 'governorate');
    await expect(shell).toHaveAttribute('data-governorate', 'alexandria');

    await page.locator('#profile-open-btn').click();
    await expect(page.locator('#consultant-profile-modal')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#consultant-profile-modal')).toBeHidden();
    await expect(shell).toHaveAttribute('data-stage', 'governorate');
    await expect(shell).toHaveAttribute('data-governorate', 'alexandria');

    await page.locator('#project-card-sawary').focus();
    await page.keyboard.press('Enter');
    await waitForStage(page, 'project');
    await expect(shell).toHaveAttribute('data-project', 'sawary');
  });

  test('[T1-21.2][F-21] Supports complete keyboard-only Tab + Enter/Space journey through primary controls', async ({
    appPage,
  }) => {
    await appPage.locator('#hero-explore-btn').focus();
    await expect(appPage.locator('#hero-explore-btn')).toBeFocused();
    await appPage.keyboard.press('Enter');
    await waitForStage(appPage, 'egypt');

    await appPage.locator('#gov-card-alexandria').focus();
    await appPage.keyboard.press('Enter');
    await waitForStage(appPage, 'governorate');

    await appPage.locator('#project-card-sawary').focus();
    await appPage.keyboard.press('Enter');
    await waitForStage(appPage, 'project');

    await expect(appPage.locator('#app-shell')).toHaveAttribute('data-project', 'sawary');
  });

  test('[T1-21.3][F-21] All three modal overlays expose valid ARIA dialog roles, aria-modal, and accessible names', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=alexandria&project=sawary');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    const overlays: Array<{ trigger: string; dialog: string }> = [
      { trigger: '#profile-open-btn', dialog: '#consultant-profile-modal' },
      { trigger: '#consult-open-btn', dialog: '#consult-modal' },
      { trigger: '#shortlist-open-btn', dialog: '#shortlist-drawer' },
    ];

    for (const overlay of overlays) {
      await page.locator(overlay.trigger).click();
      const dialog = page.locator(overlay.dialog);
      await expect(dialog).toBeVisible();
      await expect(dialog).toHaveAttribute('role', 'dialog');
      await expect(dialog).toHaveAttribute('aria-modal', 'true');
      const hasAccessibleName = await dialog.evaluate((el) =>
        Boolean(el.getAttribute('aria-label') || el.getAttribute('aria-labelledby')),
      );
      expect(hasAccessibleName, `${overlay.dialog} must expose aria-label or aria-labelledby`).toBe(
        true,
      );
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
    }
  });

  test('[T1-21.4][F-21] Reacts dynamically when prefers-reduced-motion toggles mid-session between no-preference and reduce', async ({
    appPage,
  }) => {
    const initialReduced = await appPage.evaluate(
      () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    );
    expect(initialReduced).toBe(false);

    // Enable reduced motion live mid-session without page reload
    await appPage.emulateMedia({ reducedMotion: 'reduce' });
    await nextFrames(appPage, 2);
    const activeReduced = await appPage.evaluate(
      () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    );
    expect(activeReduced).toBe(true);

    const tDive = Date.now();
    await appPage.locator('#hero-explore-btn').click();
    await waitForStage(appPage, 'egypt');
    expect(Date.now() - tDive).toBeLessThan(1500);

    const tGov = Date.now();
    await appPage.locator('#gov-card-matrouh').click();
    await waitForStage(appPage, 'governorate');
    expect(Date.now() - tGov).toBeLessThan(1500);

    await appPage.locator('#project-card-marassi').click();
    await waitForStage(appPage, 'project');
    await expect(appPage.locator('#app-shell')).toHaveAttribute('data-project', 'marassi');

    // Restore standard motion mid-session and confirm clean return to Hero
    await appPage.emulateMedia({ reducedMotion: 'no-preference' });
    await nextFrames(appPage, 2);
    await appPage.locator('#breadcrumb-hero').click();
    await waitForStage(appPage, 'hero');
    await expect(appPage.locator('#app-shell')).toHaveAttribute('data-scroll-progress', '0.00');
  });

  test.describe('F-21 Mobile tap targets', () => {
    test.use({ viewport: MOBILE_VIEWPORT, hasTouch: true, isMobile: true });

    test('[T1-21.5][F-21] Meets mobile >= 44x44px ergonomic touch-target minimum on primary actions', async ({
      appPage,
    }) => {
      await assertTapTargetSize(appPage.locator('#hero-explore-btn'), 44);
      await assertTapTargetSize(appPage.locator('#lang-toggle-btn'), 44);
      await assertTapTargetSize(appPage.locator('#profile-open-btn'), 44);
      await assertTapTargetSize(appPage.locator('#shortlist-open-btn'), 44);

      await appPage.goto('/?stage=project&gov=alexandria&project=sawary');
      await waitForAppReady(appPage, { expectedStage: 'project', waitForMap: true });

      await assertTapTargetSize(appPage.locator('#masterplan-mode-2d'), 44);
      await assertTapTargetSize(appPage.locator('#masterplan-mode-3d'), 44);

      await appPage.locator('#consult-open-btn').click();
      await expect(appPage.locator('#consult-modal')).toBeVisible();
      await assertTapTargetSize(appPage.locator('#consult-submit-btn'), 44);
    });
  });

  // ── F-22: Single-File Owner & Project Catalog Customization ──

  test('[T1-22.1][F-22] Egypt Overview renders all 6 governorate cards/markers and all 22 accessible project beacons simultaneously', async ({
    page,
  }) => {
    await page.goto('/?stage=egypt');
    await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });

    for (const govId of GOVERNORATE_IDS) {
      await expect(page.locator(`#gov-card-${govId}`)).toBeVisible();
      await expect(page.locator(`#gov-marker-${govId}`)).toBeAttached();
    }

    expect(await countVisibleMapPins(page)).toBe(ALL_PROJECT_IDS.length);

    for (const projectId of ALL_PROJECT_IDS) {
      const pin = page.locator(`#map-pin-${projectId}`);
      await expect(pin).toBeVisible();
      const accessibleName = await pin.evaluate(
        (el) =>
          (el.getAttribute('aria-label') ?? el.getAttribute('title') ?? el.textContent ?? '').trim(),
      );
      expect(
        accessibleName.length,
        `#map-pin-${projectId} must expose a non-empty accessible name`,
      ).toBeGreaterThan(1);
    }
  });

  test('[T1-22.2][F-22] Complete bilingual AR/EN catalog parity across all 6 governorates and 22 projects', async ({
    page,
  }) => {
    for (const govId of GOVERNORATE_IDS) {
      await page.goto(`/?lang=ar&stage=governorate&gov=${govId}`);
      await waitForAppReady(page, { expectedStage: 'governorate', waitForMap: true });
      const arMap = await page
        .locator('#governorate-drawer [id^="project-card-"]')
        .evaluateAll((els) =>
          els.map((el) => ({ id: el.id, text: (el.textContent ?? '').trim() })),
        );

      await page.locator('#lang-toggle-btn').click();
      await expect(page.locator('#app-shell')).toHaveAttribute('data-lang', 'en');
      await nextFrames(page, 2);

      const enMap = await page
        .locator('#governorate-drawer [id^="project-card-"]')
        .evaluateAll((els) =>
          els.map((el) => ({ id: el.id, text: (el.textContent ?? '').trim() })),
        );

      expect(enMap).toHaveLength(arMap.length);
      for (let i = 0; i < arMap.length; i += 1) {
        const arText = arMap[i]?.text ?? '';
        const enText = enMap[i]?.text ?? '';
        expect(arText.length).toBeGreaterThan(4);
        expect(enText.length).toBeGreaterThan(4);
        expect(arText).toMatch(/[\u0600-\u06FF]/);
        expect(enText).toMatch(/[A-Za-z]{3,}/);
        expect(arText).not.toBe(enText);
      }
    }
  });

  test('[T1-22.3][F-22] Consultant profile identity, title, real photo, and contact channels propagate consistently across surfaces', async ({
    appPage,
  }) => {
    await expect(appPage.locator('#app-shell')).toContainText(CONSULTANT_NAME_AR_REGEX);
    await expect(appPage.locator('#app-shell')).toContainText(CONSULTANT_TITLE_AR_REGEX);
    await assertNoBrokenImages(appPage, '#app-shell');

    await appPage.locator('#hero-about-btn').click();
    const profileModal = appPage.locator('#consultant-profile-modal');
    await expect(profileModal).toBeVisible();
    await assertConsultantPhotoLoaded(appPage, '#consultant-profile-modal');
    await expect(profileModal).toContainText(CONSULTANT_NAME_AR_REGEX);
    await expect(profileModal).toContainText(CONSULTANT_TITLE_AR_REGEX);
    await assertValidMailtoLink(profileModal.locator('a[href^="mailto:"]').first());
    await assertSafeWhatsAppLink(profileModal.locator('a[href*="wa.me"]').first());
    await appPage.keyboard.press('Escape');

    await appPage.goto('/?lang=en&stage=project&gov=alexandria&project=sawary');
    await waitForAppReady(appPage, { expectedStage: 'project', waitForMap: true });
    await assertSafeWhatsAppLink(appPage.locator('#project-inspector a[href*="wa.me"]').first());

    await appPage.locator('#profile-open-btn').click();
    await expect(profileModal).toContainText(CONSULTANT_NAME_EN_REGEX);
    await expect(profileModal).toContainText(CONSULTANT_TITLE_EN_REGEX);
    await appPage.keyboard.press('Escape');

    const result = await submitValidConsultation(appPage, {
      name: 'Mostafa Hassan',
      phone: '01012345678',
    });
    expect(result.whatsappHref).toContain(CONSULTANT_WHATSAPP_DIGITS);
  });

  test('[T1-22.4][F-22] Distinct per-project Master Plan zone blueprints render uniquely across sampled flagship projects', async ({
    page,
  }) => {
    const samples: Array<[string, string]> = [
      ['alexandria', 'sawary'],
      ['alexandria', 'creeks-alex'],
      ['giza', 'zed-west'],
      ['suez', 'il-monte-galala'],
    ];

    const signatures: string[] = [];
    for (const [gov, project] of samples) {
      await page.goto(`/?stage=project&gov=${gov}&project=${project}`);
      await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

      const zoneLabels = await page
        .locator('[id^="masterplan-zone-btn-"]')
        .evaluateAll((els) =>
          els.map((el) => (el.textContent ?? el.getAttribute('aria-label') ?? '').trim()),
        );
      expect(zoneLabels.length).toBeGreaterThanOrEqual(5);
      expect(zoneLabels.length).toBeLessThanOrEqual(8);
      signatures.push(zoneLabels.join('|'));
    }

    expect(new Set(signatures).size).toBe(samples.length);
  });

  test('[T1-22.5][F-22] Verified developer and feddan land-area catalog metadata renders accurately on flagship compounds', async ({
    page,
  }) => {
    const checks: Array<{
      gov: string;
      project: string;
      areaRe: RegExp;
      devArRe: RegExp;
      devEnRe: RegExp;
    }> = [
      {
        gov: 'alexandria',
        project: 'sawary',
        areaRe: /417/,
        devArRe: /السعودية المصرية/,
        devEnRe: /Saudi Egyptian|SED/i,
      },
      {
        gov: 'alexandria',
        project: 'alex-west',
        areaRe: /620/,
        devArRe: /بارونز كورت/,
        devEnRe: /Barons Court/i,
      },
      {
        gov: 'cairo',
        project: 'madinaty',
        areaRe: /8,?000/,
        devArRe: /طلعت مصطفى/,
        devEnRe: /Talaat Moustafa|TMG/i,
      },
      {
        gov: 'red-sea',
        project: 'el-gouna',
        areaRe: /8,?785/,
        devArRe: /أوراسكوم/,
        devEnRe: /Orascom/i,
      },
    ];

    for (const c of checks) {
      await page.goto(`/?lang=ar&stage=project&gov=${c.gov}&project=${c.project}`);
      await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });
      const arText = normalizeDigits((await page.locator('#project-inspector').textContent()) ?? '');
      expect(arText).toMatch(c.areaRe);
      expect(arText).toMatch(c.devArRe);

      await page.locator('#lang-toggle-btn').click();
      await expect(page.locator('#app-shell')).toHaveAttribute('data-lang', 'en');
      const enText = normalizeDigits((await page.locator('#project-inspector').textContent()) ?? '');
      expect(enText).toMatch(c.areaRe);
      expect(enText).toMatch(c.devEnRe);
    }
  });

  test('[T1-22.6][F-22] Spatial projection integrity: Alexandria 8 project map pins render at distinct non-collapsed screen coordinates', async ({
    page,
  }) => {
    await page.goto('/?stage=governorate&gov=alexandria');
    await waitForAppReady(page, { expectedStage: 'governorate', waitForMap: true });
    await waitForCameraSettled(page);

    const coords = new Set<string>();
    for (const id of ALEXANDRIA_PROJECT_IDS) {
      const pin = page.locator(`#map-pin-${id}`);
      const box = await requireBoundingBox(pin, `#map-pin-${id}`);
      const cx = Math.round(box.x + box.width / 2);
      const cy = Math.round(box.y + box.height / 2);
      expect(cx).toBeGreaterThan(0);
      expect(cy).toBeGreaterThan(0);
      coords.add(`${cx},${cy}`);
    }

    expect(coords.size).toBe(ALEXANDRIA_PROJECT_IDS.length);
  });
});
