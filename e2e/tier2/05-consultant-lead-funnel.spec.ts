import { test, expect } from '../fixtures';
import {
  CONSULTANT_NAME_AR_REGEX,
  CONSULTANT_NAME_EN_REGEX,
  CONSULTANT_TEL_HREF_REGEX,
  CONSULTANT_TITLE_AR_REGEX,
  CONSULTANT_TITLE_EN_REGEX,
  CONSULTANT_WHATSAPP_DIGITS,
  DESKTOP_VIEWPORT,
  MOBILE_VIEWPORT,
  REFERENCE_ID_REGEX,
  assertNoBrokenImages,
  assertNoHorizontalOverflow,
  assertSafeWhatsAppLink,
  assertTapTargetSize,
  assertZeroRawI18nKeys,
  breakPortraitAsset,
  enterOfflineAfterLocalBoot,
  getProfileConsultButton,
  getShortlistBadgeCount,
  nextFrames,
  removeFromShortlistDrawer,
  requireBoundingBox,
  submitValidConsultation,
  verifyDialogFocusTrap,
  waitForAppReady,
  waitForStage,
} from '../helpers';

test.describe('Tier 2 — Consultant Profile, Lead Validation Matrix & Shortlist Edge Cases (F-15..F-18)', () => {
  // ── F-15: Consultant Profile Modal / Drawer (5) ──

  test('[T2-F15-01][F-15] Consultant Profile Modal enforces dialog ARIA focus trap and restores exact focus across both Hero and Egypt triggers', async ({
    page,
  }) => {
    // Surface 1: Triggered from Hero via #hero-about-btn
    await page.goto('/');
    await waitForAppReady(page, { expectedStage: 'hero' });
    await page.locator('#hero-about-btn').click();
    const modal = page.locator('#consultant-profile-modal');
    await expect(modal).toBeVisible();
    await expect(modal).toHaveAttribute('role', 'dialog');
    await expect(modal).toHaveAttribute('aria-modal', 'true');

    await verifyDialogFocusTrap(page, '#consultant-profile-modal', 15);
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
    const heroFocusedId = await page.evaluate(() => document.activeElement?.id ?? '');
    expect(heroFocusedId).toBe('hero-about-btn');

    // Surface 2: Triggered from Egypt top bar via #profile-open-btn
    await page.goto('/?stage=egypt');
    await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });
    await page.locator('#profile-open-btn').click();
    await expect(modal).toBeVisible();
    await verifyDialogFocusTrap(page, '#consultant-profile-modal', 15);
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
    await expect(page.locator('#app-shell')).toHaveAttribute('data-stage', 'egypt');
    const egyptFocusedId = await page.evaluate(() => document.activeElement?.id ?? '');
    expect(egyptFocusedId).toBe('profile-open-btn');
  });

  test('[T2-F15-02][F-15][EC-15] Broken 404 portrait image inside Consultant Profile Modal is intercepted and falls back cleanly', async ({
    page,
    errors,
  }) => {
    const portraitFault = await breakPortraitAsset(page, { mode: '404', errorCollector: errors });
    try {
      await page.goto('/?stage=egypt');
      await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });

      await page.locator('#profile-open-btn').click();
      const modal = page.locator('#consultant-profile-modal');
      await expect(modal).toBeVisible();

      await expect
        .poll(() => portraitFault.interceptedUrls.length, {
          timeout: 8_000,
          message:
            'EC-15: Expected Consultant Profile Modal to request real profile photo intercepted by breakPortraitAsset',
        })
        .toBeGreaterThan(0);

      await assertNoBrokenImages(page, '#consultant-profile-modal');
      await expect(modal).toContainText(CONSULTANT_NAME_AR_REGEX);
    } finally {
      await portraitFault.restore();
    }
  });

  test('[T2-F15-03][F-15] Chaining Shortlist -> Profile -> Consultation overlays enforces strict single visible dialog invariant', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=alexandria&project=sawary');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    const visibleDialogs = page.locator('[role="dialog"]:visible');

    await page.locator('#shortlist-open-btn').click();
    await expect(page.locator('#shortlist-drawer')).toBeVisible();
    await expect(visibleDialogs).toHaveCount(1);

    await page.locator('#profile-open-btn').click();
    await expect(page.locator('#consultant-profile-modal')).toBeVisible();
    await expect(page.locator('#shortlist-drawer')).toBeHidden();
    await expect(visibleDialogs).toHaveCount(1);

    const consultTrigger = await getProfileConsultButton(page);
    await consultTrigger.click();
    await expect(page.locator('#consultant-profile-modal')).toBeHidden();
    await expect(page.locator('#consult-modal')).toBeVisible();
    await expect(visibleDialogs).toHaveCount(1);

    await page.keyboard.press('Escape');
    await expect(page.locator('#consult-modal')).toBeHidden();
    await expect(visibleDialogs).toHaveCount(0);
    await expect(page.locator('#app-shell')).toHaveAttribute('data-stage', 'project');
    await expect(page.locator('#app-shell')).toHaveAttribute('data-project', 'sawary');
  });

  test('[T2-F15-04][F-15] Clicking backdrop outside Profile Modal dismisses it without disturbing underlying governorate stage', async ({
    page,
  }) => {
    await page.goto('/?stage=governorate&gov=alexandria');
    await waitForAppReady(page, { expectedStage: 'governorate', waitForMap: true });

    await page.locator('#profile-open-btn').click();
    const modal = page.locator('#consultant-profile-modal');
    await expect(modal).toBeVisible();

    const vp = page.viewportSize() ?? DESKTOP_VIEWPORT;
    const modalBox = await requireBoundingBox(modal, '#consultant-profile-modal');
    let cardBox = modalBox;
    if (modalBox.width >= vp.width - 16) {
      const innerCard = modal.locator('> *').first();
      const innerBox = await innerCard.boundingBox();
      if (innerBox && innerBox.width < vp.width - 16) {
        cardBox = innerBox;
      }
    }
    const clickX = cardBox.x < 40 ? vp.width - 16 : 16;
    const clickY = Math.round(vp.height * 0.5);
    await page.mouse.click(clickX, clickY);

    await expect(modal).toBeHidden();
    await expect(page.locator('#app-shell')).toHaveAttribute('data-stage', 'governorate');
    await expect(page.locator('#app-shell')).toHaveAttribute('data-governorate', 'alexandria');
  });

  test('[T2-F15-05][F-15][EC-14] Consultant Profile Modal translates verified identity and title AR <-> EN with zero overflow on desktop and mobile', async ({
    page,
  }) => {
    for (const vp of [DESKTOP_VIEWPORT, MOBILE_VIEWPORT]) {
      await page.setViewportSize(vp);
      await page.goto('/?lang=ar&stage=egypt');
      await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });

      await page.locator('#profile-open-btn').click();
      const modal = page.locator('#consultant-profile-modal');
      await expect(modal).toBeVisible();
      await expect(modal).toContainText(CONSULTANT_NAME_AR_REGEX);
      await expect(modal).toContainText(CONSULTANT_TITLE_AR_REGEX);
      await assertNoHorizontalOverflow(page);

      await page.keyboard.press('Escape');
      await page.locator('#lang-toggle-btn').click();
      await expect(page.locator('#app-shell')).toHaveAttribute('data-lang', 'en');

      await page.locator('#profile-open-btn').click();
      await expect(modal).toBeVisible();
      await expect(modal).toContainText(CONSULTANT_NAME_EN_REGEX);
      await expect(modal).toContainText(CONSULTANT_TITLE_EN_REGEX);
      await assertNoHorizontalOverflow(page);
    }
  });

  // ── F-16: Interactive Consultation Booking Form (7) ──

  test('[T2-F16-01][F-16][EC-09] Rejects empty name, 1-char name, and invalid phone matrix with inline errors and aria-invalid="true"', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=alexandria&project=sawary');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    await page.locator('#consult-open-btn').click();
    await expect(page.locator('#consult-modal')).toBeVisible();

    // (a) Empty submit
    await page.locator('#consult-submit-btn').click();
    await expect(page.locator('#consult-confirmation')).toBeHidden();
    await expect(page.locator('#consult-name')).toHaveAttribute('aria-invalid', 'true');

    // (b) 1-char name
    await page.locator('#consult-name').fill('أ');
    await page.locator('#consult-phone').fill('01012345678');
    await page.locator('#consult-submit-btn').click();
    await expect(page.locator('#consult-confirmation')).toBeHidden();
    await expect(page.locator('#consult-name')).toHaveAttribute('aria-invalid', 'true');

    // (c) Full invalid phone matrix
    const invalidPhones = [
      '',
      '12345',
      '01912345678',
      '01312345678',
      '010123456',
      '0101234567899',
      'abcdef',
    ];
    await page.locator('#consult-name').fill('أحمد علي');
    for (const badPhone of invalidPhones) {
      await page.locator('#consult-phone').fill(badPhone);
      await page.locator('#consult-submit-btn').click();
      await expect(page.locator('#consult-confirmation')).toBeHidden();
      await expect(
        page.locator('#consult-phone'),
        `Expected invalid phone "${badPhone}" to set aria-invalid="true"`,
      ).toHaveAttribute('aria-invalid', 'true');
    }
  });

  test('[T2-F16-02][F-16][EC-09] Accepts all valid Egyptian mobile prefixes (010, 011, 012, 015, +20 spaced, 0020) with REQ-2026 receipt', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=alexandria&project=sawary');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    const validEgyptianPhones = [
      '01012345678',
      '01112345678',
      '01212345678',
      '01512345678',
      '+20 101 234 5678',
      '00201280249440',
    ];

    for (const phone of validEgyptianPhones) {
      const res = await submitValidConsultation(page, {
        name: 'عميل مصري',
        phone,
      });
      expect(res.referenceId, `Phone "${phone}" failed receipt regex`).toMatch(REFERENCE_ID_REGEX);
      expect(res.whatsappHref).toContain(`wa.me/${CONSULTANT_WHATSAPP_DIGITS}`);
      await page.locator('#consult-close-btn').click();
      await expect(page.locator('#consult-modal')).toBeHidden();
    }
  });

  test('[T2-F16-03][F-16][EC-09] Accepts valid international numbers (+971, +44) and rejects too-short/too-long international strings', async ({
    page,
  }) => {
    await page.goto('/?lang=en&stage=project&gov=alexandria&project=sawary');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    // Reject boundary invalid international strings
    await page.locator('#consult-open-btn').click();
    await page.locator('#consult-name').fill('Global Investor');
    for (const badIntl of ['+123', '+12345678901234567']) {
      await page.locator('#consult-phone').fill(badIntl);
      await page.locator('#consult-submit-btn').click();
      await expect(page.locator('#consult-confirmation')).toBeHidden();
      await expect(page.locator('#consult-phone')).toHaveAttribute('aria-invalid', 'true');
    }

    // Accept valid international numbers
    for (const validIntl of ['+971501234567', '+447700900123']) {
      const res = await submitValidConsultation(page, {
        name: 'Global Investor',
        phone: validIntl,
      });
      expect(res.referenceId).toMatch(REFERENCE_ID_REGEX);
      await page.locator('#consult-close-btn').click();
      await expect(page.locator('#consult-modal')).toBeHidden();
    }
  });

  test('[T2-F16-04][F-16][EC-09] Double-submit prevention produces single receipt and exact single localStorage entry', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=alexandria&project=sawary');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    await page.locator('#consult-open-btn').click();
    await page.locator('#consult-name').fill('سامي منصور');
    await page.locator('#consult-phone').fill('01012345678');

    const beforeCount = await page.evaluate(() => {
      let count = 0;
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const k = window.localStorage.key(i);
        if (!k) continue;
        const val = window.localStorage.getItem(k) ?? '';
        const matches = val.match(/REQ-20\d{2}-[A-Z0-9]{4,}/g);
        if (matches) count += matches.length;
      }
      return count;
    });

    await page.locator('#consult-submit-btn').dblclick();
    await expect(page.locator('#consult-confirmation')).toBeVisible();
    const refId = ((await page.locator('#consult-reference-id').textContent()) ?? '').trim();
    expect(refId).toMatch(REFERENCE_ID_REGEX);

    const storageAfter = await page.evaluate((expectedRef: string) => {
      let count = 0;
      let containsRef = false;
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const k = window.localStorage.key(i);
        if (!k) continue;
        const val = window.localStorage.getItem(k) ?? '';
        const matches = val.match(/REQ-20\d{2}-[A-Z0-9]{4,}/g);
        if (matches) count += matches.length;
        if (val.includes(expectedRef)) containsRef = true;
      }
      return { count, containsRef };
    }, refId);

    expect(
      storageAfter.count - beforeCount,
      'Double-submit must persist exactly 1 consultation entry in localStorage (neither 0 nor 2)',
    ).toBe(1);
    expect(
      storageAfter.containsRef,
      `Expected persisted localStorage receipt to contain ${refId}`,
    ).toBe(true);
  });

  test('[T2-F16-05][F-16][EC-10] Context prefill and typed form fields persist verbatim across mid-modal AR <-> EN toggle', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=alexandria&project=san-stefano');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    await page.locator('#consult-open-btn').click();
    const modal = page.locator('#consult-modal');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('سان ستيفانو');

    await page.locator('#consult-name').fill('أحمد محمود');
    await page.locator('#consult-phone').fill('01012345678');
    await page.locator('#consult-notes').fill('مهتم بوحدة مطلة على البحر');

    await page.locator('#lang-toggle-btn').click();
    await expect(page.locator('#app-shell')).toHaveAttribute('data-lang', 'en');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');

    await expect(modal).toBeVisible();
    await expect(page.locator('#consult-name')).toHaveValue('أحمد محمود');
    await expect(page.locator('#consult-phone')).toHaveValue('01012345678');
    await expect(page.locator('#consult-notes')).toHaveValue('مهتم بوحدة مطلة على البحر');

    await page.locator('#consult-submit-btn').click();
    await expect(page.locator('#consult-confirmation')).toBeVisible();
    const wa = await assertSafeWhatsAppLink(page.locator('#consult-whatsapp-link'), /San Stefano/i);
    expect(wa.decodedText).toMatch(/[A-Za-z]{4,}/);
  });

  test('[T2-F16-06][F-16] Partial multi-field error recovery clears name error independently while keeping phone invalid until corrected', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=cairo&project=il-bosco-nac');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    await page.locator('#consult-open-btn').click();
    const nameInput = page.locator('#consult-name');
    const phoneInput = page.locator('#consult-phone');
    const submitBtn = page.locator('#consult-submit-btn');

    // Step 1: Submit with invalid 1-char name AND invalid Egyptian carrier 019
    await nameInput.fill('ر');
    await phoneInput.fill('01912345678');
    await submitBtn.click();
    await expect(nameInput).toHaveAttribute('aria-invalid', 'true');
    await expect(phoneInput).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#consult-confirmation')).toBeHidden();

    // Step 2: Correct ONLY name -> name error must clear while phone remains invalid
    await nameInput.fill('رامي عادل');
    await submitBtn.click();
    const nameInvalidAfterFix = await nameInput.getAttribute('aria-invalid');
    expect(nameInvalidAfterFix === 'false' || nameInvalidAfterFix === null).toBe(true);
    await expect(phoneInput).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#consult-confirmation')).toBeHidden();

    // Step 3: Correct phone to valid Egyptian mobile -> submits cleanly with verified receipt
    await phoneInput.fill('01280249440');
    await submitBtn.click();
    await expect(page.locator('#consult-confirmation')).toBeVisible();
    const refId = ((await page.locator('#consult-reference-id').textContent()) ?? '').trim();
    expect(refId).toMatch(REFERENCE_ID_REGEX);
  });

  test('[T2-F16-07][F-16] Consultation booking succeeds 100% offline and sanitizes XSS payloads in notes', async ({
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
        name: 'Test User',
        phone: '01012345678',
        notes: '<script>window.__notesXss=1</script><img src=x onerror=window.__notesXss=2>',
      });
      expect(result.referenceId).toMatch(REFERENCE_ID_REGEX);

      await expect(page.locator('#consult-modal script, #consult-modal img[src="x"]')).toHaveCount(0);
      const xssFlag = await page.evaluate(
        () => (window as unknown as Record<string, unknown>).__notesXss,
      );
      expect(xssFlag).toBeUndefined();
    } finally {
      await context.setOffline(false);
    }
  });

  // ── F-17: Direct WhatsApp & Quick-Call Actions (5) ──

  test('[T2-F17-01][F-17] Multi-governorate WhatsApp E.164 audit enforces zero local/placeholder phone leaks and 4 distinct payloads', async ({
    page,
  }) => {
    const targets = [
      { gov: 'alexandria', project: 'san-stefano', re: /سان ستيفانو|San Stefano/i },
      { gov: 'matrouh', project: 'marassi', re: /مراسي|Marassi/i },
      { gov: 'giza', project: 'zed-west', re: /زيد ويست|ZED West/i },
      { gov: 'suez', project: 'azha-sokhna', re: /أزها|ازها|Azha/i },
    ] as const;

    const decodedPayloads: string[] = [];

    for (const target of targets) {
      await page.goto(`/?stage=project&gov=${target.gov}&project=${target.project}`);
      await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

      const links = page.locator('#project-inspector a[href*="wa.me"]:visible');
      const count = await links.count();
      expect(count, `Expected visible WhatsApp link on ${target.project}`).toBeGreaterThanOrEqual(1);

      const first = await assertSafeWhatsAppLink(links.first(), target.re);
      expect(first.href).not.toContain('wa.me/012');
      expect(first.href).not.toContain('wa.me/+');
      expect(first.href).not.toContain('201000000000');
      const pathPart = new URL(first.href).pathname;
      expect(pathPart).toBe(`/${CONSULTANT_WHATSAPP_DIGITS}`);
      decodedPayloads.push(first.decodedText);
    }

    expect(
      new Set(decodedPayloads).size,
      'Expected 4 distinct project-specific WhatsApp payloads across 4 governorates',
    ).toBe(4);
  });

  test('[T2-F17-02][F-17] Project WhatsApp CTA encodes clean bilingual UTF-8 message without double-encoding', async ({
    page,
  }) => {
    await page.goto('/?lang=ar&stage=project&gov=alexandria&project=sawary');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    await assertSafeWhatsAppLink(
      page.locator('#project-inspector a[href*="wa.me"]').first(),
      /صواري/,
    );

    await page.locator('#lang-toggle-btn').click();
    await expect(page.locator('#app-shell')).toHaveAttribute('data-lang', 'en');
    await assertSafeWhatsAppLink(
      page.locator('#project-inspector a[href*="wa.me"]').first(),
      /Sawary/i,
    );
  });

  test('[T2-F17-03][F-17] Quick-call tel: anchors stay strictly formatted across AR/EN and meet >=44px mobile tap target', async ({
    page,
  }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);

    for (const lang of ['ar', 'en'] as const) {
      await page.goto(`/?lang=${lang}&stage=project&gov=alexandria&project=sawary`);
      await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

      await page.locator('#profile-open-btn').click();
      const modal = page.locator('#consultant-profile-modal');
      await expect(modal).toBeVisible();

      const telLinks = modal.locator('a[href^="tel:"]');
      const count = await telLinks.count();
      expect(count).toBeGreaterThanOrEqual(1);
      for (let i = 0; i < count; i += 1) {
        const link = telLinks.nth(i);
        const href = (await link.getAttribute('href')) ?? '';
        expect(href).toMatch(CONSULTANT_TEL_HREF_REGEX);
        expect(href).not.toMatch(/[\s-]/);
        await link.scrollIntoViewIfNeeded();
        await assertTapTargetSize(link, 44);
      }
      await page.keyboard.press('Escape');
      await expect(modal).toBeHidden();
    }
  });

  test('[T2-F17-04][F-17] Post-booking consult-whatsapp-link embeds Reference ID, client name, and active project', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=alexandria&project=palm-hills-alex');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    const res = await submitValidConsultation(page, {
      name: 'Kareem',
      phone: '01012345678',
    });

    expect(res.decodedWhatsappText).toContain(res.referenceId);
    expect(res.decodedWhatsappText).toContain('Kareem');
    expect(res.decodedWhatsappText).toMatch(/بالم هيلز|Palm Hills/i);
  });

  test('[T2-F17-05][F-17] Adversarial special characters (& ? # %) in booking brief remain safely encoded with zero query-param injection', async ({
    page,
  }) => {
    await page.goto('/?lang=en&stage=project&gov=red-sea&project=el-gouna');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    const res = await submitValidConsultation(page, {
      name: 'Tarek & Sons #1',
      phone: '+971501234567',
      notes: 'Budget 100% cash? Share 2D/3D & price',
    });

    const waUrl = new URL(res.whatsappHref);
    expect(
      Array.from(waUrl.searchParams.keys()),
      'Special characters (&, ?, #, %) in brief must not inject extra URL query params',
    ).toEqual(['text']);
    expect(res.decodedWhatsappText).toContain(res.referenceId);
    expect(res.decodedWhatsappText).toMatch(/El Gouna/i);
    expect(res.decodedWhatsappText).toContain('Tarek & Sons #1');
  });

  // ── F-18: Project Comparison Shortlist (Up to 3 Projects) (5) ──

  test('[T2-F18-01][F-18][EC-11] 4th shortlist item is rejected with localized cap notice in BOTH AR and EN keeping original 3 intact', async ({
    page,
  }) => {
    await page.goto('/?stage=governorate&gov=alexandria');
    await waitForAppReady(page, { expectedStage: 'governorate', waitForMap: true });

    await page.locator('#shortlist-toggle-sawary').click();
    await page.locator('#shortlist-toggle-palm-hills-alex').click();
    await page.locator('#shortlist-toggle-creeks-alex').click();
    expect(await getShortlistBadgeCount(page)).toBe(3);

    // 4th attempt in Arabic
    await page.locator('#shortlist-toggle-alex-west').click();
    await nextFrames(page, 2);
    const arNotice = page.locator('[role="status"], [role="alert"]').filter({
      hasText: /3|٣|أقصى|حد/,
    });
    await expect(arNotice.first()).toBeVisible();
    expect(await getShortlistBadgeCount(page)).toBe(3);

    // Switch to English and attempt another 4th item
    await page.locator('#lang-toggle-btn').click();
    await expect(page.locator('#app-shell')).toHaveAttribute('data-lang', 'en');
    const murujToggle = page.locator('#shortlist-toggle-muruj-smouha');
    await murujToggle.scrollIntoViewIfNeeded();
    await murujToggle.click();
    await nextFrames(page, 2);
    const enNotice = page.locator('[role="status"], [role="alert"]').filter({
      hasText: /3|max|limit|shortlist/i,
    });
    await expect(enNotice.first()).toBeVisible();
    expect(await getShortlistBadgeCount(page)).toBe(3);

    await page.locator('#shortlist-open-btn').click();
    const drawer = page.locator('#shortlist-drawer');
    await expect(drawer).toContainText(/Sawary/i);
    await expect(drawer).toContainText(/Palm Hills/i);
    await expect(drawer).toContainText(/CREEKS/i);
    await expect(drawer).not.toContainText(/Alex West/i);
    await expect(drawer).not.toContainText(/Muruj/i);
  });

  test('[T2-F18-02][F-18][EC-11] Removing 1 shortlisted project frees a slot for adding a 4th project', async ({
    page,
  }) => {
    await page.goto('/?stage=governorate&gov=alexandria');
    await waitForAppReady(page, { expectedStage: 'governorate', waitForMap: true });

    await page.locator('#shortlist-toggle-sawary').click();
    await page.locator('#shortlist-toggle-palm-hills-alex').click();
    await page.locator('#shortlist-toggle-creeks-alex').click();
    expect(await getShortlistBadgeCount(page)).toBe(3);

    await page.locator('#shortlist-open-btn').click();
    await removeFromShortlistDrawer(page, 'palm-hills-alex');
    expect(await getShortlistBadgeCount(page)).toBe(2);
    await page.keyboard.press('Escape');

    await page.locator('#shortlist-toggle-alex-west').click();
    expect(await getShortlistBadgeCount(page)).toBe(3);

    await page.locator('#shortlist-open-btn').click();
    const drawer = page.locator('#shortlist-drawer');
    await expect(drawer).toContainText(/صواري|Sawary/i);
    await expect(drawer).toContainText(/كريكس|CREEKS/i);
    await expect(drawer).toContainText(/أليكس ويست|Alex West/i);
    await expect(drawer).not.toContainText(/بالم هيلز|Palm Hills/i);
  });

  test('[T2-F18-03][F-18] Shortlist persists across reload and recovers gracefully from corrupted localStorage JSON', async ({
    page,
  }) => {
    await page.goto('/?stage=governorate&gov=alexandria');
    await waitForAppReady(page, { expectedStage: 'governorate', waitForMap: true });

    await page.locator('#shortlist-toggle-sawary').click();
    await page.locator('#shortlist-toggle-san-stefano').click();
    expect(await getShortlistBadgeCount(page)).toBe(2);

    await page.reload();
    await waitForAppReady(page, { waitForMap: true });
    expect(await getShortlistBadgeCount(page)).toBe(2);

    // Corrupt non-locale localStorage entries via opaque-box value inspection (HYG-01)
    await page.evaluate(() => {
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const key = window.localStorage.key(i);
        if (!key) continue;
        const val = (window.localStorage.getItem(key) ?? '').trim();
        if (val === 'ar' || val === 'en' || val === '"ar"' || val === '"en"') continue;
        window.localStorage.setItem(key, '{invalid-json!!!');
      }
    });

    await page.reload();
    await waitForAppReady(page, { waitForMap: true });
    expect(await getShortlistBadgeCount(page)).toBe(0);

    await page.locator('#shortlist-toggle-sawary').click();
    expect(await getShortlistBadgeCount(page)).toBe(1);
  });

  test('[T2-F18-04][F-18] Shortlist consultation from Hero prefills all 3 items and drops removed project on subsequent open', async ({
    page,
  }) => {
    await page.goto('/?stage=governorate&gov=alexandria');
    await waitForAppReady(page, { expectedStage: 'governorate', waitForMap: true });
    await page.locator('#shortlist-toggle-sawary').click();

    await page.locator('#gov-card-matrouh').click();
    await waitForStage(page, 'governorate');
    await page.locator('#shortlist-toggle-marassi').click();

    await page.locator('#gov-card-red-sea').click();
    await waitForStage(page, 'governorate');
    await page.locator('#shortlist-toggle-el-gouna').click();

    // Return to Hero and launch multi-project consultation from Shortlist Drawer
    await page.locator('#breadcrumb-hero').click();
    await waitForStage(page, 'hero');
    await page.locator('#shortlist-open-btn').click();
    await page.locator('#shortlist-consult-btn').click();

    await expect(page.locator('#shortlist-drawer')).toBeHidden();
    const modal = page.locator('#consult-modal');
    await expect(modal).toBeVisible();
    await expect(modal.locator('#consult-notes')).toBeVisible();

    const contextBefore = await modal.evaluate((el) => {
      const notes = (el.querySelector('#consult-notes') as HTMLTextAreaElement | null)?.value ?? '';
      return `${el.textContent ?? ''} ${notes}`;
    });
    expect(contextBefore).toMatch(/صواري|Sawary/i);
    expect(contextBefore).toMatch(/مراسي|Marassi/i);
    expect(contextBefore).toMatch(/الجونة|El Gouna/i);

    // Close modal, remove Marassi from shortlist, re-open consultation and confirm zero stale Marassi
    await page.locator('#consult-close-btn').click();
    await expect(modal).toBeHidden();

    await page.locator('#shortlist-open-btn').click();
    await removeFromShortlistDrawer(page, 'marassi');
    expect(await getShortlistBadgeCount(page)).toBe(2);
    await page.locator('#shortlist-consult-btn').click();
    await expect(modal).toBeVisible();

    const contextAfter = await modal.evaluate((el) => {
      const notes = (el.querySelector('#consult-notes') as HTMLTextAreaElement | null)?.value ?? '';
      return `${el.textContent ?? ''} ${notes}`;
    });
    expect(contextAfter).toMatch(/صواري|Sawary/i);
    expect(contextAfter).toMatch(/الجونة|El Gouna/i);
    expect(contextAfter).not.toMatch(/مراسي|Marassi/i);
  });

  test('[T2-F18-05][F-18] Empty shortlist renders localized AR/EN empty state with non-actionable consult CTA and toggles cleanly on add/remove', async ({
    page,
  }) => {
    await page.goto('/?stage=governorate&gov=alexandria');
    await waitForAppReady(page, { expectedStage: 'governorate', waitForMap: true });

    await page.locator('#shortlist-open-btn').click();
    const drawer = page.locator('#shortlist-drawer');
    await expect(drawer).toBeVisible();
    expect(await getShortlistBadgeCount(page)).toBe(0);

    // Verify localized AR empty-state copy unconditionally
    const arEmptyCopy = ((await drawer.innerText()) ?? '').trim();
    expect(
      arEmptyCopy.length,
      'Empty #shortlist-drawer must display helpful Arabic empty-state copy',
    ).toBeGreaterThan(10);
    expect(arEmptyCopy).toMatch(/[\u0600-\u06FF]/);
    await assertZeroRawI18nKeys(page, '#shortlist-drawer');

    const consultBtn = drawer.locator('#shortlist-consult-btn');
    const isConsultActionableAr = (await consultBtn.isVisible()) && (await consultBtn.isEnabled());
    expect(
      isConsultActionableAr,
      '#shortlist-consult-btn must be hidden or disabled when shortlist is empty',
    ).toBe(false);

    // Verify localized EN empty-state copy unconditionally
    await page.locator('#lang-toggle-btn').click();
    await expect(page.locator('#app-shell')).toHaveAttribute('data-lang', 'en');
    await expect(drawer).toBeVisible();
    const enEmptyCopy = ((await drawer.innerText()) ?? '').trim();
    expect(
      enEmptyCopy.length,
      'Empty #shortlist-drawer must display helpful English empty-state copy',
    ).toBeGreaterThan(10);
    expect(enEmptyCopy).toMatch(/[A-Za-z]{4,}/);
    await assertZeroRawI18nKeys(page, '#shortlist-drawer');

    // Add 1 project -> consult button becomes actionable -> remove last project -> returns to empty state
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();

    const sanToggle = page.locator('#shortlist-toggle-san-stefano');
    await sanToggle.scrollIntoViewIfNeeded();
    await sanToggle.click();
    expect(await getShortlistBadgeCount(page)).toBe(1);

    await page.locator('#shortlist-open-btn').click();
    await expect(drawer).toBeVisible();
    await expect(consultBtn).toBeVisible();
    await expect(consultBtn).toBeEnabled();

    await removeFromShortlistDrawer(page, 'san-stefano');
    await nextFrames(page, 2);
    expect(await getShortlistBadgeCount(page)).toBe(0);
    const isConsultActionableAfterRemove =
      (await consultBtn.isVisible()) && (await consultBtn.isEnabled());
    expect(isConsultActionableAfterRemove).toBe(false);
  });
});
