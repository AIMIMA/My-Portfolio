import { Buffer } from 'node:buffer';
import zlib from 'node:zlib';
import { expect } from '@playwright/test';
import type { BrowserContext, ConsoleMessage, Locator, Page, Response, Route } from '@playwright/test';

export type StageId = 'hero' | 'transition' | 'egypt' | 'governorate' | 'project';
export type MasterPlanMode = '2d' | '3d';
export type LocaleId = 'ar' | 'en';
export type WebGLState = 'ready' | 'fallback';
export type MapTileState = 'offline-vector' | 'online-enhanced' | 'svg-fallback';

export const VALID_STAGES: readonly StageId[] = [
  'hero',
  'transition',
  'egypt',
  'governorate',
  'project',
] as const;

export const GOVERNORATE_IDS = [
  'alexandria',
  'matrouh',
  'cairo',
  'giza',
  'red-sea',
  'suez',
] as const;

export type GovernorateId = (typeof GOVERNORATE_IDS)[number];

export const GOVERNORATE_COUNTS: Readonly<Record<GovernorateId, number>> = {
  alexandria: 8,
  matrouh: 3,
  cairo: 3,
  giza: 3,
  'red-sea': 3,
  suez: 2,
} as const;

export const ALEXANDRIA_PROJECT_IDS = [
  'sawary',
  'palm-hills-alex',
  'creeks-alex',
  'alex-west',
  'muruj-smouha',
  'valore-smouha',
  'antoniadis-alex',
  'san-stefano',
] as const;

export const PROJECTS_BY_GOVERNORATE: Readonly<Record<GovernorateId, readonly string[]>> = {
  alexandria: ALEXANDRIA_PROJECT_IDS,
  matrouh: ['north-edge-alamein', 'marassi', 'hacienda-waters'],
  cairo: ['madinaty', 'bloomfields', 'il-bosco-nac'],
  giza: ['zed-west', 'o-west', 'solana-west'],
  'red-sea': ['el-gouna', 'makadi-heights', 'somabay'],
  suez: ['azha-sokhna', 'il-monte-galala'],
} as const;

export const ALL_PROJECT_IDS = [
  ...PROJECTS_BY_GOVERNORATE.alexandria,
  ...PROJECTS_BY_GOVERNORATE.matrouh,
  ...PROJECTS_BY_GOVERNORATE.cairo,
  ...PROJECTS_BY_GOVERNORATE.giza,
  ...PROJECTS_BY_GOVERNORATE['red-sea'],
  ...PROJECTS_BY_GOVERNORATE.suez,
] as const;

export const CONSULTANT_NAME_AR = 'عبدالله ابراهيم محمد';
export const CONSULTANT_NAME_AR_REGEX = /عبد\s?الله\s+[اإ]براهيم\s+محمد/;

export const CONSULTANT_NAME_EN = 'Abdullah Ibrahim Mohamed';
export const CONSULTANT_NAME_EN_REGEX = /Abdullah\s+Ibrahim\s+Moham{1,2}ed/i;

export const CONSULTANT_TITLE_EN = 'Senior Property Consultant';
export const CONSULTANT_TITLE_EN_REGEX = /Senior\s+Property\s+Consultant/i;
export const CONSULTANT_TITLE_AR_REGEX =
  /(?:(?:كبير\s+)?(?:استشاري(?:ي)?|مستشار(?:ي)?)\s+(?:أول\s+)?(?:(?:ال)?استثمار\s+|(?:ال)?مبيعات\s+)?(?:ال|لل)?عقار(?:ي|ية|ات)?|Senior\s+Property\s+Consultant)/i;

