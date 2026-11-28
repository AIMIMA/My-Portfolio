import { test, expect } from '../fixtures';
import {
  CONSULTANT_NAME_AR_REGEX,
  CONSULTANT_NAME_EN_REGEX,
  CONSULTANT_TEL_HREF_REGEX,
  CONSULTANT_TITLE_AR_REGEX,
  CONSULTANT_TITLE_EN_REGEX,
  CONSULTANT_WHATSAPP_DIGITS,
  REFERENCE_ID_REGEX,
  assertConsultantPhotoLoaded,
  assertSafeWhatsAppLink,
  assertValidMailtoLink,
  assertZeroRawI18nKeys,
  enterOfflineAfterLocalBoot,
  extractZoneId,
  getProfileConsultButton,
  getShortlistBadgeCount,
  nextFrames,
  normalizeDigits,
  removeFromShortlistDrawer,
  selectZoneAndResolveLabel,
  submitValidConsultation,
  waitForAppReady,
  waitForStage,
} from '../helpers';

test.describe('Tier 1 — Consultant Profile, Consultation Booking, WhatsApp & Shortlist (F-15..F-18)', () => {
  // ── F-15: Consultant Profile Modal / Drawer ──

  test('[T1-15.1][F-15] Top bar #profile-open-btn opens accessible Consultant Profile Modal on any stage', async ({
    page,
  }) => {
    await page.goto('/?stage=egypt');
    await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });

    await page.locator('#profile-open-btn').click();
    const modal = page.locator('#consultant-profile-modal');
    await expect(modal).toBeVisible();
    await expect(modal).toHaveAttribute('role', 'dialog');
    await expect(modal).toHaveAttribute('aria-modal', 'true');
    await expect(page.locator('#app-shell')).toHaveAttribute('data-stage', 'egypt');
  });

  test('[T1-15.2][F-15] Displays verified consultant bio, title, real photo, credentials, and direct contact links', async ({
    page,
  }) => {
    await page.goto('/?stage=egypt');
    await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });

    await page.locator('#profile-open-btn').click();
    const modal = page.locator('#consultant-profile-modal');
    await expect(modal).toBeVisible();
    await assertConsultantPhotoLoaded(page, '#consultant-profile-modal');
    await expect(modal).toContainText(CONSULTANT_NAME_AR_REGEX);
    await expect(modal).toContainText(CONSULTANT_TITLE_AR_REGEX);

    await assertSafeWhatsAppLink(modal.locator('a[href*="wa.me"]').first());
    const telHref = (await modal.locator('a[href^="tel:"]').first().getAttribute('href')) ?? '';
    expect(telHref).toMatch(CONSULTANT_TEL_HREF_REGEX);
    await assertValidMailtoLink(modal.locator('a[href^="mailto:"]').first());
  });

  test('[T1-15.3][F-15] Consultation CTA inside Profile Modal transitions cleanly into Consultation Modal', async ({
    page,
  }) => {
    await page.goto('/?stage=egypt');
    await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });

    await page.locator('#profile-open-btn').click();
    const profileModal = page.locator('#consultant-profile-modal');
    await expect(profileModal).toBeVisible();

    const consultTrigger = await getProfileConsultButton(page);
    await consultTrigger.click();

    await expect(profileModal).toBeHidden();
    await expect(page.locator('#consult-modal')).toBeVisible();
  });

  test('[T1-15.4][F-15] English Consultant Profile Modal renders real headshot photo, Senior Property Consultant title, and verified WhatsApp link', async ({
    page,
  }) => {
    await page.goto('/?lang=en&stage=egypt');
    await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });

    await page.locator('#profile-open-btn').click();
    const modal = page.locator('#consultant-profile-modal');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText(CONSULTANT_NAME_EN_REGEX);
    await expect(modal).toContainText(CONSULTANT_TITLE_EN_REGEX);
    await expect(modal).toContainText(/Alexandria/i);

    await assertConsultantPhotoLoaded(page, '#consultant-profile-modal');
    await assertSafeWhatsAppLink(modal.locator('a[href*="wa.me"]').first());
  });

  test('[T1-15.5][F-15] Preserves 3D Project Master Plan and selected zone when opening/closing Profile Modal', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=alexandria&project=sawary&view=3d');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    const zoneBtn = page.locator('[id^="masterplan-zone-btn-"]').first();
    const zoneId = extractZoneId((await zoneBtn.getAttribute('id')) ?? '');
    await zoneBtn.click();
    await expect(page.locator('#app-shell')).toHaveAttribute('data-parcel', zoneId);

    await page.locator('#profile-open-btn').click();
    await expect(page.locator('#consultant-profile-modal')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#consultant-profile-modal')).toBeHidden();

    const shell = page.locator('#app-shell');
    await expect(shell).toHaveAttribute('data-stage', 'project');
    await expect(shell).toHaveAttribute('data-project', 'sawary');
    await expect(shell).toHaveAttribute('data-masterplan-mode', '3d');
    await expect(shell).toHaveAttribute('data-parcel', zoneId);
  });

  // ── F-16: Interactive Consultation Booking Form ──

  test('[T1-16.1][F-16] Auto-prefills Governorate and Project when opened from Project Summary', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=alexandria&project=san-stefano');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    await page.locator('#consult-open-btn').click();
    const modal = page.locator('#consult-modal');
    await expect(modal).toBeVisible();
    const notesField = modal.locator('#consult-notes');
    await expect(notesField).toBeVisible();

    const modalText = `${(await modal.textContent()) ?? ''} ${await notesField.inputValue()}`;
    expect(modalText).toMatch(/سان ستيفانو|San Stefano/i);
    expect(modalText).toMatch(/الإسكندرية|Alexandria/i);
  });

  test('[T1-16.2][F-16] Hero consultation modal blocks empty submission with aria-invalid and submits cleanly with valid phone', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForAppReady(page, { expectedStage: 'hero' });

    await page.locator('#hero-consult-btn').click();
    await expect(page.locator('#consult-modal')).toBeVisible();

    // Empty submission must be blocked with required field validation
    await page.locator('#consult-submit-btn').click();
    await expect(page.locator('#consult-confirmation')).toBeHidden();
    await expect(page.locator('#consult-name')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#consult-phone')).toHaveAttribute('aria-invalid', 'true');

    // Valid name and verified Egyptian mobile recover cleanly into receipt
    await page.locator('#consult-name').fill('أحمد محمود');
    await page.locator('#consult-phone').fill('01280249440');
    await page.locator('#consult-submit-btn').click();
    await expect(page.locator('#consult-confirmation')).toBeVisible();
    const refId = ((await page.locator('#consult-reference-id').textContent()) ?? '').trim();
    expect(refId).toMatch(REFERENCE_ID_REGEX);
  });

  test('[T1-16.3][F-16] Accepts valid Egyptian mobile (+20 101 234 5678) and generates Reference ID', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=alexandria&project=sawary');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    const result = await submitValidConsultation(page, {
      name: 'أحمد محمود',
      phone: '+20 101 234 5678',
      selectMethodIndex: 0,
      selectPurposeIndex: 0,
      notes: 'طلب تفاصيل صواري',
    });

    expect(result.referenceId).toMatch(REFERENCE_ID_REGEX);
    expect(result.decodedWhatsappText).toContain(result.referenceId);
  });

  test('[T1-16.4][F-16] Accepts valid international/Gulf E.164 numbers (+971501234567) in English mode', async ({
    page,
  }) => {
    await page.goto('/?lang=en&stage=project&gov=alexandria&project=palm-hills-alex');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    const result = await submitValidConsultation(page, {
      name: 'Omar Khaled',
      phone: '+971501234567',
      notes: 'Interested in duplex options',
    });

    expect(result.referenceId).toMatch(REFERENCE_ID_REGEX);
    const confText = (await page.locator('#consult-confirmation').textContent()) ?? '';
    expect(confText).toMatch(/Request|Reference|Confirm|WhatsApp|Received/i);
  });

  test('[T1-16.5][F-16] Persists consultation receipt in localStorage and blocks duplicate submit offline', async ({
    page,
    context,
  }) => {
    await enterOfflineAfterLocalBoot(
      page,
      context,
      '/?stage=project&gov=alexandria&project=sawary',
      { expectedStage: 'project', waitForMap: true },
    );

    try {
      const result = await submitValidConsultation(page, {
        name: 'كريم عبد الله',
        phone: '01280249440',
      });

      const stored = await page.evaluate((refId: string) => {
        for (let i = 0; i < window.localStorage.length; i += 1) {
          const key = window.localStorage.key(i);
          if (!key) continue;
          const val = window.localStorage.getItem(key) ?? '';
          if (val.includes(refId)) return true;
        }
        return false;
      }, result.referenceId);

      expect(stored, `Expected localStorage to persist receipt ${result.referenceId}`).toBe(true);
      await expect(page.locator('#consult-submit-btn')).toBeHidden();
    } finally {
      await context.setOffline(false);
    }
  });

  test('[T1-16.6][F-16] Closes Consultation Modal via #consult-close-btn cleanly without losing stage', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=giza&project=zed-west');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    await page.locator('#consult-open-btn').click();
    await expect(page.locator('#consult-modal')).toBeVisible();

    await page.locator('#consult-close-btn').click();
    await expect(page.locator('#consult-modal')).toBeHidden();
    await expect(page.locator('#app-shell')).toHaveAttribute('data-stage', 'project');
    await expect(page.locator('#app-shell')).toHaveAttribute('data-project', 'zed-west');
  });

  // ── F-17: Direct WhatsApp & Quick-Call Actions ──

  test('[T1-17.1][F-17] Builds valid UTF-8 encoded Arabic wa.me URL with verified E.164 number and safe rel', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=alexandria&project=sawary');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    const waBtn = page.locator('#project-inspector a[href*="wa.me"]').first();
    await assertSafeWhatsAppLink(waBtn, /صواري/);
  });

  test('[T1-17.2][F-17] Encodes English prefilled WhatsApp message when locale is EN', async ({
    page,
  }) => {
    await page.goto('/?lang=en&stage=project&gov=alexandria&project=palm-hills-alex');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    const waBtn = page.locator('#project-inspector a[href*="wa.me"]').first();
    await assertSafeWhatsAppLink(waBtn, /Palm Hills Alexandria/i);
  });

  test('[T1-17.3][F-17] Exposes clean dialable tel: quick-call link without spaces or broken formatting', async ({
    page,
  }) => {
    await page.goto('/?stage=egypt');
    await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });

    await page.locator('#profile-open-btn').click();
    const telLink = page.locator('#consultant-profile-modal a[href^="tel:"]').first();
    await expect(telLink).toBeVisible();
    const href = (await telLink.getAttribute('href')) ?? '';
    expect(href).toMatch(CONSULTANT_TEL_HREF_REGEX);
  });

  test('[T1-17.4][F-17] Post-booking WhatsApp link embeds Project, Selected Zone, and Reference ID', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=alexandria&project=creeks-alex');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    const { zoneLabel, matchToken } = await selectZoneAndResolveLabel(page, 0);
    await page.locator('#masterplan-zone-inquire-btn').click();

    const result = await submitValidConsultation(page, {
      name: 'نور الدين',
      phone: '01112345678',
    });

    expect(result.decodedWhatsappText).toContain(result.referenceId);
    expect(result.decodedWhatsappText).toMatch(/كريكس|CREEKS/i);
    expect(
      result.decodedWhatsappText,
      `Expected WhatsApp brief to bind selected zone "${zoneLabel}" (token "${matchToken}")`,
    ).toContain(matchToken);
  });

  test('[T1-17.5][F-17] Verified consultant WhatsApp channel is reachable from Profile Modal, Project Summary, and Consultation Confirmation', async ({
    appPage,
  }) => {
    // Surface 1: Profile Modal (launched from Hero)
    await appPage.locator('#hero-about-btn').click();
    await assertSafeWhatsAppLink(
      appPage.locator('#consultant-profile-modal a[href*="wa.me"]').first(),
    );
    await appPage.keyboard.press('Escape');
    await expect(appPage.locator('#consultant-profile-modal')).toBeHidden();

    // Surface 2: Consultation Confirmation receipt (launched from Hero #hero-consult-btn)
    const booking = await submitValidConsultation(appPage, {
      name: 'سالم منصور',
      phone: '01012345678',
      openSelector: '#hero-consult-btn',
    });
    expect(booking.whatsappHref).toContain(`wa.me/${CONSULTANT_WHATSAPP_DIGITS}`);
    await appPage.locator('#consult-close-btn').click();
    await expect(appPage.locator('#consult-modal')).toBeHidden();

    // Surface 3: Project Summary Inspector
    await appPage.goto('/?stage=project&gov=cairo&project=madinaty');
    await waitForAppReady(appPage, { expectedStage: 'project', waitForMap: true });
    await assertSafeWhatsAppLink(
      appPage.locator('#project-inspector a[href*="wa.me"]').first(),
      /مدينتي|Madinaty/i,
    );
  });

  // ── F-18: Project Comparison Shortlist (Up to 3 Projects) ──

  test('[T1-18.1][F-18] Adds and removes cross-governorate projects in Shortlist Drawer with side-by-side metrics', async ({
    page,
  }) => {
    await page.goto('/?stage=governorate&gov=alexandria');
    await waitForAppReady(page, { expectedStage: 'governorate', waitForMap: true });

    await page.locator('#shortlist-toggle-sawary').click();
    expect(await getShortlistBadgeCount(page)).toBe(1);

    await page.locator('#gov-card-cairo').click();
    await waitForStage(page, 'governorate');
    await page.locator('#shortlist-toggle-madinaty').click();
    expect(await getShortlistBadgeCount(page)).toBe(2);

    await page.locator('#shortlist-open-btn').click();
    const drawer = page.locator('#shortlist-drawer');
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText(/صواري|Sawary/i);
    await expect(drawer).toContainText(/مدينتي|Madinaty/i);

    await removeFromShortlistDrawer(page, 'sawary');
    await nextFrames(page, 2);
    expect(await getShortlistBadgeCount(page)).toBe(1);
    await expect(drawer).not.toContainText(/صواري|Sawary/i);
    await expect(drawer).toContainText(/مدينتي|Madinaty/i);
  });

  test('[T1-18.2][F-18] Compares 3 cross-governorate projects side-by-side in AR and translates live to EN inside Shortlist Drawer', async ({
    page,
  }) => {
    await page.goto('/?stage=governorate&gov=alexandria');
    await waitForAppReady(page, { expectedStage: 'governorate', waitForMap: true });
    await page.locator('#shortlist-toggle-sawary').click();

    await page.locator('#gov-card-matrouh').click();
    await waitForStage(page, 'governorate');
    await page.locator('#shortlist-toggle-marassi').click();

    await page.locator('#gov-card-suez').click();
    await waitForStage(page, 'governorate');
    await page.locator('#shortlist-toggle-azha-sokhna').click();
    expect(await getShortlistBadgeCount(page)).toBe(3);

    await page.locator('#shortlist-open-btn').click();
    const drawer = page.locator('#shortlist-drawer');
    await expect(drawer).toBeVisible();

    const arDrawerText = normalizeDigits((await drawer.innerText()) ?? '');
    expect(arDrawerText).toMatch(/صواري/);
    expect(arDrawerText).toMatch(/مراسي/);
    expect(arDrawerText).toMatch(/أزها|ازها/);
    expect(arDrawerText).toContain('417');
    await assertZeroRawI18nKeys(page, '#shortlist-drawer');

    await page.locator('#lang-toggle-btn').click();
    await expect(page.locator('#app-shell')).toHaveAttribute('data-lang', 'en');
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText(/Sawary/i);
    await expect(drawer).toContainText(/Marassi/i);
    await expect(drawer).toContainText(/Azha/i);
    expect(await getShortlistBadgeCount(page)).toBe(3);
  });

  test('[T1-18.3][F-18] Persists shortlisted projects across full page reload via localStorage', async ({
    page,
  }) => {
    await page.goto('/?stage=governorate&gov=matrouh');
    await waitForAppReady(page, { expectedStage: 'governorate', waitForMap: true });
    await page.locator('#shortlist-toggle-marassi').click();

    await page.locator('#gov-card-red-sea').click();
    await waitForStage(page, 'governorate');
    await page.locator('#shortlist-toggle-el-gouna').click();
    expect(await getShortlistBadgeCount(page)).toBe(2);

    await page.reload();
    await waitForAppReady(page, { waitForMap: true });
    expect(await getShortlistBadgeCount(page)).toBe(2);

    await page.locator('#shortlist-open-btn').click();
    const drawer = page.locator('#shortlist-drawer');
    await expect(drawer).toContainText(/مراسي|Marassi/i);
    await expect(drawer).toContainText(/الجونة|El Gouna/i);
  });

  test('[T1-18.4][F-18] Clicking a shortlisted item navigates directly to that project Master Plan', async ({
    page,
  }) => {
    await page.goto('/?stage=governorate&gov=red-sea');
    await waitForAppReady(page, { expectedStage: 'governorate', waitForMap: true });
    await page.locator('#shortlist-toggle-somabay').click();

    await page.locator('#gov-card-alexandria').click();
    await waitForStage(page, 'governorate');

    await page.locator('#shortlist-open-btn').click();
    const drawer = page.locator('#shortlist-drawer');
    await expect(drawer).toBeVisible();

    await drawer
      .locator('button, a')
      .filter({ hasText: /سوما باي|Somabay/i })
      .first()
      .click();

    await waitForStage(page, 'project');
    await expect(drawer).toBeHidden();
    await expect(page.locator('#app-shell')).toHaveAttribute('data-governorate', 'red-sea');
    await expect(page.locator('#app-shell')).toHaveAttribute('data-project', 'somabay');
  });

  test('[T1-18.5][F-18] #shortlist-consult-btn opens Consultation Modal prefilled with all shortlisted projects', async ({
    page,
  }) => {
    await page.goto('/?stage=governorate&gov=alexandria');
    await waitForAppReady(page, { expectedStage: 'governorate', waitForMap: true });
    await page.locator('#shortlist-toggle-sawary').click();

    await page.locator('#gov-card-giza').click();
    await waitForStage(page, 'governorate');
    await page.locator('#shortlist-toggle-zed-west').click();

    await page.locator('#shortlist-open-btn').click();
    await page.locator('#shortlist-consult-btn').click();

    const modal = page.locator('#consult-modal');
    await expect(modal).toBeVisible();

    const result = await submitValidConsultation(page, {
      name: 'هشام فؤاد',
      phone: '01512345678',
    });
    expect(result.decodedWhatsappText).toMatch(/صواري|Sawary/i);
    expect(result.decodedWhatsappText).toMatch(/زيد ويست|ZED West/i);
  });
});
