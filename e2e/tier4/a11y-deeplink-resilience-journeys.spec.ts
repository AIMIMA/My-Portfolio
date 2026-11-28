import { test, expect } from '../fixtures';
import {
  CONSULTANT_ASSET_URL_REGEX,
  CONSULTANT_NAME_AR_REGEX,
  CONSULTANT_WHATSAPP_DIGITS,
  assertNoBrokenImages,
  assertNonBlankCanvas,
  getAppShellState,
  normalizeDigits,
  submitValidConsultation,
  waitForAppReady,
  waitForCameraSettled,
  waitForStage,
} from '../helpers';

test.describe('Tier 4 — Real-World Persona Scenarios: A11y, Deep-Links, Offline & WebGL Fallback (S-09..S-12)', () => {
  test.describe('S-09 Keyboard-only user under Reduced Motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('[S-09] Keyboard-Only Accessibility User Completing Full Funnel Under Reduced Motion', async ({
      appPage,
    }) => {
      // 1. Keyboard Hero -> Egypt -> Alexandria -> Sawary
      await appPage.locator('#hero-explore-btn').focus();
      await appPage.keyboard.press('Enter');
      await waitForStage(appPage, 'egypt');

      await appPage.locator('#gov-card-alexandria').focus();
      await appPage.keyboard.press('Enter');
      await waitForStage(appPage, 'governorate');

      await appPage.locator('#project-card-sawary').focus();
      await appPage.keyboard.press('Enter');
      await waitForStage(appPage, 'project');

      // 2. Keyboard zone selection -> zone inquiry modal -> keyboard submit
      await appPage.locator('[id^="masterplan-zone-btn-"]').first().focus();
      await appPage.keyboard.press('Enter');
      await expect(appPage.locator('#masterplan-zone-panel')).toBeVisible();

      await appPage.locator('#masterplan-zone-inquire-btn').focus();
      await appPage.keyboard.press('Enter');
      await expect(appPage.locator('#consult-modal')).toBeVisible();

      await appPage.locator('#consult-name').focus();
      await appPage.keyboard.type('إبراهيم الشريف');
      await appPage.locator('#consult-phone').focus();
      await appPage.keyboard.type('01112345678');
      await appPage.locator('#consult-submit-btn').focus();
      await appPage.keyboard.press('Enter');

      await expect(appPage.locator('#consult-confirmation')).toBeVisible();
      const refId = ((await appPage.locator('#consult-reference-id').textContent()) ?? '').trim();
      expect(refId).toMatch(/^REQ-20\d{2}-[A-Z0-9]{4,}$/);

      // 3. Sequential 5-level Escape unwind back to Hero 0.00
      await appPage.keyboard.press('Escape');
      await expect(appPage.locator('#consult-modal')).toBeHidden();

      await appPage.keyboard.press('Escape');
      await expect(appPage.locator('#masterplan-zone-panel')).toBeHidden();
      await expect(appPage.locator('#app-shell')).toHaveAttribute('data-parcel', 'none');

      await appPage.keyboard.press('Escape');
      await waitForStage(appPage, 'governorate');

      await appPage.keyboard.press('Escape');
      await waitForStage(appPage, 'egypt');

      await appPage.keyboard.press('Escape');
      await waitForStage(appPage, 'hero');
      await expect(appPage.locator('#app-shell')).toHaveAttribute('data-scroll-progress', '0.00');
    });
  });

  test('[S-10] Shared Deep-Link Recipient Arriving at CREEKS Alexandria 3D & Navigating History', async ({
    page,
  }) => {
    // 1. Cold hydration into English 3D Master Plan of CREEKS Alexandria
    await page.goto('/?lang=en&gov=alexandria&project=creeks-alex&view=3d');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    const initial = await getAppShellState(page);
    expect(initial.lang).toBe('en');
    expect(initial.htmlDir).toBe('ltr');
    expect(initial.stage).toBe('project');
    expect(initial.governorate).toBe('alexandria');
    expect(initial.project).toBe('creeks-alex');
    expect(initial.masterplanMode).toBe('3d');

    const inspectorText = normalizeDigits((await page.locator('#project-inspector').textContent()) ?? '');
    expect(inspectorText).toMatch(/CREEKS/i);
    expect(inspectorText).toMatch(/233/);

    // 2. Select zone, toggle 2D, step to sibling, then Browser Back
    await page.locator('[id^="masterplan-zone-btn-"]').first().click();
    await expect(page.locator('#masterplan-zone-panel')).toBeVisible();

    await page.locator('#masterplan-mode-2d').click();
    await waitForCameraSettled(page);
    await expect(page.locator('#app-shell')).toHaveAttribute('data-masterplan-mode', '2d');

    await page.locator('#project-next-btn').click();
    await waitForCameraSettled(page);
    await expect(page.locator('#app-shell')).not.toHaveAttribute('data-project', 'creeks-alex');

    await page.goBack();
    await waitForCameraSettled(page);
    await expect(page.locator('#app-shell')).toHaveAttribute('data-project', 'creeks-alex');

    // 3. Breadcrumb to Egypt, then test malformed deep-link sanitization recovery
    await page.locator('#breadcrumb-egypt').click();
    await waitForStage(page, 'egypt');

    await page.goto('/?gov=invalid&project=bad&lang=xx');
    await waitForAppReady(page);
    const sanitized = await getAppShellState(page);
    expect(sanitized.lang).toBe('ar');
    expect(sanitized.governorate).toBe('none');
    expect(sanitized.project).toBe('none');
    expect(['hero', 'egypt']).toContain(sanitized.stage);
  });

  test('[S-11] Offline Site-Visit Consultant Presenting Live with Zero Network & Zero Console Errors', async ({
    page,
    context,
    errors,
  }) => {
    // 1. Boot local SPA online (external hosts already blocked by fixture) and verify online Hero assets
    await page.goto('/');
    const heroState = await waitForAppReady(page, { expectedStage: 'hero' });
    expect(heroState.webglHero).toBe('ready');
    await assertNoBrokenImages(page, '#app-shell');
    await assertNonBlankCanvas(page, '#app-shell canvas:visible', { minWidth: 200, minHeight: 150 });

    // 2. Drop browser context completely offline (simulating construction site visit)
    await context.setOffline(true);
    const isOnline = await page.evaluate(() => navigator.onLine);
    expect(isOnline, 'Browser context failed to switch offline').toBe(false);

    // Permit browser-level offline disconnect ONLY for lazily mounted consultant raster portraits
    // (e.g., profile.webp when Profile Modal opens offline); JS chunks, CSS, app console.errors,
    // and pageerrors still fail strictly, and assertNoBrokenImages enforces graceful fallback.
    errors.allowNetworkUrlPattern(CONSULTANT_ASSET_URL_REGEX);

    try {
      await page.locator('#hero-explore-btn').click();
      await waitForStage(page, 'egypt');
      const mapState = await getAppShellState(page);
      expect(['offline-vector', 'svg-fallback']).toContain(mapState.mapTiles);

      await page.locator('#gov-card-alexandria').click();
      await waitForStage(page, 'governorate');

      await page.locator('#project-card-sawary').click();
      await waitForStage(page, 'project');

      await page.locator('#masterplan-mode-3d').click();
      await waitForCameraSettled(page);
      await page.locator('[id^="masterplan-zone-btn-"]').first().click();
      await expect(page.locator('#masterplan-zone-panel')).toBeVisible();

      await page.locator('#profile-open-btn').click();
      const profileModal = page.locator('#consultant-profile-modal');
      await expect(profileModal).toBeVisible();
      await assertNoBrokenImages(page, '#consultant-profile-modal');
      await expect(profileModal).toContainText(CONSULTANT_NAME_AR_REGEX);
      await page.keyboard.press('Escape');
      await expect(profileModal).toBeHidden();

      const res = await submitValidConsultation(page, {
        name: 'أشرف مصطفى',
        phone: '01280249440',
        notes: 'اجتماع موقع ميداني - صواري',
      });

      expect(res.whatsappHref).toContain(`wa.me/${CONSULTANT_WHATSAPP_DIGITS}`);
      const stored = await page.evaluate((refId: string) => {
        for (let i = 0; i < window.localStorage.length; i += 1) {
          const k = window.localStorage.key(i);
          if (k && (window.localStorage.getItem(k) ?? '').includes(refId)) return true;
        }
        return false;
      }, res.referenceId);
      expect(stored).toBe(true);
    } finally {
      await context.setOffline(false);
    }
  });

  test.describe('S-12 WebGL-unavailable corporate laptop visitor', () => {
    test.use({ disableWebGL: true });

    test('[S-12] WebGL-Unavailable Corporate Laptop Visitor Completing Full SVG Fallback Funnel', async ({
      appPage,
    }) => {
      const shell = appPage.locator('#app-shell');
      await expect(shell).toHaveAttribute('data-webgl-hero', 'fallback');

      await appPage.locator('#hero-explore-btn').click();
      await waitForStage(appPage, 'egypt');
      const egyptState = await getAppShellState(appPage);
      expect(egyptState.webglMap === 'fallback' || egyptState.mapTiles === 'svg-fallback').toBe(true);

      await appPage.locator('#gov-card-alexandria').click();
      await waitForStage(appPage, 'governorate');

      await appPage.locator('#project-card-alex-west').click();
      await waitForStage(appPage, 'project');
      const inspectorText = normalizeDigits(
        (await appPage.locator('#project-inspector').textContent()) ?? '',
      );
      expect(inspectorText).toMatch(/620/);

      await appPage.locator('[id^="masterplan-zone-btn-"]').first().click();
      await expect(appPage.locator('#masterplan-zone-panel')).toBeVisible();

      await appPage.locator('#masterplan-mode-3d').click();
      await waitForCameraSettled(appPage);
      await expect(shell).toHaveAttribute('data-masterplan-mode', '3d');

      const res = await submitValidConsultation(appPage, {
        name: 'حسام الدين',
        phone: '01212345678',
      });
      expect(res.referenceId).toMatch(/^REQ-20\d{2}-[A-Z0-9]{4,}$/);
    });
  });
});