export const CONSULTANT_WHATSAPP_DIGITS = '201280249440';
export const CONSULTANT_TEL_HREF_REGEX = /^tel:(\+?20|0)1280249440$/;
export const VALID_MAILTO_HREF_REGEX = /^mailto:[^\s@?]+@[^\s@?]+\.[^\s@?]+(?:\?.*)?$/i;
export const PLACEHOLDER_EMAIL_DOMAIN_REGEX =
  /@(?:example\.(?:com|org|net)|test\.com|placeholder\.[a-z]+|localhost|invalid)(?:[?#]|$)/i;

export const CONSULTANT_ASSET_URL_REGEX =
  /(?:\/assets\/consultant\/(?![^?#]*\.svg(?:[?#]|$))[^?#]+|\/[^/?#]*(?:portrait|profile[-_]?photo|profile|headshot|consultant|avatar|leaning|abdullah)[^/?#]*\.(?:png|jpe?g|webp|avif)|avatars\.githubusercontent\.com(?:\/[^?#]*)?)(?:[?#].*)?$/i;

export const REFERENCE_ID_REGEX = /^REQ-20\d{2}-[A-Z0-9]{4,}$/;

export const DEFAULT_BLOCKED_EXTERNAL_HOSTS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'tiles.openfreemap.org',
  'basemaps.cartocdn.com',
] as const;

export const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;
export const COMPACT_MOBILE_VIEWPORT = { width: 375, height: 667 } as const;
export const DESKTOP_VIEWPORT = { width: 1440, height: 900 } as const;

export interface AppShellState {
  stage: StageId | null;
  scrollProgress: number;
  scrollProgressRaw: string | null;
  governorate: string | null;
  project: string | null;
  parcel: string | null;
  masterplanMode: MasterPlanMode | null;
  cameraMoving: boolean;
  lang: LocaleId | null;
  htmlLang: string | null;
  htmlDir: string | null;
  mapTiles: MapTileState | null;
  webglHero: WebGLState | null;
  webglMap: WebGLState | null;
}

export interface ErrorCollectorOptions {
  allowConsolePatterns?: RegExp[];
  allowBlockedHosts?: Iterable<string>;
  allowNetworkUrlPatterns?: RegExp[];
}

export interface ErrorCollector {
  readonly consoleErrors: string[];
  readonly pageErrors: string[];
  allowBlockedHost(host: string): void;
  allowNetworkUrlPattern(pattern: RegExp): void;
  allowConsolePattern(pattern: RegExp): void;
  assertZeroErrors(): void;
  reset(): void;
  detach(): void;
}

const NETWORK_FAILURE_CONSOLE_RE =
  /^Failed to load resource:\s*(net::ERR_(FAILED|INTERNET_DISCONNECTED|ABORTED)|the server responded with a status of (404|5\d\d))/i;

function hostnameMatchesAllowed(urlStr: string, allowedHosts: Set<string>): boolean {
  if (!urlStr) return false;
  try {
    const host = new URL(urlStr).hostname.toLowerCase();
    for (const allowed of allowedHosts) {
      if (host === allowed || host.endsWith(`.${allowed}`)) {
        return true;
      }
    }
  } catch {
    return false;
  }
  return false;
}

export function attachErrorCollectors(
  page: Page,
  options?: ErrorCollectorOptions,
): ErrorCollector {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const allowedConsolePatterns: RegExp[] = [...(options?.allowConsolePatterns ?? [])];
  const allowedBlockedHosts = new Set<string>(
    Array.from(options?.allowBlockedHosts ?? [], (h) => h.toLowerCase()),
  );
  const allowedNetworkUrlPatterns: RegExp[] = [...(options?.allowNetworkUrlPatterns ?? [])];

  const onConsole = (msg: ConsoleMessage): void => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    const locUrl = msg.location().url ?? '';

    if (allowedConsolePatterns.some((re) => re.test(text))) {
      return;
    }

    if (NETWORK_FAILURE_CONSOLE_RE.test(text)) {
      if (
        hostnameMatchesAllowed(locUrl, allowedBlockedHosts) ||
        allowedNetworkUrlPatterns.some((re) => re.test(locUrl) || re.test(text))
      ) {
        return;
      }
    }

    const formatted = locUrl ? `${text} [${locUrl}]` : text;
    consoleErrors.push(formatted);
  };

  const onPageError = (err: Error): void => {
    pageErrors.push(err.stack ?? err.message);
  };

  page.on('console', onConsole);
  page.on('pageerror', onPageError);

  return {
    get consoleErrors(): string[] {
      return consoleErrors;
    },
    get pageErrors(): string[] {
      return pageErrors;
    },
    allowBlockedHost(host: string): void {
      allowedBlockedHosts.add(host.toLowerCase());
    },
    allowNetworkUrlPattern(pattern: RegExp): void {
      allowedNetworkUrlPatterns.push(pattern);
    },
    allowConsolePattern(pattern: RegExp): void {
      allowedConsolePatterns.push(pattern);
    },
    assertZeroErrors(): void {
      expect(pageErrors, `Unexpected uncaught pageerror(s):\n${pageErrors.join('\n')}`).toEqual([]);
      expect(
        consoleErrors,
        `Unexpected console.error(s):\n${consoleErrors.join('\n')}`,
      ).toEqual([]);
    },
    reset(): void {
      consoleErrors.length = 0;
      pageErrors.length = 0;
    },
    detach(): void {
      page.off('console', onConsole);
      page.off('pageerror', onPageError);
    },
  };
}

export interface BlockExternalOptions {
  hosts?: readonly string[];
  errorCollector?: ErrorCollector;
  onBlocked?: (url: string) => void;
}

export async function blockExternalNetwork(
  page: Page,
  options?: BlockExternalOptions,
): Promise<{ blockedUrls: string[]; unblock: () => Promise<void> }> {
  const hosts = (options?.hosts ?? DEFAULT_BLOCKED_EXTERNAL_HOSTS).map((h) => h.toLowerCase());
  const blockedSet = new Set<string>(hosts);
  const blockedUrls: string[] = [];

  for (const host of hosts) {
    options?.errorCollector?.allowBlockedHost(host);
  }

  const handler = async (route: Route): Promise<void> => {
    const url = route.request().url();
    if (
      url.startsWith('data:') ||
      url.startsWith('blob:') ||
      url.startsWith('http://127.0.0.1') ||
      url.startsWith('http://localhost')
    ) {
      await route.fallback();
      return;
    }
    if (hostnameMatchesAllowed(url, blockedSet)) {
      blockedUrls.push(url);
      options?.onBlocked?.(url);
      await route.abort('failed');
      return;
    }
    await route.fallback();
  };

  await page.route('**/*', handler);

  return {
    blockedUrls,
    unblock: async () => {
      await page.unroute('**/*', handler);
    },
  };
}

export async function nextFrames(page: Page, count = 2): Promise<void> {
  await page.evaluate(
    (n: number) =>
      new Promise<void>((resolve) => {
        let remaining = Math.max(1, n);
        const tick = (): void => {
          remaining -= 1;
          if (remaining <= 0) {
            resolve();
          } else {
            window.requestAnimationFrame(tick);
          }
        };
        window.requestAnimationFrame(tick);
      }),
    count,
  );
}

export async function getAppShellState(page: Page): Promise<AppShellState> {
  return page.evaluate((): AppShellState => {
    const shell = document.getElementById('app-shell');
    const stageRaw = shell?.getAttribute('data-stage') ?? null;
    const progressRaw = shell?.getAttribute('data-scroll-progress') ?? null;
    const modeRaw = shell?.getAttribute('data-masterplan-mode') ?? null;
    const langRaw = shell?.getAttribute('data-lang') ?? null;
    const tilesRaw = shell?.getAttribute('data-map-tiles') ?? null;
    const webglHeroRaw = shell?.getAttribute('data-webgl-hero') ?? null;
    const webglMapRaw = shell?.getAttribute('data-webgl-map') ?? null;

    const validStage =
      stageRaw === 'hero' ||
      stageRaw === 'transition' ||
      stageRaw === 'egypt' ||
      stageRaw === 'governorate' ||
      stageRaw === 'project'
        ? stageRaw
        : null;

    const validMode = modeRaw === '2d' || modeRaw === '3d' ? modeRaw : null;
    const validLang = langRaw === 'ar' || langRaw === 'en' ? langRaw : null;
    const validTiles =
      tilesRaw === 'offline-vector' ||
      tilesRaw === 'online-enhanced' ||
      tilesRaw === 'svg-fallback'
        ? tilesRaw
        : null;
    const validHero =
      webglHeroRaw === 'ready' || webglHeroRaw === 'fallback' ? webglHeroRaw : null;
    const validMap =
      webglMapRaw === 'ready' || webglMapRaw === 'fallback' ? webglMapRaw : null;

    return {
      stage: validStage,
      scrollProgress: progressRaw !== null ? Number.parseFloat(progressRaw) : Number.NaN,
      scrollProgressRaw: progressRaw,
      governorate: shell?.getAttribute('data-governorate') ?? null,
      project: shell?.getAttribute('data-project') ?? null,
      parcel: shell?.getAttribute('data-parcel') ?? null,
      masterplanMode: validMode,
      cameraMoving: shell?.getAttribute('data-camera-moving') === 'true',
      lang: validLang,
      htmlLang: document.documentElement.getAttribute('lang'),
      htmlDir: document.documentElement.getAttribute('dir'),
      mapTiles: validTiles,
      webglHero: validHero,
      webglMap: validMap,
    };
  });
}

export interface WaitForAppReadyOptions {
  timeout?: number;
  expectedStage?: StageId;
  expectedWebglHero?: WebGLState;
  waitForMap?: boolean;
}

export async function waitForAppReady(
  page: Page,
  options?: WaitForAppReadyOptions,
): Promise<AppShellState> {
  const timeout = options?.timeout ?? 15_000;
  await expect(page.locator('#app-shell')).toBeVisible({ timeout });

  await expect
    .poll(
      async () => {
        const s = await getAppShellState(page);
        if (!s.stage) return 'missing-stage';
        if (options?.expectedStage && s.stage !== options.expectedStage) {
          return `stage:${s.stage}`;
        }
        if (!s.webglHero) return 'missing-webgl-hero';
        if (options?.expectedWebglHero && s.webglHero !== options.expectedWebglHero) {
          return `webglHero:${s.webglHero}`;
        }
        if (!s.lang || s.htmlLang !== s.lang) return `lang-mismatch:${s.lang}/${s.htmlLang}`;
        const expectedDir = s.lang === 'ar' ? 'rtl' : 'ltr';
        if (s.htmlDir !== expectedDir) return `dir-mismatch:${s.htmlDir}`;
        if (options?.waitForMap) {
          if (!s.webglMap) return 'missing-webgl-map';
          if (!s.mapTiles) return 'missing-map-tiles';
        }
        if (s.stage !== 'transition' && s.cameraMoving) return 'camera-moving';
        return 'ready';
      },
      { timeout },
    )
    .toBe('ready');

  await nextFrames(page, 2);
  return getAppShellState(page);
}

export async function waitForMapReady(page: Page, timeout = 15_000): Promise<AppShellState> {
  return waitForAppReady(page, { timeout, waitForMap: true });
}

export async function waitForCameraSettled(page: Page, timeout = 12_000): Promise<void> {
  await expect(page.locator('#app-shell')).toHaveAttribute('data-camera-moving', 'false', {
    timeout,
  });
  await nextFrames(page, 2);
}

export async function waitForStage(
  page: Page,
  stage: StageId,
  options?: number | { timeout?: number; settle?: boolean },
): Promise<AppShellState> {
  const timeout = typeof options === 'number' ? options : (options?.timeout ?? 12_000);
  const settle = typeof options === 'number' ? true : (options?.settle ?? true);

  await expect(page.locator('#app-shell')).toHaveAttribute('data-stage', stage, { timeout });
  if (settle && stage !== 'transition') {
    await waitForCameraSettled(page, timeout);
  }
  return getAppShellState(page);
}

export interface ScrollDiveOptions {
  targetSelector?: string;
  framesPerStep?: number;
  settleFrames?: number;
  assertMoved?: boolean;
}

export interface ScrollDiveResult {
  initialProgress: number;
  finalProgress: number;
  samples: number[];
  finalStage: StageId | null;
  distinctValues: number;
}

export async function driveScrollDive(
  page: Page,
  steps: number,
  deltaY: number,
  options?: ScrollDiveOptions,
): Promise<ScrollDiveResult> {
  const framesPerStep = options?.framesPerStep ?? 3;
  const settleFrames = options?.settleFrames ?? 5;

  let target: Locator;
  if (options?.targetSelector) {
    target = page.locator(options.targetSelector).first();
  } else {
    const visibleCanvas = page.locator('#app-shell canvas:visible').first();
    const hasCanvas = (await visibleCanvas.count()) > 0;
    target = hasCanvas ? visibleCanvas : page.locator('#app-shell');
  }

  const box = await target.boundingBox();
  if (options?.targetSelector) {
    expect(
      box,
      `Explicit scroll target "${options.targetSelector}" has null boundingBox`,
    ).not.toBeNull();
  }
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  } else {
    const vp = page.viewportSize() ?? DESKTOP_VIEWPORT;
    await page.mouse.move(vp.width / 2, vp.height / 2);
  }

  const before = await getAppShellState(page);
  const initialProgress = Number.isNaN(before.scrollProgress) ? 0 : before.scrollProgress;
  const samples: number[] = [];

  for (let i = 0; i < steps; i += 1) {
    await page.mouse.wheel(0, deltaY);
    await nextFrames(page, framesPerStep);
    const current = await getAppShellState(page);
    if (!Number.isNaN(current.scrollProgress)) {
      samples.push(current.scrollProgress);
    }
  }

  await nextFrames(page, settleFrames);

  if (options?.assertMoved !== false) {
    if (deltaY > 0 && initialProgress < 0.99) {
      await expect
        .poll(async () => (await getAppShellState(page)).scrollProgress, { timeout: 2_000 })
        .toBeGreaterThan(initialProgress);
    } else if (deltaY < 0 && initialProgress > 0.01) {
      await expect
        .poll(async () => (await getAppShellState(page)).scrollProgress, { timeout: 2_000 })
        .toBeLessThan(initialProgress);
    }
  }

  const after = await getAppShellState(page);
  const finalProgress = Number.isNaN(after.scrollProgress) ? initialProgress : after.scrollProgress;
  samples.push(finalProgress);

  const distinctValues = new Set(samples.map((v) => v.toFixed(2))).size;

  return {
    initialProgress,
    finalProgress,
    samples,
    finalStage: after.stage,
    distinctValues,
  };
}

export interface CanvasPixelStats {
  width: number;
  height: number;
  samples: number;
  nonTransparent: number;
  uniqueQuantizedColors: number;
  meanLum: number;
  stdDevLum: number;
  png: Buffer;
}

export interface NonBlankCanvasOptions {
  timeout?: number;
  minWidth?: number;
  minHeight?: number;
  minUniqueColors?: number;
  minLumStdDev?: number;
}

interface DecodedPngRgba {
  width: number;
  height: number;
  rgba: Uint8Array;
}

function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function decodePngToRgba(png: Buffer): DecodedPngRgba {
  if (png.length < 24 || png.readUInt32BE(0) !== 0x89504e47) {
    throw new Error('Invalid PNG signature');
  }

  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idatChunks: Buffer[] = [];

  let offset = 8;
  while (offset + 8 <= png.length) {
    const chunkLen = png.readUInt32BE(offset);
    const chunkType = png.toString('ascii', offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + chunkLen;
    if (dataEnd > png.length) break;

    if (chunkType === 'IHDR') {
      width = png.readUInt32BE(dataStart);
      height = png.readUInt32BE(dataStart + 4);
      bitDepth = png[dataStart + 8] ?? 0;
      colorType = png[dataStart + 9] ?? 0;
      interlace = png[dataStart + 12] ?? 0;
    } else if (chunkType === 'IDAT') {
      idatChunks.push(png.subarray(dataStart, dataEnd));
    } else if (chunkType === 'IEND') {
      break;
    }

    offset = dataEnd + 4;
  }

  if (width <= 0 || height <= 0) {
    throw new Error(`Invalid PNG dimensions: ${width}x${height}`);
  }
  if (bitDepth !== 8 || interlace !== 0) {
    throw new Error(
      `Unsupported PNG format: bitDepth=${bitDepth}, interlace=${interlace} (expected 8-bit non-interlaced)`,
    );
  }

  const channels =
    colorType === 0 ? 1 : colorType === 2 ? 3 : colorType === 4 ? 2 : colorType === 6 ? 4 : 0;
  if (channels === 0) {
    throw new Error(`Unsupported PNG colorType=${colorType}`);
  }

  const raw = zlib.inflateSync(Buffer.concat(idatChunks));
  const stride = width * channels;
  const recon = new Uint8Array(height * stride);

  let inOff = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[inOff++] ?? 0;
    const rowStart = y * stride;
    for (let x = 0; x < stride; x += 1) {
      const byte = raw[inOff++] ?? 0;
      const a = x >= channels ? (recon[rowStart + x - channels] ?? 0) : 0;
      const b = y > 0 ? (recon[rowStart - stride + x] ?? 0) : 0;
      const c = y > 0 && x >= channels ? (recon[rowStart - stride + x - channels] ?? 0) : 0;

      let val = byte;
      if (filter === 1) {
        val = (byte + a) & 0xff;
      } else if (filter === 2) {
        val = (byte + b) & 0xff;
      } else if (filter === 3) {
        val = (byte + ((a + b) >> 1)) & 0xff;
      } else if (filter === 4) {
        val = (byte + paethPredictor(a, b, c)) & 0xff;
      }
      recon[rowStart + x] = val;
    }
  }

  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    const src = i * channels;
    const dst = i * 4;
    if (colorType === 0) {
      const g = recon[src] ?? 0;
      rgba[dst] = g;
      rgba[dst + 1] = g;
      rgba[dst + 2] = g;
      rgba[dst + 3] = 255;
    } else if (colorType === 2) {
      rgba[dst] = recon[src] ?? 0;
      rgba[dst + 1] = recon[src + 1] ?? 0;
      rgba[dst + 2] = recon[src + 2] ?? 0;
      rgba[dst + 3] = 255;
    } else if (colorType === 4) {
      const g = recon[src] ?? 0;
      rgba[dst] = g;
      rgba[dst + 1] = g;
      rgba[dst + 2] = g;
      rgba[dst + 3] = recon[src + 1] ?? 255;
    } else {
      rgba[dst] = recon[src] ?? 0;
      rgba[dst + 1] = recon[src + 1] ?? 0;
      rgba[dst + 2] = recon[src + 2] ?? 0;
      rgba[dst + 3] = recon[src + 3] ?? 255;
    }
  }

  return { width, height, rgba };
}

export function decodePngPixelStats(png: Buffer): Omit<CanvasPixelStats, 'png'> {
  const { width, height, rgba } = decodePngToRgba(png);
  const stepX = Math.max(1, Math.floor(width / 40));
  const stepY = Math.max(1, Math.floor(height / 40));

  let samples = 0;
  let nonTransparent = 0;
  const quantized = new Set<number>();
  const lums: number[] = [];

  for (let y = 0; y < height; y += stepY) {
    for (let x = 0; x < width; x += stepX) {
      const idx = (y * width + x) * 4;
      const r = rgba[idx] ?? 0;
      const g = rgba[idx + 1] ?? 0;
      const b = rgba[idx + 2] ?? 0;
      const a = rgba[idx + 3] ?? 0;
      samples += 1;
      if (a > 0) {
        nonTransparent += 1;
        const q = ((r >> 2) << 12) | ((g >> 2) << 6) | (b >> 2);
        quantized.add(q);
        lums.push(0.2126 * r + 0.7152 * g + 0.0722 * b);
      }
    }
  }

  const count = lums.length || 1;
  const meanLum = lums.reduce((acc, v) => acc + v, 0) / count;
  const variance = lums.reduce((acc, v) => acc + (v - meanLum) ** 2, 0) / count;

  return {
    width,
    height,
    samples,
    nonTransparent,
    uniqueQuantizedColors: quantized.size,
    meanLum,
    stdDevLum: Math.sqrt(variance),
  };
}

export function comparePngVisualDiff(pngA: Buffer, pngB: Buffer): number {
  const a = decodePngToRgba(pngA);
  const b = decodePngToRgba(pngB);
  const w = Math.min(a.width, b.width);
  const h = Math.min(a.height, b.height);
  if (w === 0 || h === 0) return 0;

  const stepX = Math.max(1, Math.floor(w / 40));
  const stepY = Math.max(1, Math.floor(h / 40));
  let total = 0;
  let diff = 0;

  for (let y = 0; y < h; y += stepY) {
    for (let x = 0; x < w; x += stepX) {
      const idxA = (y * a.width + x) * 4;
      const idxB = (y * b.width + x) * 4;
      const dr = Math.abs((a.rgba[idxA] ?? 0) - (b.rgba[idxB] ?? 0));
      const dg = Math.abs((a.rgba[idxA + 1] ?? 0) - (b.rgba[idxB + 1] ?? 0));
      const db = Math.abs((a.rgba[idxA + 2] ?? 0) - (b.rgba[idxB + 2] ?? 0));
      total += 1;
      if (dr + dg + db > 18) {
        diff += 1;
      }
    }
  }

  return total > 0 ? diff / total : 0;
}

export async function assertNonBlankCanvas(
  page: Page,
  selector: string,
  options?: NonBlankCanvasOptions,
): Promise<CanvasPixelStats> {
  const timeout = options?.timeout ?? 10_000;
  const minWidth = options?.minWidth ?? 100;
  const minHeight = options?.minHeight ?? 100;
  const minUniqueColors = options?.minUniqueColors ?? 3;
  const minLumStdDev = options?.minLumStdDev ?? 2.5;

  const target = page.locator(selector).first();
  await expect(target).toBeVisible({ timeout });

  const box = await requireBoundingBox(target, `Canvas "${selector}"`);
  expect(box.width, `Canvas "${selector}" width ${box.width} < ${minWidth}`).toBeGreaterThanOrEqual(
    minWidth,
  );
  expect(
    box.height,
    `Canvas "${selector}" height ${box.height} < ${minHeight}`,
  ).toBeGreaterThanOrEqual(minHeight);

  await nextFrames(page, 2);
  const png = await target.screenshot({ type: 'png', animations: 'allow' });
  const stats = decodePngPixelStats(png);

  expect(stats.nonTransparent, `Canvas "${selector}" appears transparent/blank`).toBeGreaterThan(0);
  expect(
    stats.uniqueQuantizedColors,
    `Canvas "${selector}" has only ${stats.uniqueQuantizedColors} unique quantized colors`,
  ).toBeGreaterThanOrEqual(minUniqueColors);
  expect(
    stats.stdDevLum,
    `Canvas "${selector}" luminance stdDev ${stats.stdDevLum.toFixed(2)} < ${minLumStdDev}`,
  ).toBeGreaterThanOrEqual(minLumStdDev);

  return { ...stats, png };
}

export async function disableWebGLInitScript(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const origCanvasGetContext = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      writable: true,
      value: function patchedGetContext(
        this: HTMLCanvasElement,
        contextId: string,
        options?: unknown,
      ): RenderingContext | null {
        if (typeof contextId === 'string' && /webgl/i.test(contextId)) {
          return null;
        }
        return origCanvasGetContext.call(
          this,
          contextId as '2d',
          options as CanvasRenderingContext2DSettings,
        );
      },
    });

    if (typeof OffscreenCanvas !== 'undefined' && OffscreenCanvas.prototype.getContext) {
      const origOffscreenGetContext = OffscreenCanvas.prototype.getContext;
      Object.defineProperty(OffscreenCanvas.prototype, 'getContext', {
        configurable: true,
        writable: true,
        value: function patchedOffscreenGetContext(
          this: OffscreenCanvas,
          contextId: string,
          options?: unknown,
        ): OffscreenRenderingContext | null {
          if (typeof contextId === 'string' && /webgl/i.test(contextId)) {
            return null;
          }
          return origOffscreenGetContext.call(
            this,
            contextId as '2d',
            options as CanvasRenderingContext2DSettings,
          );
        },
      });
    }

    try {
      Object.defineProperty(window, 'WebGL2RenderingContext', {
        value: undefined,
        configurable: true,
      });
    } catch {
      // ignore non-configurable environments
    }
    try {
      Object.defineProperty(window, 'WebGLRenderingContext', {
        value: undefined,
        configurable: true,
      });
    } catch {
      // ignore non-configurable environments
    }
  });
}

