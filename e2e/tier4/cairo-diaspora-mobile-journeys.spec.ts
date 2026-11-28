import { test, expect } from '../fixtures';
import {
  CONSULTANT_NAME_EN_REGEX,
  CONSULTANT_TITLE_EN_REGEX,
  MOBILE_VIEWPORT,
  assertNoHorizontalOverflow,
  assertTapTargetSize,
  countVisibleMapPins,
  getShortlistBadgeCount,
  nextFrames,
  normalizeDigits,
  requireBoundingBox,
  selectDeveloperOption,
  submitValidConsultation,
  waitForAppReady,
  waitForCameraSettled,
  waitForStage,
} from '../helpers';

test.describe('Tier 4 — Real-World Persona Scenarios: Cairo, Giza, Diaspora & Mobile (S-05..S-08)', () => {
  test('[S-05] New Cairo & New Capital Investor Comparing Madinaty, Bloomfields & IL Bosco', async ({
    appPage,
  }) => {
    await appPage.locator('#hero-explore-btn').click();
    await waitForStage(appPage, 'egypt');

    // 1. Focus Cairo via map marker and confirm 3 developments
    await appPage.locator('#gov-marker-cairo').click();
    await waitForStage(appPage, 'governorate');
    await expect(appPage.locator('#app-shell')).toHaveAttribute('data-governorate', 'cairo');
    await expect(appPage.locator('#governorate-drawer [id^="project-card-"]')).toHaveCount(3);

    // 2. Test bidirectional hover sync on Madinaty
    await appPage.locator('#project-card-madinaty').hover();
    await nextFrames(appPage, 2);
    await expect(appPage.locator('#map-pin-madinaty')).toBeVisible();

    // 3. Shortlist Madinaty & Bloomfields from drawer, then inspect IL Bosco in 3D
    await appPage.locator('#shortlist-toggle-madinaty').click();
    await appPage.locator('#shortlist-toggle-bloomfields').click();

    await appPage.locator('#project-card-il-bosco-nac').click();
    await waitForStage(appPage, 'project');
    await appPage.locator('#masterplan-mode-3d').click();
    await waitForCameraSettled(appPage);

    await appPage.locator('[id^="masterplan-zone-btn-"]').first().click();
    await expect(appPage.locator('#masterplan-zone-panel')).toBeVisible();
    await appPage.locator('#shortlist-toggle-il-bosco-nac').click();
    expect(await getShortlistBadgeCount(appPage)).toBe(3);

    // 4. Compare 8,000 vs 415 vs 200 feddans in Shortlist Drawer & book consultation
    await appPage.locator('#shortlist-open-btn').click();
    const drawerText = normalizeDigits(
      (await appPage.locator('#shortlist-drawer').textContent()) ?? '',
    );
    expect(drawerText).toMatch(/8,?000/);
    expect(drawerText).toMatch(/415/);
    expect(drawerText).toMatch(/200/);

    await appPage.locator('#shortlist-consult-btn').click();
    const res = await submitValidConsultation(appPage, {
      name: 'عمرو الشناوي',
      phone: '01022334455',
    });
    expect(res.decodedWhatsappText).toMatch(/مدينتي|Madinaty/i);
    expect(res.decodedWhatsappText).toMatch(/بلومفيلدز|Bloomfields/i);
    expect(res.decodedWhatsappText).toMatch(/إل بوسكو|IL Bosco/i);
  });

  test('[S-06] West Cairo Giza Buyer Filtering Ora Developers & Inspecting ZED West & Solana West', async ({
    appPage,
  }) => {
    await appPage.locator('#hero-explore-btn').click();
    await waitForStage(appPage, 'egypt');

    // 1. Filter Ora Developers -> confirm 2 projects, then reset
    await selectDeveloperOption(appPage, /أورا للتطوير|Ora Developers/i);
    expect(await countVisibleMapPins(appPage)).toBe(2);
    await appPage.locator('#filter-reset-btn').click();
    await nextFrames(appPage, 2);

    // 2. Enter Giza -> open ZED West -> inspect 2D/3D zone + Reset View
    await appPage.locator('#gov-card-giza').click();
    await waitForStage(appPage, 'governorate');
    await appPage.locator('#project-card-zed-west').click();
    await waitForStage(appPage, 'project');

    await appPage.locator('[id^="masterplan-zone-btn-"]').first().click();
    await expect(appPage.locator('#masterplan-zone-panel')).toBeVisible();
    await appPage.locator('#masterplan-mode-3d').click();
    await waitForCameraSettled(appPage);
    await appPage.locator('#masterplan-reset-view-btn').click();
    await waitForCameraSettled(appPage);

    // 3. Switch to Solana West & test invalid phone -> valid phone recovery
    await appPage.locator('#project-back-btn').click();
    await waitForStage(appPage, 'governorate');
    await appPage.locator('#project-card-solana-west').click();
    await waitForStage(appPage, 'project');

    await appPage.locator('#consult-open-btn').click();
    await appPage.locator('#consult-name').fill('شريف حسني');
    await appPage.locator('#consult-phone').fill('01912345678');
    await appPage.locator('#consult-submit-btn').click();
    await expect(appPage.locator('#consult-phone')).toHaveAttribute('aria-invalid', 'true');
    await expect(appPage.locator('#consult-confirmation')).toBeHidden();

    await appPage.locator('#consult-phone').fill('01512345678');
    await appPage.locator('#consult-submit-btn').click();
    await expect(appPage.locator('#consult-confirmation')).toBeVisible();
    const refId = ((await appPage.locator('#consult-reference-id').textContent()) ?? '').trim();
    expect(refId).toMatch(/^REQ-20\d{2}-[A-Z0-9]{4,}$/);
  });

  test('[S-07] English-Speaking Diaspora Investor Using EN Mode, International Phone & Cross-Governorate Shortlist', async ({
    appPage,
  }) => {
    // 1. Flip Hero to English LTR
    await appPage.locator('#lang-toggle-btn').click();
    await expect(appPage.locator('#app-shell')).toHaveAttribute('data-lang', 'en');
    await expect(appPage.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(appPage.locator('#app-shell')).toContainText(CONSULTANT_NAME_EN_REGEX);
    await expect(appPage.locator('#app-shell')).toContainText(CONSULTANT_TITLE_EN_REGEX);

    // 2. Dive to Egypt & shortlist Sawary, Marassi, El Gouna across 3 governorates
    await appPage.locator('#hero-explore-btn').click();
    await waitForStage(appPage, 'egypt');

    const targets: Array<[string, RegExp, string]> = [
      ['sawary', /Sawary/i, 'sawary'],
      ['marassi', /Marassi/i, 'marassi'],
      ['el gouna', /El Gouna/i, 'el-gouna'],
    ];

    for (const [query, labelRe, slug] of targets) {
      await appPage.locator('#egypt-search-input').fill(query);
      await appPage
        .locator('#egypt-search-results')
        .locator('button, [role="option"], a')
        .filter({ hasText: labelRe })
        .first()
        .click();
      await waitForStage(appPage, 'project');
      await appPage.locator(`#shortlist-toggle-${slug}`).click();

      if (slug !== 'el-gouna') {
        await appPage.locator('#breadcrumb-egypt').click();
        await waitForStage(appPage, 'egypt');
      }
    }

    expect(await getShortlistBadgeCount(appPage)).toBe(3);

    // 3. Reload confirming BOTH EN locale and 3-project shortlist persist
    await appPage.reload();
    await waitForAppReady(appPage, { waitForMap: true });
    await expect(appPage.locator('#app-shell')).toHaveAttribute('data-lang', 'en');
    await expect(appPage.locator('html')).toHaveAttribute('dir', 'ltr');
    expect(await getShortlistBadgeCount(appPage)).toBe(3);

    // 4. Submit UAE international phone & verify English multi-project WhatsApp brief
    await appPage.locator('#shortlist-open-btn').click();
    await appPage.locator('#shortlist-consult-btn').click();

    const result = await submitValidConsultation(appPage, {
      name: 'Nadia Mansour',
      phone: '+971501234567',
      notes: 'Comparing coastal and Alexandria investment options from Dubai',
    });

    expect(result.decodedWhatsappText).toContain(result.referenceId);
    expect(result.decodedWhatsappText).toMatch(/Sawary/i);
    expect(result.decodedWhatsappText).toMatch(/Marassi/i);
    expect(result.decodedWhatsappText).toMatch(/El Gouna/i);
  });

  test.describe('S-08 Mobile 390x844 journey', () => {
    test.use({ viewport: MOBILE_VIEWPORT, hasTouch: true, isMobile: true });

    test('[S-08] Mobile 390x844 Smouha Commuter Browsing Muruj & Valore with Bottom Sheet Ergonomics', async ({
      appPage,
    }) => {
      // 1. Mobile Hero fold & tap target checks
      await assertNoHorizontalOverflow(appPage);
      await assertTapTargetSize(appPage.locator('#hero-explore-btn'), 44);
      const exploreBox = await requireBoundingBox(
        appPage.locator('#hero-explore-btn'),
        'Mobile #hero-explore-btn',
      );
      expect(exploreBox.y + exploreBox.height).toBeLessThanOrEqual(MOBILE_VIEWPORT.height);

      // 2. Dive -> Alexandria bottom sheet ergonomics & isolated scroll
      await appPage.locator('#hero-explore-btn').click();
      await waitForStage(appPage, 'egypt');
      await assertNoHorizontalOverflow(appPage);

      await appPage.locator('#gov-card-alexandria').click();
      await waitForStage(appPage, 'governorate');
      await assertNoHorizontalOverflow(appPage);

      const drawer = appPage.locator('#governorate-drawer');
      const drawerBox = await requireBoundingBox(drawer, 'Mobile #governorate-drawer');
      expect(drawerBox.y).toBeGreaterThanOrEqual(180);
      expect(drawerBox.height).toBeLessThanOrEqual(0.72 * MOBILE_VIEWPORT.height);

      await appPage.mouse.move(
        drawerBox.x + drawerBox.width / 2,
        drawerBox.y + drawerBox.height / 2,
      );
      await appPage.mouse.wheel(0, 360);
      await nextFrames(appPage, 3);
      await expect(appPage.locator('#app-shell')).toHaveAttribute('data-stage', 'governorate');

      // 3. Inspect Muruj Smouha -> zone -> step to Valore Smouha
      const murujCard = appPage.locator('#project-card-muruj-smouha');
      await murujCard.scrollIntoViewIfNeeded();
      await murujCard.click();
      await waitForStage(appPage, 'project');
      await assertNoHorizontalOverflow(appPage);

      await appPage.locator('[id^="masterplan-zone-btn-"]').first().click();
      await expect(appPage.locator('#masterplan-zone-panel')).toBeVisible();
      await appPage.keyboard.press('Escape');

      await appPage.locator('#project-back-btn').click();
      await waitForStage(appPage, 'governorate');
      const valoreCard = appPage.locator('#project-card-valore-smouha');
      await valoreCard.scrollIntoViewIfNeeded();
      await valoreCard.click();
      await waitForStage(appPage, 'project');
      await assertNoHorizontalOverflow(appPage);

      // 4. Mobile consultation submission
      const consultBtn = appPage.locator('#project-inspector #consult-open-btn').first();
      await consultBtn.scrollIntoViewIfNeeded();
      await assertTapTargetSize(consultBtn, 44);
      const res = await submitValidConsultation(appPage, {
        name: 'مريم عادل',
        phone: '01099887766',
        openSelector: '#project-inspector #consult-open-btn',
      });
      expect(res.referenceId).toMatch(/^REQ-20\d{2}-[A-Z0-9]{4,}$/);
      await assertNoHorizontalOverflow(appPage);
    });
  });
});
