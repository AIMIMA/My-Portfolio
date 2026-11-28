import fs from 'node:fs';
import { defineConfig } from '@playwright/test';
import type { PlaywrightTestConfig } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:4173';

function resolveChromiumExecutable(): string | undefined {
  const candidates = [
    process.env.CHROME_EXECUTABLE,
    '/opt/ms-playwright/chromium-1255/chrome-linux64/chrome',
    '/usr/bin/google-chrome',
  ];
  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

const SWIFTSHADER_WEBGL_ARGS: string[] = [
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--enable-webgl',
  '--ignore-gpu-blocklist',
  '--enable-unsafe-swiftshader',
  '--disable-dev-shm-usage',
  '--no-sandbox',
];

const chromiumExecutable = resolveChromiumExecutable();

const sharedDesktopUse: NonNullable<PlaywrightTestConfig['use']> = {
  browserName: 'chromium',
  headless: true,
  baseURL: BASE_URL,
  viewport: { width: 1440, height: 900 },
  actionTimeout: 10_000,
  navigationTimeout: 20_000,
  trace: 'retain-on-failure',
  screenshot: 'only-on-failure',
  video: 'off',
  launchOptions: {
    ...(chromiumExecutable ? { executablePath: chromiumExecutable } : {}),
    args: SWIFTSHADER_WEBGL_ARGS,
  },
};

const parsedWorkers = Number(process.env.PW_WORKERS);
const workers = Number.isInteger(parsedWorkers) && parsedWorkers > 0 ? parsedWorkers : 1;

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers,
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  outputDir: 'test-results',
  use: sharedDesktopUse,
  webServer: {
    command: 'npx vite preview --host 127.0.0.1 --port 4173 --strictPort',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
  projects: [
    {
      name: 'tier1',
      testDir: './e2e/tier1',
      use: { ...sharedDesktopUse },
    },
    {
      name: 'tier2',
      testDir: './e2e/tier2',
      use: { ...sharedDesktopUse },
    },
    {
      name: 'tier3',
      testDir: './e2e/tier3',
      use: { ...sharedDesktopUse },
    },
    {
      name: 'tier4',
      testDir: './e2e/tier4',
      use: { ...sharedDesktopUse },
    },
  ],
});