export interface BreakPortraitOptions {
  urlPattern?: RegExp;
  mode?: '404' | 'abort' | 'slow-404';
  delayMs?: number;
  errorCollector?: ErrorCollector;
}

export async function breakPortraitAsset(
  page: Page,
  options?: BreakPortraitOptions,
): Promise<{ interceptedUrls: string[]; restore: () => Promise<void> }> {
  const urlPattern = options?.urlPattern ?? CONSULTANT_ASSET_URL_REGEX;
  const mode = options?.mode ?? '404';
  const delayMs = options?.delayMs ?? 500;
  const interceptedUrls: string[] = [];

  options?.errorCollector?.allowNetworkUrlPattern(urlPattern);

  const handler = async (route: Route): Promise<void> => {
    const url = route.request().url();
    if (!urlPattern.test(url)) {
      await route.fallback();
      return;
    }
    interceptedUrls.push(url);
    if (mode === 'slow-404') {
      await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
    }
    if (mode === 'abort') {
      await route.abort('failed');
      return;
    }
    await route.fulfill({
      status: 404,
      contentType: 'text/plain',
      body: 'Not Found',
    });
  };

  await page.route('**/*', handler);

  return {
    interceptedUrls,
    restore: async () => {
      await page.unroute('**/*', handler);
    },
  };
}

