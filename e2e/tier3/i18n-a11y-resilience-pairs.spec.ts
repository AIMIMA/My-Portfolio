import { test, expect } from '../fixtures';
import {
  MOBILE_VIEWPORT,
  assertNoHorizontalOverflow,
  assertSafeWhatsAppLink,
  enterOfflineAfterLocalBoot,
  extractZoneId,
  nextFrames,
  normalizeDigits,
  requireBoundingBox,
  submitValidConsultation,
  verifyDialogFocusTrap,
  waitForAppReady,
  waitForCameraSettled,
  waitForStage,
} from '../helpers';

test.describe('Tier 3 — Cross-Feature Pairwise: i18n, A11y & Resilience (T3-18..T3-25)', () => {
  test('[T3-18][F-20 x F-16] Toggling AR -> EN mid-Consultation Modal preserves typed inputs and San Stefano prefill while flipping copy and WhatsApp brief', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=alexandria&project=san-stefano');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    await page.locator('#consult-open-btn').click();
    await page.locator('#consult-name').fill('سارة المنشاوي');
    await page.locator('#consult-phone').fill('01280249440');
    await page.locator('#consult-notes').fill('استفسار عن وحدات مطلة على البحر');

    await page.locator('#lang-toggle-btn').click();
    await expect(page.locator('#app-shell')).toHaveAttribute('data-lang', 'en');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');

    await expect(page.locator('#consult-modal')).toBeVisible();
    await expect(page.locator('#consult-name')).toHaveValue('سارة المنشاوي');
    await expect(page.locator('#consult-phone')).toHaveValue('01280249440');
    await expect(page.locator('#consult-notes')).toHaveValue('استفسار عن وحدات مطلة على البحر');

    await page.locator('#consult-submit-btn').click();
    await expect(page.locator('#consult-confirmation')).toBeVisible();
    await assertSafeWhatsAppLink(page.locator('#consult-whatsapp-link'), /San Stefano/i);
  });

  test('[T3-19][F-20 x F-11] Toggling AR <-> EN with active Master Plan zone updates zone label, legend text, metric scale bar units, and RTL/LTR without losing selection', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=alexandria&project=sawary');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    const firstZone = page.locator('[id^="masterplan-zone-btn-"]').first();
    const zoneId = extractZoneId((await firstZone.getAttribute('id')) ?? '');
    await firstZone.click();

    const arZone = ((await page.locator('#masterplan-zone-panel').textContent()) ?? '').trim();
    const arLegend = ((await page.locator('#masterplan-legend').textContent()) ?? '').trim();
    const arScale = normalizeDigits((await page.locator('#masterplan-scale-bar').textContent()) ?? '');
    expect(arScale).toMatch(/(م|كم)/);

    await page.locator('#lang-toggle-btn').click();
    await expect(page.locator('#app-shell')).toHaveAttribute('data-lang', 'en');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.locator('#app-shell')).toHaveAttribute('data-parcel', zoneId);

    const enZone = ((await page.locator('#masterplan-zone-panel').textContent()) ?? '').trim();
    const enLegend = ((await page.locator('#masterplan-legend').textContent()) ?? '').trim();
    const enScale = normalizeDigits((await page.locator('#masterplan-scale-bar').textContent()) ?? '');
    expect(enZone).not.toBe(arZone);
    expect(enLegend).not.toBe(arLegend);
    expect(enScale).toMatch(/(m|km)/i);
  });

  test('[T3-20][F-20 x F-07] Cross-script search accepts Arabic queries in EN mode and English queries in AR mode displaying results in active locale', async ({
    page,
  }) => {
    await page.goto('/?lang=ar&stage=egypt');
    await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });

    const input = page.locator('#egypt-search-input');
    const results = page.locator('#egypt-search-results');

    await input.fill('sawary');
    await expect(results).toBeVisible();
    await expect(results).toContainText('صواري');

    await page.locator('#lang-toggle-btn').click();
    await expect(page.locator('#app-shell')).toHaveAttribute('data-lang', 'en');

    await input.fill('صواري');
    await expect(results).toBeVisible();
    await expect(results).toContainText(/Sawary/i);
  });

  test.describe('T3-21 Reduced motion deterministic funnel', () => {
    test.use({ reducedMotion: 'reduce' });

    test('[T3-21][F-21 x F-04] Reduced motion (prefers-reduced-motion: reduce) paired with full deterministic stage funnel completes rapidly without stuck camera', async ({
      appPage,
    }) => {
      const start = Date.now();
      await appPage.locator('#hero-explore-btn').click();
      await waitForStage(appPage, 'egypt');

      await appPage.locator('#gov-card-alexandria').click();
      await waitForStage(appPage, 'governorate');

      await appPage.locator('#project-card-sawary').click();
      await waitForStage(appPage, 'project');

      await appPage.locator('#masterplan-mode-3d').click();
      await waitForCameraSettled(appPage);
      expect(Date.now() - start).toBeLessThan(8000);
      await expect(appPage.locator('#app-shell')).toHaveAttribute('data-camera-moving', 'false');
    });
  });

  test('[T3-22][F-21 x F-13] Keyboard Escape cascade from Zone-triggered Consultation Modal unwinds cleanly through all 5 levels back to Hero', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=alexandria&project=sawary');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    await page.locator('[id^="masterplan-zone-btn-"]').first().click();
    await page.locator('#masterplan-zone-inquire-btn').click();
    await expect(page.locator('#consult-modal')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('#consult-modal')).toBeHidden();
    await expect(page.locator('#masterplan-zone-panel')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('#masterplan-zone-panel')).toBeHidden();
    await expect(page.locator('#app-shell')).toHaveAttribute('data-parcel', 'none');

    await page.keyboard.press('Escape');
    await waitForStage(page, 'governorate');

    await page.keyboard.press('Escape');
    await waitForStage(page, 'egypt');

    await page.keyboard.press('Escape');
    await waitForStage(page, 'hero');
    await expect(page.locator('#app-shell')).toHaveAttribute('data-scroll-progress', '0.00');
  });

  test('[T3-23][F-21 x F-15] Profile Modal focus trap + AR/EN locale switch preserves dialog focus containment and restores trigger focus on Escape', async ({
    page,
  }) => {
    await page.goto('/?stage=egypt');
    await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });

    await page.locator('#profile-open-btn').click();
    await expect(page.locator('#consultant-profile-modal')).toBeVisible();

    await page.locator('#lang-toggle-btn').click();
    await expect(page.locator('#app-shell')).toHaveAttribute('data-lang', 'en');
    await expect(page.locator('#consultant-profile-modal')).toBeVisible();

    await page
      .locator('#consultant-profile-modal button, #consultant-profile-modal a')
      .first()
      .focus();
    await verifyDialogFocusTrap(page, '#consultant-profile-modal', 10);

    await page.keyboard.press('Escape');
    await expect(page.locator('#consultant-profile-modal')).toBeHidden();
    const activeId = await page.evaluate(() => document.activeElement?.id ?? '');
    expect(activeId).toBe('profile-open-btn');
  });

  test.describe('T3-24 Mobile bottom sheet + RTL/LTR flip', () => {
    test.use({ viewport: MOBILE_VIEWPORT, hasTouch: true, isMobile: true });

    test('[T3-24][F-09 x F-20] Mobile 390x844 Alexandria bottom sheet paired with AR/EN RTL-LTR flip maintains zero overflow and isolated list scroll', async ({
      page,
    }) => {
      await page.goto('/?stage=governorate&gov=alexandria');
      await waitForAppReady(page, { expectedStage: 'governorate', waitForMap: true });

      await assertNoHorizontalOverflow(page);

      const drawer = page.locator('#governorate-drawer');
      const box = await requireBoundingBox(drawer, 'Mobile #governorate-drawer bottom sheet');
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.wheel(0, 400);
      await nextFrames(page, 3);
      await expect(page.locator('#app-shell')).toHaveAttribute('data-stage', 'governorate');

      await page.locator('#lang-toggle-btn').click();
      await expect(page.locator('#app-shell')).toHaveAttribute('data-lang', 'en');
      await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
      await assertNoHorizontalOverflow(page);

      await page.mouse.wheel(0, -400);
      await nextFrames(page, 3);
      await expect(page.locator('#app-shell')).toHaveAttribute('data-stage', 'governorate');
    });
  });

  test('[T3-25][F-22 x F-17] Offline site-visit presentation for Suez (IL Monte Galala) renders full catalog Master Plan, offline receipt, and formatted wa.me brief', async ({
    page,
    context,
  }) => {
    await enterOfflineAfterLocalBoot(
      page,
      context,
      '/?stage=project&gov=suez&project=il-monte-galala',
      { expectedStage: 'project', waitForMap: true },
    );

    try {
      const inspectorText = normalizeDigits(
        (await page.locator('#project-inspector').textContent()) ?? '',
      );
      expect(inspectorText).toMatch(/المونت جلالة|IL Monte Galala/i);
      expect(inspectorText).toMatch(/533/);
      expect(await page.locator('[id^="masterplan-zone-btn-"]').count()).toBeGreaterThanOrEqual(5);

      const res = await submitValidConsultation(page, {
        name: 'مهاب السعيد',
        phone: '01512345678',
      });
      expect(res.decodedWhatsappText).toContain(res.referenceId);
      expect(res.decodedWhatsappText).toMatch(/المونت جلالة|IL Monte Galala/i);
    } finally {
      await context.setOffline(false);
    }
  });
});
