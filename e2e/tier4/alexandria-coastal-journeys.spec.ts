import { test, expect } from '../fixtures';
import {
  CONSULTANT_NAME_AR_REGEX,
  assertSafeWhatsAppLink,
  countVisibleMapPins,
  driveScrollDive,
  extractZoneId,
  getAppShellState,
  getShortlistBadgeCount,
  nextFrames,
  normalizeDigits,
  selectZoneAndResolveLabel,
  submitValidConsultation,
  waitForCameraSettled,
  waitForStage,
} from '../helpers';

test.describe('Tier 4 — Real-World Persona Scenarios: Alexandria & Coastal Buyers (S-01..S-04)', () => {
  test('[S-01] Alexandria Family Comparing Sawary & Palm Hills Alexandria (Shortlist + Multi-Project Consultation)', async ({
    appPage,
  }) => {
    // 1. Hero identity & zero-autoplay verification
    await expect(appPage.locator('#app-shell')).toContainText(CONSULTANT_NAME_AR_REGEX);
    await appPage.waitForTimeout(2500);
    await expect(appPage.locator('#app-shell')).toHaveAttribute('data-stage', 'hero');
    await expect(appPage.locator('#app-shell')).toHaveAttribute('data-scroll-progress', '0.00');

    // 2. Scroll-scrubbed dive into Egypt Overview
    for (let i = 0; i < 22; i += 1) {
      const cur = await getAppShellState(appPage);
      if (cur.stage === 'egypt' && cur.scrollProgress >= 0.99) break;
      await driveScrollDive(appPage, 2, 260, { assertMoved: false });
    }
    await waitForStage(appPage, 'egypt');

    // 3. Flagship Alexandria focus & 8-project drawer verification
    await appPage.locator('#gov-card-alexandria').click();
    await waitForStage(appPage, 'governorate');
    await expect(appPage.locator('#governorate-drawer [id^="project-card-"]')).toHaveCount(8);

    // 4. Shortlist Sawary, inspect 2D/3D Master Plan & architectural zone
    await appPage.locator('#shortlist-toggle-sawary').click();
    expect(await getShortlistBadgeCount(appPage)).toBe(1);

    await appPage.locator('#project-card-sawary').click();
    await waitForStage(appPage, 'project');
    await expect(appPage.locator('#app-shell')).toHaveAttribute('data-masterplan-mode', '2d');

    await appPage.locator('#masterplan-mode-3d').click();
    await waitForCameraSettled(appPage);
    await expect(appPage.locator('#app-shell')).toHaveAttribute('data-masterplan-mode', '3d');

    const sawaryZone = appPage.locator('[id^="masterplan-zone-btn-"]').first();
    const sawaryZoneId = extractZoneId((await sawaryZone.getAttribute('id')) ?? '');
    await sawaryZone.click();
    await expect(appPage.locator('#app-shell')).toHaveAttribute('data-parcel', sawaryZoneId);
    await expect(appPage.locator('#masterplan-zone-panel')).toBeVisible();

    // 5. Return to Alexandria, inspect & shortlist Palm Hills Alexandria
    await appPage.locator('#project-back-btn').click();
    await waitForStage(appPage, 'governorate');

    await appPage.locator('#project-card-palm-hills-alex').click();
    await waitForStage(appPage, 'project');
    await expect(appPage.locator('#project-inspector')).toContainText(/بالم هيلز|Palm Hills/i);
    await appPage.locator('#shortlist-toggle-palm-hills-alex').click();
    expect(await getShortlistBadgeCount(appPage)).toBe(2);

    // 6. Side-by-side shortlist comparison & multi-project consultation booking
    await appPage.locator('#shortlist-open-btn').click();
    const drawer = appPage.locator('#shortlist-drawer');
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText(/صواري|Sawary/i);
    await expect(drawer).toContainText(/بالم هيلز|Palm Hills/i);

    await appPage.locator('#shortlist-consult-btn').click();
    const result = await submitValidConsultation(appPage, {
      name: 'طارق المنشاوي',
      phone: '01012345678',
      notes: 'مقارنة وحدات سكنية للعائلة بين صواري وبالم هيلز',
    });

    const persisted = await appPage.evaluate((refId: string) => {
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const k = window.localStorage.key(i);
        if (k && (window.localStorage.getItem(k) ?? '').includes(refId)) return true;
      }
      return false;
    }, result.referenceId);
    expect(persisted).toBe(true);
    expect(result.decodedWhatsappText).toMatch(/صواري|Sawary/i);
    expect(result.decodedWhatsappText).toMatch(/بالم هيلز|Palm Hills/i);
  });

  test('[S-02] Corniche Luxury Buyer Inspecting San Stefano & Booking Zone-Specific WhatsApp Consultation', async ({
    appPage,
  }) => {
    // 1. Check Abdullah's credentials in Consultant Profile Modal
    await appPage.locator('#hero-about-btn').click();
    const profileModal = appPage.locator('#consultant-profile-modal');
    await expect(profileModal).toBeVisible();
    await expect(profileModal).toContainText(CONSULTANT_NAME_AR_REGEX);
    await appPage.keyboard.press('Escape');
    await expect(profileModal).toBeHidden();

    // 2. Dive to Egypt and filter ready_to_move (4 verified ready projects)
    await appPage.locator('#hero-explore-btn').click();
    await waitForStage(appPage, 'egypt');

    await appPage.locator('#filter-status-ready_to_move').click();
    await nextFrames(appPage, 2);
    expect(await countVisibleMapPins(appPage)).toBe(4);

    // 3. Enter Alexandria & open San Stefano Grand Plaza
    await appPage.locator('#gov-card-alexandria').click();
    await waitForStage(appPage, 'governorate');

    await appPage.locator('#project-card-san-stefano').click();
    await waitForStage(appPage, 'project');

    const summaryText = normalizeDigits(
      (await appPage.locator('#project-inspector').textContent()) ?? '',
    );
    expect(summaryText).toMatch(/طلعت مصطفى|Talaat Moustafa|TMG/i);
    expect(summaryText).toMatch(/17/);

    // 4. Switch to 3D massing, click seafront/tower zone, and inquire
    await appPage.locator('#masterplan-mode-3d').click();
    await waitForCameraSettled(appPage);

    const { zoneLabel, matchToken } = await selectZoneAndResolveLabel(appPage, 0);

    await appPage.locator('#masterplan-zone-inquire-btn').click();
    const result = await submitValidConsultation(appPage, {
      name: 'ياسمين السعيد',
      phone: '01280249440',
    });

    expect(result.decodedWhatsappText).toContain(result.referenceId);
    expect(result.decodedWhatsappText).toMatch(/سان ستيفانو|San Stefano/i);
    expect(
      result.decodedWhatsappText,
      `Expected WhatsApp brief to bind selected zone "${zoneLabel}" (token "${matchToken}")`,
    ).toContain(matchToken);
  });

  test('[S-03] North Coast Summer-Home Buyer Exploring Marassi & Hacienda Waters', async ({
    appPage,
  }) => {
    await appPage.locator('#hero-explore-btn').click();
    await waitForStage(appPage, 'egypt');

    // 1. Arabic search for Matrouh -> Governorate Focus (3 projects)
    await appPage.locator('#egypt-search-input').fill('مطروح');
    await appPage
      .locator('#egypt-search-results')
      .locator('button, [role="option"], a')
      .filter({ hasText: /مطروح|Matrouh/i })
      .first()
      .click();

    await waitForStage(appPage, 'governorate');
    await expect(appPage.locator('#app-shell')).toHaveAttribute('data-governorate', 'matrouh');
    await expect(appPage.locator('#governorate-drawer [id^="project-card-"]')).toHaveCount(3);

    // 2. Open Marassi, test legend filter & zone Escape dismissal
    await appPage.locator('#project-card-marassi').click();
    await waitForStage(appPage, 'project');

    const legendItem = appPage.locator('[id^="masterplan-legend-item-"]').first();
    await legendItem.click();
    await nextFrames(appPage, 2);

    await appPage.locator('[id^="masterplan-zone-btn-"]').first().click();
    await expect(appPage.locator('#masterplan-zone-panel')).toBeVisible();
    await appPage.keyboard.press('Escape');
    await expect(appPage.locator('#masterplan-zone-panel')).toBeHidden();
    await expect(appPage.locator('#app-shell')).toHaveAttribute('data-project', 'marassi');

    // 3. Step to sibling Hacienda Waters in 3D & verify metadata + WhatsApp CTA
    await appPage.locator('#project-next-btn').click();
    await waitForCameraSettled(appPage);
    if ((await appPage.locator('#app-shell').getAttribute('data-project')) !== 'hacienda-waters') {
      await appPage.locator('#project-next-btn').click();
      await waitForCameraSettled(appPage);
    }
    await expect(appPage.locator('#app-shell')).toHaveAttribute('data-project', 'hacienda-waters');

    await appPage.locator('#masterplan-mode-3d').click();
    await waitForCameraSettled(appPage);

    const inspectorText = normalizeDigits(
      (await appPage.locator('#project-inspector').textContent()) ?? '',
    );
    expect(inspectorText).toMatch(/بالم هيلز|Palm Hills/i);
    expect(inspectorText).toMatch(/161/);
    await assertSafeWhatsAppLink(
      appPage.locator('#project-inspector a[href*="wa.me"]').first(),
      /هاسيندا|Hacienda/i,
    );
  });

  test('[S-04] Red Sea & Ain Sokhna Coastal Investor Comparing El Gouna, Somabay & Azha (3-Project Cap + Consultation)', async ({
    appPage,
  }) => {
    await appPage.locator('#hero-explore-btn').click();
    await waitForStage(appPage, 'egypt');

    // 1. Explore chalet cohort then reset
    await appPage.locator('#filter-category-chalet').click();
    await nextFrames(appPage, 2);
    expect(await countVisibleMapPins(appPage)).toBeGreaterThanOrEqual(4);
    await appPage.locator('#filter-reset-btn').click();
    await nextFrames(appPage, 2);

    // 2. Red Sea: shortlist El Gouna and Somabay
    await appPage.locator('#gov-card-red-sea').click();
    await waitForStage(appPage, 'governorate');

    await appPage.locator('#project-card-el-gouna').click();
    await waitForStage(appPage, 'project');
    await appPage.locator('#shortlist-toggle-el-gouna').click();

    await appPage.locator('#project-back-btn').click();
    await waitForStage(appPage, 'governorate');
    await appPage.locator('#project-card-somabay').click();
    await waitForStage(appPage, 'project');
    await appPage.locator('#shortlist-toggle-somabay').click();

    // 3. Lateral switch to Suez -> Azha 3D + 3rd shortlist slot
    await appPage.locator('#breadcrumb-egypt').click();
    await waitForStage(appPage, 'egypt');
    await appPage.locator('#gov-card-suez').click();
    await waitForStage(appPage, 'governorate');

    await appPage.locator('#project-card-azha-sokhna').click();
    await waitForStage(appPage, 'project');
    await appPage.locator('#masterplan-mode-3d').click();
    await waitForCameraSettled(appPage);
    await appPage.locator('#shortlist-toggle-azha-sokhna').click();
    expect(await getShortlistBadgeCount(appPage)).toBe(3);

    // 4. Attempt 4th shortlist item (IL Monte Galala) -> verify localized cap toast
    await appPage.locator('#project-next-btn').click();
    await waitForCameraSettled(appPage);
    await expect(appPage.locator('#app-shell')).toHaveAttribute('data-project', 'il-monte-galala');
    await appPage.locator('#shortlist-toggle-il-monte-galala').click();
    await nextFrames(appPage, 2);

    const capNotice = appPage.locator('[role="status"], [role="alert"]').filter({
      hasText: /3|٣|أقصى|حد|maximum|limit/i,
    });
    await expect(capNotice.first()).toBeVisible();
    expect(await getShortlistBadgeCount(appPage)).toBe(3);

    // 5. Open Shortlist & submit unified 3-project consultation
    await appPage.locator('#shortlist-open-btn').click();
    await appPage.locator('#shortlist-consult-btn').click();
    const result = await submitValidConsultation(appPage, {
      name: 'خالد عبد الرحمن',
      phone: '+20 111 555 8899',
    });

    expect(result.decodedWhatsappText).toMatch(/الجونة|El Gouna/i);
    expect(result.decodedWhatsappText).toMatch(/سوما باي|Somabay/i);
    expect(result.decodedWhatsappText).toMatch(/أزها|Azha/i);
  });
});