export async function assertNoBrokenImages(
  page: Page,
  containerSelector = '#app-shell',
  timeout = 5_000,
): Promise<void> {
  await expect(
    page.locator(containerSelector).first(),
    `Expected image container "${containerSelector}" to be visible`,
  ).toBeVisible({ timeout });

  await expect
    .poll(
      async () =>
        page.evaluate((sel: string) => {
          const root = document.querySelector(sel);
          if (!root) {
            return { missingRoot: true, pending: [] as string[], broken: [] as string[] };
          }

          const imgs = Array.from(root.querySelectorAll('img'));
          const pending: string[] = [];
          const broken: string[] = [];

          const isHiddenByAncestor = (el: HTMLElement): boolean => {
            let cur: HTMLElement | null = el;
            while (cur) {
              if (cur.hidden || window.getComputedStyle(cur).display === 'none') {
                return true;
              }
              cur = cur.parentElement;
            }
            return false;
          };

          for (const img of imgs) {
            const style = window.getComputedStyle(img);
            if (
              style.visibility === 'hidden' ||
              Number.parseFloat(style.opacity) === 0 ||
              isHiddenByAncestor(img)
            ) {
              continue;
            }
            const src = img.getAttribute('src') ?? '<empty-src>';
            if (!img.complete) {
              pending.push(src);
            } else if (img.naturalWidth === 0) {
              broken.push(src);
            }
          }

          return { missingRoot: false, pending, broken };
        }, containerSelector),
      {
        timeout,
        message: `All visible <img> elements inside "${containerSelector}" must settle with img.complete === true && img.naturalWidth > 0`,
      },
    )
    .toEqual({ missingRoot: false, pending: [], broken: [] });
}

