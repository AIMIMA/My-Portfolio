import { test, expect } from '../fixtures';
import {
  assertSafeWhatsAppLink,
  extractZoneId,
  getProfileConsultButton,
  getShortlistBadgeCount,
  nextFrames,
  selectDeveloperOption,
  selectZoneAndResolveLabel,
  submitValidConsultation,
  waitForAppReady,
  waitForCameraSettled,
  waitForStage,
} from '../helpers';

test.describe('Tier 3 — Cross-Feature Pairwise: Master Plan & Conversion Funnel (T3-10..T3-17)', () => {
  test('[T3-10][F-11 x F-12] Toggling 2D <-> 3D while Legend filter and Zone Inspector are active preserves parcel selection and filter state', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=alexandria&project=sawary&view=2d');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    const legendItem = page.locator('[id^="masterplan-legend-item-"]').first();
    await legendItem.click();
    await nextFrames(page, 2);

    const firstZone = page.locator('[id^="masterplan-zone-btn-"]').first();
    const zoneId = extractZoneId((await firstZone.getAttribute('id')) ?? '');
    await firstZone.click();
    await expect(page.locator('#app-shell')).toHaveAttribute('data-parcel', zoneId);
    await expect(page.locator('#masterplan-zone-panel')).toBeVisible();

    await page.locator('#masterplan-mode-3d').click();
    await waitForCameraSettled(page);

    await expect(page.locator('#app-shell')).toHaveAttribute('data-masterplan-mode', '3d');
    await expect(page.locator('#app-shell')).toHaveAttribute('data-parcel', zoneId);
    await expect(page.locator('#masterplan-zone-panel')).toBeVisible();

    const legendStillActive = await legendItem.evaluate(
      (el) =>
        el.getAttribute('aria-pressed') === 'true' || el.getAttribute('data-active') === 'true',
    );
    expect(legendStillActive).toBe(true);
  });

  test('[T3-11][F-12 x F-19] Switching 2D <-> 3D syncs URL ?view=3d|2d and Browser Back/Forward restores exact Master Plan view mode', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=alexandria&project=sawary&view=2d');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    await page.locator('#masterplan-mode-3d').click();
    await waitForCameraSettled(page);
    expect(new URL(page.url()).searchParams.get('view')).toBe('3d');
    await expect(page.locator('#app-shell')).toHaveAttribute('data-masterplan-mode', '3d');

    await page.goBack();
    await waitForCameraSettled(page);
    await expect(page.locator('#app-shell')).toHaveAttribute('data-masterplan-mode', '2d');

    await page.goForward();
    await waitForCameraSettled(page);
    await expect(page.locator('#app-shell')).toHaveAttribute('data-masterplan-mode', '3d');
  });

  test('[T3-12][F-13 x F-16] Clicking Master Plan zone -> #masterplan-zone-inquire-btn -> valid booking binds Governorate, Project, and Zone into Receipt & WhatsApp', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=alexandria&project=sawary');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    const { zoneLabel, matchToken } = await selectZoneAndResolveLabel(page, 0);

    await page.locator('#masterplan-zone-inquire-btn').click();
    const result = await submitValidConsultation(page, {
      name: 'يوسف جمال',
      phone: '01012345678',
    });

    expect(result.decodedWhatsappText).toContain(result.referenceId);
    expect(result.decodedWhatsappText).toMatch(/صواري|Sawary/i);
    expect(
      result.decodedWhatsappText,
      `Expected WhatsApp brief to bind selected zone "${zoneLabel}" (token "${matchToken}")`,
    ).toContain(matchToken);
  });

  test('[T3-13][F-14 x F-10] Sibling switcher (#project-next-btn / #project-prev-btn) clears stale data-parcel, loads new Master Plan zones, and updates URL', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=alexandria&project=sawary');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    await page.locator('[id^="masterplan-zone-btn-"]').first().click();
    await expect(page.locator('#masterplan-zone-panel')).toBeVisible();

    await page.locator('#project-next-btn').click();
    await waitForCameraSettled(page);

    const nextProject = await page.locator('#app-shell').getAttribute('data-project');
    expect(nextProject).not.toBe('sawary');
    await expect(page.locator('#app-shell')).toHaveAttribute('data-parcel', 'none');
    await expect(page.locator('#masterplan-zone-panel')).toBeHidden();
    expect(new URL(page.url()).searchParams.get('project')).toBe(nextProject);
    expect(await page.locator('[id^="masterplan-zone-btn-"]').count()).toBeGreaterThanOrEqual(5);

    await page.locator('#project-prev-btn').click();
    await waitForCameraSettled(page);
    await expect(page.locator('#app-shell')).toHaveAttribute('data-project', 'sawary');
  });

  test('[T3-14][F-14 x F-17] Project Summary WhatsApp CTA dynamically re-encodes active project name when stepping across sibling developments', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=alexandria&project=sawary');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    const wa1 = await assertSafeWhatsAppLink(
      page.locator('#project-inspector a[href*="wa.me"]').first(),
      /صواري|Sawary/i,
    );

    await page.locator('#project-next-btn').click();
    await waitForCameraSettled(page);

    const wa2 = await assertSafeWhatsAppLink(
      page.locator('#project-inspector a[href*="wa.me"]').first(),
    );
    expect(wa2.decodedText).not.toBe(wa1.decodedText);
  });

  test('[T3-15][F-18 x F-06] Shortlisting developer-filtered projects across two governorates (Palm Hills Alex + Hacienda Waters) feeds unified multi-project consultation', async ({
    page,
  }) => {
    await page.goto('/?stage=egypt');
    await waitForAppReady(page, { expectedStage: 'egypt', waitForMap: true });

    await selectDeveloperOption(page, /بالم هيلز|Palm Hills/i);

    await page.locator('#map-pin-palm-hills-alex').click();
    await waitForStage(page, 'project');
    await page.locator('#shortlist-toggle-palm-hills-alex').click();

    await page.locator('#breadcrumb-egypt').click();
    await waitForStage(page, 'egypt');
    await page.locator('#map-pin-hacienda-waters').click();
    await waitForStage(page, 'project');
    await page.locator('#shortlist-toggle-hacienda-waters').click();

    expect(await getShortlistBadgeCount(page)).toBe(2);
    await page.locator('#shortlist-open-btn').click();
    await page.locator('#shortlist-consult-btn').click();

    const result = await submitValidConsultation(page, {
      name: 'أيمن توفيق',
      phone: '01212345678',
    });
    expect(result.decodedWhatsappText).toMatch(/بالم هيلز|Palm Hills/i);
    expect(result.decodedWhatsappText).toMatch(/هاسيندا|Hacienda/i);
  });

  test('[T3-16][F-15 x F-16] Opening Consultant Profile from San Stefano 3D -> launching Consultation -> closing preserves underlying San Stefano 3D state', async ({
    page,
  }) => {
    await page.goto('/?stage=project&gov=alexandria&project=san-stefano&view=3d');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });

    await page.locator('#profile-open-btn').click();
    await expect(page.locator('#consultant-profile-modal')).toBeVisible();

    const consultTrigger = await getProfileConsultButton(page);
    await consultTrigger.click();
    await expect(page.locator('#consultant-profile-modal')).toBeHidden();
    await expect(page.locator('#consult-modal')).toBeVisible();

    await page.locator('#consult-close-btn').click();
    await expect(page.locator('#consult-modal')).toBeHidden();

    const shell = page.locator('#app-shell');
    await expect(shell).toHaveAttribute('data-stage', 'project');
    await expect(shell).toHaveAttribute('data-governorate', 'alexandria');
    await expect(shell).toHaveAttribute('data-project', 'san-stefano');
    await expect(shell).toHaveAttribute('data-masterplan-mode', '3d');
  });

  test('[T3-17][F-18 x F-19] Deep-linking to a 3rd project with 2 persisted shortlisted items allows completing 3-project shortlist and enforces 4th-item cap', async ({
    page,
  }) => {
    await page.goto('/?stage=governorate&gov=alexandria');
    await waitForAppReady(page, { expectedStage: 'governorate', waitForMap: true });

    await page.locator('#shortlist-toggle-sawary').click();
    await page.locator('#shortlist-toggle-palm-hills-alex').click();
    expect(await getShortlistBadgeCount(page)).toBe(2);

    await page.goto('/?stage=project&gov=cairo&project=madinaty');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });
    await page.locator('#shortlist-toggle-madinaty').click();
    expect(await getShortlistBadgeCount(page)).toBe(3);

    await page.goto('/?stage=project&gov=red-sea&project=el-gouna');
    await waitForAppReady(page, { expectedStage: 'project', waitForMap: true });
    await page.locator('#shortlist-toggle-el-gouna').click();
    await nextFrames(page, 2);

    expect(await getShortlistBadgeCount(page)).toBe(3);
    const toast = page.locator('[role="status"], [role="alert"]').filter({
      hasText: /3|٣|أقصى|حد|maximum|limit/i,
    });
    await expect(toast.first()).toBeVisible();
  });
});
