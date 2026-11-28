import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import {
  attachErrorCollectors,
  blockExternalNetwork,
  disableWebGLInitScript,
  waitForAppReady,
} from './helpers';
import type { ErrorCollector } from './helpers';

export interface E2EOptionFixtures {
  /** Fast-abort external font/tile hosts by default for deterministic runs. Set false for online checks. */
  blockExternal: boolean;
  /** Inject WebGL-disabling init script before navigation (EC-13). */
  disableWebGL: boolean;
  /** Automatically fail test on teardown if any non-allowed console.error or pageerror occurred. */
  autoAssertZeroErrors: boolean;
}

export interface E2EFixtures extends E2EOptionFixtures {
  errors: ErrorCollector;
  /** Pre-navigated to '/' and waited for #app-shell + data-stage + data-webgl-hero. */
  appPage: Page;
}

export const test = base.extend<E2EFixtures>({
  blockExternal: [true, { option: true }],
  disableWebGL: [false, { option: true }],
  autoAssertZeroErrors: [true, { option: true }],

  errors: [
    async ({ page, blockExternal, disableWebGL, autoAssertZeroErrors }, use) => {
      const collector = attachErrorCollectors(page);
      if (disableWebGL) {
        await disableWebGLInitScript(page);
      }
      let unblockExternal: (() => Promise<void>) | undefined;
      if (blockExternal) {
        const net = await blockExternalNetwork(page, { errorCollector: collector });
        unblockExternal = net.unblock;
      }

      await use(collector);

      if (unblockExternal) {
        await unblockExternal();
      }
      collector.detach();
      if (autoAssertZeroErrors) {
        collector.assertZeroErrors();
      }
    },
    { auto: true },
  ],

  appPage: async ({ page, disableWebGL }, use) => {
    await page.goto('/');
    await waitForAppReady(page, {
      expectedWebglHero: disableWebGL ? 'fallback' : undefined,
    });
    await use(page);
  },
});

export { expect };