export interface ConsultantAssetTracker {
  readonly okUrls: string[];
  readonly failedUrls: Array<{ url: string; status: number; contentType: string }>;
  detach: () => void;
}

export function trackConsultantAssetResponses(
  page: Page,
  urlPattern: RegExp = CONSULTANT_ASSET_URL_REGEX,
): ConsultantAssetTracker {
  const okUrls: string[] = [];
  const failedUrls: Array<{ url: string; status: number; contentType: string }> = [];

  const onResponse = (response: Response): void => {
    const url = response.url();
    if (!urlPattern.test(url)) return;
    const status = response.status();
    const contentType = (response.headers()['content-type'] ?? '').toLowerCase();
    if ((status >= 200 && status < 300 && contentType.startsWith('image/')) || status === 304) {
      okUrls.push(url);
    } else {
      failedUrls.push({ url, status, contentType });
    }
  };

  page.on('response', onResponse);
  return {
    get okUrls(): string[] {
      return okUrls;
    },
    get failedUrls(): Array<{ url: string; status: number; contentType: string }> {
      return failedUrls;
    },
    detach(): void {
      page.off('response', onResponse);
    },
  };
}

export async function assertConsultantPhotoLoaded(
  page: Page,
  containerSelector: string,
  timeout = 8_000,
): Promise<string> {
  await assertNoBrokenImages(page, containerSelector, timeout);

  let loadedSrc = '';
  await expect
    .poll(
      async () => {
        const info = await page.evaluate(
          ({ sel, patternSrc, patternFlags }) => {
            const root = document.querySelector(sel);
            if (!root) return null;
            const re = new RegExp(patternSrc, patternFlags);
            const imgs = Array.from(root.querySelectorAll('img'));
            const isHiddenByAncestor = (el: HTMLElement): boolean => {
              let cur: HTMLElement | null = el;
              while (cur) {
                if (cur.hidden || window.getComputedStyle(cur).display === 'none') {
                  return true;
                }
                cur = cur.parentElement;
              }
              return false;
            };
            for (const img of imgs) {
              const style = window.getComputedStyle(img);
              if (
                style.visibility === 'hidden' ||
                Number.parseFloat(style.opacity) === 0 ||
                isHiddenByAncestor(img)
              ) {
                continue;
              }
              const src = img.currentSrc || img.getAttribute('src') || '';
              if (re.test(src) && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
                return src;
              }
            }
            return null;
          },
          {
            sel: containerSelector,
            patternSrc: CONSULTANT_ASSET_URL_REGEX.source,
            patternFlags: CONSULTANT_ASSET_URL_REGEX.flags,
          },
        );
        if (info) loadedSrc = info;
        return Boolean(info);
      },
      {
        timeout,
        message: `Expected visible loaded consultant photo (${CONSULTANT_ASSET_URL_REGEX}) with naturalWidth > 0 inside "${containerSelector}"`,
      },
    )
    .toBe(true);

  return loadedSrc;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function requireBoundingBox(
  locator: Locator,
  label = 'element',
): Promise<BoundingBox> {
  await expect(locator, `Expected ${label} to be visible before measuring boundingBox`).toBeVisible();
  const box = await locator.boundingBox();
  expect(box, `Expected ${label} to have a non-null boundingBox`).not.toBeNull();
  if (!box) {
    throw new Error(`Expected ${label} to have a non-null boundingBox`);
  }
  expect(box.width, `Expected ${label} width > 0`).toBeGreaterThan(0);
  expect(box.height, `Expected ${label} height > 0`).toBeGreaterThan(0);
  return box;
}

export interface SelectedZoneInfo {
  zoneId: string;
  zoneLabel: string;
  matchToken: string;
}

export async function selectZoneAndResolveLabel(
  page: Page,
  zoneIndexOrLocator: number | Locator = 0,
): Promise<SelectedZoneInfo> {
  const zoneBtn =
    typeof zoneIndexOrLocator === 'number'
      ? page.locator('[id^="masterplan-zone-btn-"]').nth(zoneIndexOrLocator)
      : zoneIndexOrLocator;

  await expect(zoneBtn, 'Expected master plan zone button to be visible').toBeVisible();

  const rawBtnId = (await zoneBtn.getAttribute('id')) ?? '';
  const zoneId = extractZoneId(rawBtnId);
  expect(zoneId.length, 'Zone button must expose a non-empty zoneId suffix').toBeGreaterThan(0);

  await zoneBtn.click();
  await expect(page.locator('#app-shell')).toHaveAttribute('data-parcel', zoneId);

  const panel = page.locator('#masterplan-zone-panel');
  await expect(
    panel,
    `Expected #masterplan-zone-panel to open for selected zone "${zoneId}"`,
  ).toBeVisible();

  const candidates = await page.evaluate(
    ({ btnId }: { btnId: string }) => {
      const panelEl = document.getElementById('masterplan-zone-panel');
      const btnEl = document.getElementById(btnId);
      const heading = panelEl?.querySelector('h1, h2, h3, h4, h5, strong, [role="heading"]');
      const headingText = (heading?.textContent ?? '').trim();
      const ariaLabel = (btnEl?.getAttribute('aria-label') ?? '').trim();
      const btnText = (btnEl?.textContent ?? '').trim();

      let firstPanelLine = '';
      if (panelEl) {
        const clone = panelEl.cloneNode(true) as HTMLElement;
        for (const interactive of Array.from(clone.querySelectorAll('button, a'))) {
          interactive.remove();
        }
        firstPanelLine =
          (clone.innerText || clone.textContent || '')
            .split(/\r?\n/)
            .map((line) => line.trim())
            .find((line) => line.length >= 2) ?? '';
      }

      return { headingText, ariaLabel, btnText, firstPanelLine };
    },
    { btnId: rawBtnId },
  );

  const ordered = [
    candidates.headingText,
    candidates.ariaLabel,
    candidates.firstPanelLine,
    candidates.btnText,
  ].map((s) => s.replace(/\s+/g, ' ').trim());

  const zoneLabel = ordered.find((s) => s.length >= 3) ?? ordered.find((s) => s.length >= 2) ?? '';
  expect(
    zoneLabel.length,
    `Selected zone "${zoneId}" must expose a human-readable label in #masterplan-zone-panel or button aria-label/text (candidates: ${JSON.stringify(candidates)})`,
  ).toBeGreaterThanOrEqual(2);

  const core = zoneLabel
    .replace(/^[A-Z0-9-]{1,4}\s*[·•:\-–—|]\s*/i, '')
    .replace(/\s*\([A-Z0-9-]{1,5}\)\s*$/i, '')
    .trim();
  const normalizedCore = core.length >= 2 ? core : zoneLabel;
  const matchToken = normalizedCore.slice(0, Math.min(10, normalizedCore.length)).trim();
  expect(
    matchToken.length,
    `Resolved matchToken for zone "${zoneId}" must be >= 2 chars`,
  ).toBeGreaterThanOrEqual(2);

  return { zoneId, zoneLabel, matchToken };
}

export async function assertNoHorizontalOverflow(
  page: Page,
  tolerancePx = 1,
): Promise<void> {
  const report = await page.evaluate((tol: number) => {
    const doc = document.documentElement;
    const clientWidth = doc.clientWidth;
    const scrollWidth = doc.scrollWidth;
    const innerWidth = window.innerWidth;
    const offenders: string[] = [];

    if (scrollWidth > clientWidth + tol) {
      const elements = Array.from(document.querySelectorAll<HTMLElement>('body *'));
      for (const el of elements) {
        if (offenders.length >= 5) break;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') continue;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (rect.right > clientWidth + tol || rect.left < -tol) {
          const idPart = el.id ? `#${el.id}` : '';
          offenders.push(
            `${el.tagName.toLowerCase()}${idPart}[left=${Math.round(rect.left)},right=${Math.round(rect.right)},w=${Math.round(rect.width)}]`,
          );
        }
      }
    }

    return { scrollWidth, clientWidth, innerWidth, offenders };
  }, tolerancePx);

  expect(
    report.scrollWidth,
    `Horizontal overflow detected: scrollWidth=${report.scrollWidth} > clientWidth=${report.clientWidth} (innerWidth=${report.innerWidth}). Offenders: ${report.offenders.join(', ')}`,
  ).toBeLessThanOrEqual(report.clientWidth + tolerancePx);
}

export async function assertTapTargetSize(
  locator: Locator,
  minPx = 44,
): Promise<{ width: number; height: number }> {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  expect(box, 'Tap target has null boundingBox').not.toBeNull();
  const width = box?.width ?? 0;
  const height = box?.height ?? 0;
  expect(width, `Tap target width ${width.toFixed(1)}px < ${minPx}px`).toBeGreaterThanOrEqual(
    minPx,
  );
  expect(height, `Tap target height ${height.toFixed(1)}px < ${minPx}px`).toBeGreaterThanOrEqual(
    minPx,
  );
  return { width, height };
}

export async function assertTapTargets(locators: Locator[], minPx = 44): Promise<void> {
  for (const loc of locators) {
    await assertTapTargetSize(loc, minPx);
  }
}

export function normalizeDigits(text: string): string {
  return text
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/\u066C/g, ',');
}

export function extractZoneId(buttonId: string): string {
  return buttonId.replace(/^masterplan-zone-btn-/, '');
}

export async function findNonActiveGovMarker(page: Page): Promise<Locator> {
  const activeSet = new Set<string>(GOVERNORATE_IDS);
  const allGovMarkers = page.locator('[id^="gov-marker-"]');
  const count = await allGovMarkers.count();

  for (let i = 0; i < count; i += 1) {
    const marker = allGovMarkers.nth(i);
    const id = (await marker.getAttribute('id')) ?? '';
    const govSlug = id.replace(/^gov-marker-/, '');
    if (govSlug && !activeSet.has(govSlug)) {
      if (await marker.isVisible()) {
        return marker;
      }
    }
  }

  const fallbackButton = page
    .getByRole('button', { name: /أسوان|Aswan|الأقصر|Luxor|بورسعيد|Port Said|أسيوط|Assiut/i })
    .first();
  if ((await fallbackButton.count()) > 0) {
    return fallbackButton;
  }

  for (let i = 0; i < count; i += 1) {
    const marker = allGovMarkers.nth(i);
    const id = (await marker.getAttribute('id')) ?? '';
    const govSlug = id.replace(/^gov-marker-/, '');
    if (govSlug && !activeSet.has(govSlug)) {
      return marker;
    }
  }

  throw new Error('No non-active contextual governorate marker found on Egypt map');
}

const RAW_I18N_KEY_PATTERNS: readonly RegExp[] = [
  /\b(?:nav|hero|filter|status|modal|error|zone|consult|shortlist|profile|map|project|breadcrumb)\.[a-z][a-z0-9_.-]+\b/i,
  /\b(?:residential_villas|residential_apartments|waterfront_lagoon|commercial_promenade|clubhouse_hospitality|green_park_spine|main_gate_access|education_medical)\b/,
  /\b(?:ready_to_move|ready_and_phased|phased_delivery|under_construction|new_launch|twin_house)\b/,
  /\b(?:Lorem ipsum|TODO|TBD|undefined|NaN)\b/,
];

export async function assertZeroRawI18nKeys(
  page: Page,
  containerSelector = 'body',
): Promise<void> {
  const visibleText = await page.evaluate((sel: string) => {
    const root = document.querySelector(sel) ?? document.body;
    return (root as HTMLElement).innerText ?? '';
  }, containerSelector);

  for (const pattern of RAW_I18N_KEY_PATTERNS) {
    const match = visibleText.match(pattern);
    expect(
      match,
      `Found raw i18n key / placeholder token "${match?.[0] ?? ''}" inside "${containerSelector}"`,
    ).toBeNull();
  }
}

export function getDecodedWhatsAppText(href: string): string {
  const url = new URL(href);
  return url.searchParams.get('text') ?? '';
}

export async function assertSafeWhatsAppLink(
  locator: Locator,
  expectedTextPattern?: RegExp,
): Promise<{ href: string; decodedText: string }> {
  await expect(locator).toBeVisible();
  const href = (await locator.getAttribute('href')) ?? '';
  expect(
    href,
    `WhatsApp link href "${href}" must target verified E.164 ${CONSULTANT_WHATSAPP_DIGITS}`,
  ).toMatch(new RegExp(`^https://wa\\.me/${CONSULTANT_WHATSAPP_DIGITS}(\\?text=.+)?$`));

  const target = await locator.getAttribute('target');
  expect(target).toBe('_blank');
  const rel = (await locator.getAttribute('rel')) ?? '';
  expect(rel).toContain('noopener');
  expect(rel).toContain('noreferrer');

  const decodedText = getDecodedWhatsAppText(href);
  expect(decodedText, 'WhatsApp URL must not be double-encoded').not.toMatch(/%[0-9A-Fa-f]{2}/);
  expect(decodedText).not.toMatch(/\bundefined\b|\bnull\b|\bNaN\b/);
  if (expectedTextPattern) {
    expect(decodedText).toMatch(expectedTextPattern);
  }
  return { href, decodedText };
}

export async function assertValidMailtoLink(locator: Locator): Promise<string> {
  await expect(locator).toBeVisible();
  const href = (await locator.getAttribute('href')) ?? '';
  expect(href, `Expected valid mailto: href, received "${href}"`).toMatch(VALID_MAILTO_HREF_REGEX);
  expect(
    href,
    `Placeholder email domain detected in mailto: href "${href}"`,
  ).not.toMatch(PLACEHOLDER_EMAIL_DOMAIN_REGEX);
  return href;
}

export interface SubmitConsultationOptions {
  name?: string;
  phone?: string;
  notes?: string;
  selectMethodIndex?: number;
  selectPurposeIndex?: number;
  openSelector?: string;
}

export interface SubmittedConsultationResult {
  referenceId: string;
  whatsappHref: string;
  decodedWhatsappText: string;
}

async function pickControlOption(
  locator: Locator,
  index: number,
  controlLabel: string,
): Promise<void> {
  await expect(locator, `Expected ${controlLabel} to be visible`).toBeVisible();
  const tagName = await locator.evaluate((el) => el.tagName.toLowerCase());
  if (tagName === 'select') {
    const optionCount = await locator.locator('option').count();
    expect(
      optionCount,
      `Expected ${controlLabel} <select> to have > ${index} options (found ${optionCount})`,
    ).toBeGreaterThan(index);
    await locator.selectOption({ index });
    return;
  }

  const interactive = locator.locator('button, input[type="radio"], [role="radio"]');
  const btnCount = await interactive.count();
  expect(
    btnCount,
    `Expected ${controlLabel} control group to have > ${index} interactive options (found ${btnCount})`,
  ).toBeGreaterThan(index);
  await interactive.nth(index).click();
}

export async function submitValidConsultation(
  page: Page,
  options?: SubmitConsultationOptions,
): Promise<SubmittedConsultationResult> {
  const modal = page.locator('#consult-modal');
  if (!(await modal.isVisible())) {
    const trigger = options?.openSelector ?? '#consult-open-btn';
    await page.locator(trigger).first().click();
    await expect(modal).toBeVisible();
  }

  await page.locator('#consult-name').fill(options?.name ?? 'أحمد محمود');
  await page.locator('#consult-phone').fill(options?.phone ?? '01012345678');

  if (options?.selectMethodIndex !== undefined) {
    await pickControlOption(
      page.locator('#consult-method'),
      options.selectMethodIndex,
      '#consult-method',
    );
  }
  if (options?.selectPurposeIndex !== undefined) {
    await pickControlOption(
      page.locator('#consult-purpose'),
      options.selectPurposeIndex,
      '#consult-purpose',
    );
  }
  if (options?.notes !== undefined) {
    const notes = page.locator('#consult-notes');
    await expect(
      notes,
      'Expected #consult-notes to be visible when notes payload is explicitly specified',
    ).toBeVisible();
    await notes.fill(options.notes);
    await expect(notes).toHaveValue(options.notes);
  }

  await page.locator('#consult-submit-btn').click();
  await expect(page.locator('#consult-confirmation')).toBeVisible();

  const referenceId = ((await page.locator('#consult-reference-id').textContent()) ?? '').trim();
  expect(referenceId).toMatch(REFERENCE_ID_REGEX);

  const waLink = page.locator('#consult-whatsapp-link');
  const { href, decodedText } = await assertSafeWhatsAppLink(waLink);

  return {
    referenceId,
    whatsappHref: href,
    decodedWhatsappText: decodedText,
  };
}

export async function selectDeveloperOption(page: Page, matcher: RegExp): Promise<string> {
  const select = page.locator('#filter-developer-select');
  await expect(select).toBeVisible();
  const matchedValue = await select.evaluate((el, patternSrc: string) => {
    const re = new RegExp(patternSrc, 'i');
    const selectEl = el as HTMLSelectElement;
    for (const opt of Array.from(selectEl.options)) {
      if (re.test(opt.textContent ?? '') || re.test(opt.value)) {
        return opt.value;
      }
    }
    return null;
  }, matcher.source);

  expect(matchedValue, `No developer option matched /${matcher.source}/i`).not.toBeNull();
  await select.selectOption(matchedValue ?? '');
  await nextFrames(page, 2);
  return matchedValue ?? '';
}

export async function getShortlistBadgeCount(page: Page): Promise<number> {
  const btn = page.locator('#shortlist-open-btn');
  await expect(btn).toBeVisible();
  const text = normalizeDigits((await btn.textContent()) ?? '');
  const match = text.match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : 0;
}

export async function getProfileConsultButton(page: Page): Promise<Locator> {
  const modal = page.locator('#consultant-profile-modal');
  await expect(modal).toBeVisible();
  const byId = modal.locator('#consult-open-btn');
  if ((await byId.count()) > 0 && (await byId.first().isVisible())) {
    return byId.first();
  }
  const byRole = modal
    .getByRole('button', { name: /استشارة|احجز|حجز|تواصل|Consult|Book|Schedule/i })
    .first();
  await expect(
    byRole,
    'Expected a visible consultation trigger button inside #consultant-profile-modal',
  ).toBeVisible();
  return byRole;
}

export async function getToastConsultButton(page: Page): Promise<Locator> {
  const toast = page.locator('#non-active-gov-toast');
  await expect(toast).toBeVisible();
  const byIdInToast = toast.locator('#consult-open-btn');
  if ((await byIdInToast.count()) > 0 && (await byIdInToast.first().isVisible())) {
    return byIdInToast.first();
  }
  const inToast = toast
    .getByRole('button', { name: /استشارة|احجز|حجز|تواصل|Consult|Book|Inquire|Request/i })
    .first();
  await expect(
    inToast,
    'Expected a visible consultation action button inside #non-active-gov-toast',
  ).toBeVisible();
  return inToast;
}

export async function removeFromShortlistDrawer(page: Page, projectId: string): Promise<void> {
  const drawer = page.locator('#shortlist-drawer');
  await expect(drawer).toBeVisible();

  const toggleInDrawer = drawer.locator(`#shortlist-toggle-${projectId}`);
  if ((await toggleInDrawer.count()) > 0 && (await toggleInDrawer.isVisible())) {
    await toggleInDrawer.first().click();
    return;
  }

  const removeByData = drawer.locator(`[data-project-id="${projectId}"] button`).filter({
    hasText: /إزالة|حذف|Remove|Delete|×|✕/i,
  });
  if ((await removeByData.count()) > 0) {
    await removeByData.first().click();
    return;
  }

  const projectNames: Record<string, RegExp> = {
    sawary: /صواري|Sawary/i,
    'palm-hills-alex': /بالم هيلز|Palm Hills/i,
    'creeks-alex': /كريكس|CREEKS/i,
    'alex-west': /أليكس ويست|Alex West/i,
    'san-stefano': /سان ستيفانو|San Stefano/i,
    madinaty: /مدينتي|Madinaty/i,
    marassi: /مراسي|Marassi/i,
    'el-gouna': /الجونة|El Gouna/i,
  };
  const nameRe = projectNames[projectId] ?? new RegExp(projectId, 'i');
  const row = drawer
    .locator('article, li, section, div')
    .filter({ hasText: nameRe })
    .filter({ has: page.locator('button') })
    .last();
  const removeBtn = row.getByRole('button', { name: /إزالة|حذف|Remove|Delete|×|✕/i }).first();
  if ((await removeBtn.count()) > 0) {
    await removeBtn.click();
    return;
  }
  await row.locator('button').last().click();
}

export async function verifyDialogFocusTrap(
  page: Page,
  dialogSelector: string,
  steps = 15,
): Promise<void> {
  await expect(page.locator(dialogSelector)).toBeVisible();

  for (let i = 0; i < steps; i += 1) {
    await page.keyboard.press('Tab');
    const inside = await page.evaluate((sel: string) => {
      const dialog = document.querySelector(sel);
      return Boolean(dialog && document.activeElement && dialog.contains(document.activeElement));
    }, dialogSelector);
    expect(inside, `Tab step ${i + 1} escaped focus trap of ${dialogSelector}`).toBe(true);
  }

  for (let i = 0; i < steps; i += 1) {
    await page.keyboard.press('Shift+Tab');
    const inside = await page.evaluate((sel: string) => {
      const dialog = document.querySelector(sel);
      return Boolean(dialog && document.activeElement && dialog.contains(document.activeElement));
    }, dialogSelector);
    expect(inside, `Shift+Tab step ${i + 1} escaped focus trap of ${dialogSelector}`).toBe(true);
  }
}

export async function countVisibleMapPins(page: Page): Promise<number> {
  return page.evaluate(() => {
    const pins = Array.from(document.querySelectorAll<HTMLElement>('[id^="map-pin-"]'));
    let visible = 0;
    for (const pin of pins) {
      const style = window.getComputedStyle(pin);
      if (
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        Number.parseFloat(style.opacity) === 0 ||
        pin.getAttribute('aria-hidden') === 'true' ||
        pin.getAttribute('data-filtered-out') === 'true' ||
        pin.hidden
      ) {
        continue;
      }
      visible += 1;
    }
    return visible;
  });
}

export async function isMapPinVisible(page: Page, projectId: string): Promise<boolean> {
  return page.evaluate((id: string) => {
    const pin = document.getElementById(`map-pin-${id}`);
    if (!pin) return false;
    const style = window.getComputedStyle(pin);
    return !(
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      Number.parseFloat(style.opacity) === 0 ||
      pin.getAttribute('aria-hidden') === 'true' ||
      pin.getAttribute('data-filtered-out') === 'true' ||
      pin.hidden
    );
  }, projectId);
}

export async function enterOfflineAfterLocalBoot(
  page: Page,
  context: BrowserContext,
  entryUrl = '/',
  readyOptions?: WaitForAppReadyOptions,
): Promise<AppShellState> {
  await page.goto(entryUrl);
  const state = await waitForAppReady(page, readyOptions);
  await context.setOffline(true);
  const isOnline = await page.evaluate(() => navigator.onLine);
  expect(isOnline, 'Browser context failed to switch offline').toBe(false);
  return state;
}

export async function boxesDoNotOverlap(a: Locator, b: Locator): Promise<boolean> {
  const boxA = await a.boundingBox();
  const boxB = await b.boundingBox();
  if (!boxA || !boxB) return false;
  const separated =
    boxA.x + boxA.width <= boxB.x + 1 ||
    boxB.x + boxB.width <= boxA.x + 1 ||
    boxA.y + boxA.height <= boxB.y + 1 ||
    boxB.y + boxB.height <= boxA.y + 1;
  return separated;
}
