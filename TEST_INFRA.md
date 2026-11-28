# Test Infrastructure & E2E Plan (`TEST_INFRA.md`)

> **Opaque-Box, Requirement-Driven 4-Tier Playwright E2E Suite** for **My-Portfolio — Interactive 3D Egypt Real-Estate Maquette Portfolio** (`N = 22` features, `18` edge cases).
> Derived strictly from `.agents/teamwork/ORIGINAL_REQUEST.md` and `PROJECT.md § Feature Inventory & Interface Contracts` — zero coupling to `src/` internals.

---

## 1. Feature Inventory & Multi-Tier Coverage Matrix (`N = 22`)

| # | Feature | Tier 1 Spec (`e2e/tier1/`) | T1 | Tier 2 Spec (`e2e/tier2/`) | T2 | Tier 3 Pairs (`e2e/tier3/`) | Tier 4 Scenarios (`e2e/tier4/`) | Edge Cases |
|---|---|---|---|---|---|---|---|---|
| F-01 | 3D Architectural Egypt Maquette & Leaning Consultant Composition | `hero-choreography.spec.ts` | 5 | `01-hero-choreography.spec.ts` | 6 | `T3-08`, `T3-09` | `S-01`, `S-11`, `S-12` | `EC-01`, `EC-13`, `EC-15`, `EC-16` |
| F-02 | Editorial Consultant Identity & Primary Actions | `hero-choreography.spec.ts` | 5 | `01-hero-choreography.spec.ts` | 5 | `T3-01` | `S-01`, `S-02`, `S-07`, `S-08` | `EC-14`, `EC-16` |
| F-03 | Scroll-Scrubbed Video-Like Dive Transition | `hero-choreography.spec.ts` | 6 | `01-hero-choreography.spec.ts` | 6 | `T3-01`, `T3-07` | `S-01`, `S-08` | `EC-01`, `EC-02`, `EC-16` |
| F-04 | Deterministic Direct Dive & Stage Controls | `hero-choreography.spec.ts` | 5 | `01-hero-choreography.spec.ts` | 5 | `T3-02`, `T3-21` | `S-02`, `S-09`, `S-12` | `EC-03`, `EC-17` |
| F-05 | Egypt National Overview & 22 Real-Coordinate Beacons | `egypt-discovery.spec.ts` | 5 | `02-egypt-filters-search.spec.ts` | 6 | `T3-03`, `T3-08` | `S-01`, `S-11`, `S-12` | `EC-04`, `EC-13` |
| F-06 | Governorate & Filter Dock (Secondary Menu Reveal) | `egypt-discovery.spec.ts` | 6 | `02-egypt-filters-search.spec.ts` | 5 | `T3-03`, `T3-04`, `T3-15` | `S-02`, `S-04`, `S-06` | `EC-05` |
| F-07 | Live Bilingual Search (AR & EN) | `egypt-discovery.spec.ts` | 6 | `02-egypt-filters-search.spec.ts` | 5 | `T3-05`, `T3-20` | `S-03`, `S-07` | `EC-06` |
| F-08 | Governorate Cinematic Fly-To & Spatial Focus | `governorate-projects.spec.ts` | 5 | `03-governorate-project-flights.spec.ts` | 5 | `T3-02`, `T3-06` | `S-01`–`S-06`, `S-09` | `EC-03`, `EC-17` |
| F-09 | Governorate Projects Drawer & Bidirectional Map Sync | `governorate-projects.spec.ts` | 5 | `03-governorate-project-flights.spec.ts` | 5 | `T3-04`, `T3-06`, `T3-07`, `T3-24` | `S-01`, `S-05`, `S-08` | `EC-02`, `EC-16` |
| F-10 | Project Cinematic Fly-To Transition | `governorate-projects.spec.ts` | 5 | `03-governorate-project-flights.spec.ts` | 5 | `T3-05`, `T3-13` | `S-01`–`S-12` | `EC-03`, `EC-17` |
| F-11 | Interactive Master Plan — 2D Architectural Blueprint View | `masterplan-inspector.spec.ts` | 6 | `04-masterplan-inspector.spec.ts` | 6 | `T3-10`, `T3-19` | `S-01`, `S-03`, `S-06`, `S-11`, `S-12` | `EC-08`, `EC-13` |
| F-12 | Interactive Master Plan — 3D Massing View Toggle | `masterplan-inspector.spec.ts` | 5 | `04-masterplan-inspector.spec.ts` | 5 | `T3-09`, `T3-10`, `T3-11` | `S-01`–`S-06`, `S-10`–`S-12` | `EC-08`, `EC-13` |
| F-13 | Interactive Architectural Zone Inspector | `masterplan-inspector.spec.ts` | 5 | `04-masterplan-inspector.spec.ts` | 5 | `T3-12`, `T3-22` | `S-02`, `S-03`, `S-05`, `S-09`, `S-10` | `EC-07` |
| F-14 | Concise Conversion-First Project Summary Card | `masterplan-inspector.spec.ts` | 5 | `04-masterplan-inspector.spec.ts` | 5 | `T3-13`, `T3-14` | `S-01`–`S-06`, `S-08`, `S-10` | `EC-16` |
| F-15 | Consultant Profile Modal / Drawer | `consultation-funnel.spec.ts` | 5 | `05-consultant-lead-funnel.spec.ts` | 5 | `T3-16`, `T3-23` | `S-02`, `S-11` | `EC-14`, `EC-15` |
| F-16 | Interactive Consultation Booking Form | `consultation-funnel.spec.ts` | 6 | `05-consultant-lead-funnel.spec.ts` | 7 | `T3-12`, `T3-16`, `T3-18` | `S-01`, `S-02`, `S-04`–`S-09`, `S-11`, `S-12` | `EC-09`, `EC-10` |
| F-17 | Direct WhatsApp & Quick-Call Actions | `consultation-funnel.spec.ts` | 5 | `05-consultant-lead-funnel.spec.ts` | 5 | `T3-14`, `T3-25` | `S-01`–`S-04`, `S-07`, `S-11` | `EC-09`, `EC-10` |
| F-18 | Project Comparison Shortlist (Up to 3 Projects) | `consultation-funnel.spec.ts` | 5 | `05-consultant-lead-funnel.spec.ts` | 5 | `T3-15`, `T3-17` | `S-01`, `S-04`, `S-05`, `S-07` | `EC-11` |
| F-19 | Spatial Breadcrumb Trail & History Deep-Linking | `navigation-i18n-catalog.spec.ts` | 5 | `06-navigation-i18n-a11y-catalog.spec.ts` | 6 | `T3-01`, `T3-11`, `T3-17` | `S-07`, `S-10` | `EC-12` |
| F-20 | Bilingual Arabic (RTL Primary) & English (LTR) Toggle | `navigation-i18n-catalog.spec.ts` | 5 | `06-navigation-i18n-a11y-catalog.spec.ts` | 5 | `T3-18`, `T3-19`, `T3-20`, `T3-24` | `S-07`, `S-10` | `EC-10`, `EC-14` |
| F-21 | Full Keyboard Navigation, A11y & Reduced Motion | `navigation-i18n-catalog.spec.ts` | 5 | `06-navigation-i18n-a11y-catalog.spec.ts` | 6 | `T3-21`, `T3-22`, `T3-23` | `S-08`, `S-09` | `EC-07`, `EC-16`, `EC-17` |
| F-22 | Single-File Owner & Project Catalog Customization | `navigation-i18n-catalog.spec.ts` | 6 | `06-navigation-i18n-a11y-catalog.spec.ts` | 5 | `T3-25` | `S-01`–`S-12` | `EC-18` |
| **TOTAL** | **22 / 22 Features** | **6 files** | **116** | **6 files** | **118** | **25 tests (3 files)** | **12 scenarios (3 files)** | **18 / 18 ECs** |

---

## 2. Test Architecture

### 2.1 Runner & Browser Configuration (`playwright.config.ts`)
- **Framework:** `@playwright/test@^1.65.1` running against the production Vite bundle served via `npx vite preview --host 127.0.0.1 --port 4173 --strictPort` (`reuseExistingServer: !process.env.CI`).
  - **Prerequisite:** Run `npm run build` before `npm run test:e2e` / `npx playwright test` so `dist/` is fresh.
- **Zero-Download Chromium Executable Auto-Detection:**
  1. `process.env.CHROME_EXECUTABLE` (if set and exists on disk)
  2. `/opt/ms-playwright/chromium-1255/chrome-linux64/chrome` (exact rev `1255` matching Playwright `1.65.x`)
  3. `/usr/bin/google-chrome`
  4. Playwright bundled default fallback
- **WebGL2 SwiftShader Launch Flags (Verified on 2-vCPU Linux VM):**
  `--use-gl=angle`, `--use-angle=swiftshader`, `--enable-webgl`, `--ignore-gpu-blocklist`, `--enable-unsafe-swiftshader`, `--disable-dev-shm-usage`, `--no-sandbox`
- **Concurrency & Timeouts:**
  - `workers: 1` by default (empirically faster and higher determinism on 2-vCPU SwiftShader than 2 concurrent WebGL2 contexts; overridable via `PW_WORKERS=<N>`).
  - `timeout: 45_000`, `expect.timeout: 10_000`, `actionTimeout: 10_000`, `navigationTimeout: 20_000`.
  - `trace: 'retain-on-failure'`, `screenshot: 'only-on-failure'`, `retries: process.env.CI ? 1 : 0`.
- **Discrete Tier Projects (Independent Sequential Execution for Final Milestone):**
  - `tier1` -> `./e2e/tier1`
  - `tier2` -> `./e2e/tier2`
  - `tier3` -> `./e2e/tier3`
  - `tier4` -> `./e2e/tier4`

### 2.2 Directory Layout
```text
playwright.config.ts
e2e/
├── helpers.ts                                # Contract constants, deterministic waits, rAF wheel dive, pure-Node PNG pixel variance, WebGL/portrait fault injectors, overflow & tap-target checks
├── fixtures.ts                               # Composable test.extend (blockExternal, disableWebGL, autoAssertZeroErrors, errors, appPage)
├── tier1/                                    # Feature Coverage (>= 110; target 116)
│   ├── hero-choreography.spec.ts             # F-01..F-04 (21)
│   ├── egypt-discovery.spec.ts               # F-05..F-07 (17)
│   ├── governorate-projects.spec.ts          # F-08..F-10 (15)
│   ├── masterplan-inspector.spec.ts          # F-11..F-14 (21)
│   ├── consultation-funnel.spec.ts           # F-15..F-18 (21)
│   └── navigation-i18n-catalog.spec.ts       # F-19..F-22 (21)
├── tier2/                                    # Boundary, Corner & Edge Cases (>= 110; target 118; EC-01..EC-18)
│   ├── 01-hero-choreography.spec.ts          # F-01..F-04 (22)
│   ├── 02-egypt-filters-search.spec.ts       # F-05..F-07 (16)
│   ├── 03-governorate-project-flights.spec.ts # F-08..F-10 (15)
│   ├── 04-masterplan-inspector.spec.ts       # F-11..F-14 (21)
│   ├── 05-consultant-lead-funnel.spec.ts     # F-15..F-18 (22)
│   └── 06-navigation-i18n-a11y-catalog.spec.ts # F-19..F-22 (22)
├── tier3/                                    # Cross-Feature Pairwise (>= 22; target 25)
│   ├── choreography-map-pairs.spec.ts        # 9 pairs
│   ├── masterplan-conversion-pairs.spec.ts   # 8 pairs
│   └── i18n-a11y-resilience-pairs.spec.ts    # 8 pairs
└── tier4/                                    # Real-World End-User Scenarios (>= 11; target 12)
    ├── alexandria-coastal-journeys.spec.ts   # S-01..S-04 (4)
    ├── cairo-diaspora-mobile-journeys.spec.ts # S-05..S-08 (4)
    └── a11y-deeplink-resilience-journeys.spec.ts # S-09..S-12 (4)
```

### 2.3 Opaque-Box & Anti-Flake Principles
1. **Zero `src/` Coupling:** Zero imports from `../src/...`, zero React fiber/store hacks, zero uncontracted CSS class assertions. All selectors derive strictly from `PROJECT.md § Interface Contracts` (11 `#app-shell[data-*]` attributes, 55 canonical `#...` IDs, ARIA roles, URL params, and dynamic `[id^="masterplan-zone-btn-"]` discovery).
2. **Deterministic Waiting:** Always synchronize on `#app-shell[data-stage=...]` + `[data-camera-moving="false"]` + `expect.poll` bands rather than arbitrary `waitForTimeout()` sleeps (timers permitted ONLY for negative idle zero-autoplay proof and deliberate mid-flight preemption pulses).
3. **WebGL2 Visual Verification:** `assertNonBlankCanvas()` uses `locator.screenshot({ type: 'png', animations: 'allow' })` decoded with pure `node:zlib` (handles `preserveDrawingBuffer: false` reliably on SwiftShader) to confirm genuine non-blank pixel luminance variance.
4. **Clean Offline, LIFO Route Chaining & Fault Isolation:** External hosts (`fonts.googleapis.com`, `fonts.gstatic.com`, `tiles.openfreemap.org`, `basemaps.cartocdn.com`) are fast-aborted by default (`blockExternal: true`) with surgical host-scoped console filtering so real app errors and `pageerror`s ALWAYS fail immediately. All Playwright `page.route('**/*', ...)` pass-through handlers strictly call `route.fallback()` (never `route.continue()`) so LIFO fault injectors (`breakPortraitAsset`) never bypass external network blocking. For `context.setOffline(true)` scenarios (`S-11`), the local SPA boots online from `127.0.0.1` first (verifying live Hero WebGL2 canvas and zero broken images), then switches offline (`navigator.onLine === false`) with surgical allowance ONLY for lazily mounted raster consultant portraits while enforcing `assertNoBrokenImages` on `#consultant-profile-modal`.
5. **Follow-Up Identity, Title & Real Photo Verification:** All AR/EN identity, `Senior Property Consultant` title, `01280249440` (`201280249440`) WhatsApp/tel channels, and `/assets/consultant/` real uploaded photos are verified positively (`trackConsultantAssetResponses`, `assertConsultantPhotoLoaded`, `assertNoBrokenImages`) AND negatively (`EC-15` broken-portrait tests unconditionally asserting `interceptedUrls.length > 0` while excluding `.svg` fallbacks).
6. **Strict TypeScript 5.9.3 Compatibility:** `import type` (`verbatimModuleSyntax`), zero `enum`/`namespace` (`erasableSyntaxOnly`), extensionless relative imports inside `e2e/`, explicit `node:` built-ins, zero `tsconfig.json` modifications.

---

## 3. Real-World Application Scenarios (Tier 4 — `S-01`–`S-12`)

1. **`S-01` — Alexandria Family Comparing Sawary & Palm Hills:** AR RTL desktop; zero-autoplay check → scroll dive → Alexandria 8-project drawer → Sawary 2D/3D zone inspection → Palm Hills comparison → 2-project shortlist → Egyptian mobile consultation & Arabic `wa.me` brief.
2. **`S-02` — Corniche Luxury Buyer Inspecting San Stefano:** AR RTL desktop; Consultant Profile check → `ready_to_move` filter → San Stefano 3D Master Plan → zone-specific inquiry → consultation receipt & zone-bound WhatsApp link.
3. **`S-03` — North Coast Summer-Home Buyer (Marassi & Hacienda Waters):** AR RTL desktop; Arabic search `"مطروح"` → Marassi legend filtering & zone Escape dismissal → sibling switch to Hacienda Waters 3D & WhatsApp CTA.
4. **`S-04` — Red Sea & Ain Sokhna Coastal Investor (El Gouna, Somabay & Azha):** AR RTL desktop; chalet filter → cross-governorate shortlist across `red-sea` & `suez` → 4th-item cap toast enforcement → 3-project consultation brief.
5. **`S-05` — New Cairo & New Capital Investor (Madinaty, Bloomfields & IL Bosco):** AR RTL desktop; `#gov-marker-cairo` focus → bidirectional hover sync → IL Bosco 3D massing & zone → 3-project Cairo shortlist & booking.
6. **`S-06` — West Cairo Giza Buyer (ZED West & Solana West):** AR RTL desktop; Ora Developers filter → ZED West 2D/3D + Reset View → Solana West → invalid phone error recovery (`019...` → `015...`) → receipt confirmation.
7. **`S-07` — English-Speaking Diaspora Investor:** EN LTR desktop; locale flip → cross-governorate search & 3-project shortlist (`sawary`, `marassi`, `el-gouna`) → reload persistence → UAE international phone `+971501234567` → English receipt & WhatsApp brief.
8. **`S-08` — Mobile `390×844` Smouha Commuter (Muruj & Valore):** AR RTL mobile touch; above-the-fold Hero & `>= 44×44px` tap targets → Alexandria bottom sheet + isolated scroll → Muruj & Valore inspection → mobile booking & zero overflow throughout.
9. **`S-09` — Keyboard-Only Accessibility User Under Reduced Motion:** Desktop `reducedMotion: 'reduce'`; Tab + Enter full journey Hero → Egypt → Alexandria → Sawary → Zone → Consultation → sequential 5-level `Escape` unwind back to Hero.
10. **`S-10` — Shared 3D Deep-Link Recipient & History Navigation:** Cold load `/?lang=en&gov=alexandria&project=creeks-alex&view=3d` → zone & 2D toggle → sibling navigation → `goBack()` history restore → malformed deep-link sanitization recovery.
11. **`S-11` — Offline Site-Visit Consultant Presentation:** Local bundle boot + `context.setOffline(true)` → offline-vector Egypt map → Alexandria → Sawary 2D/3D & zones → Profile → offline booking receipt persisted in `localStorage` + formatted `wa.me` link + zero app errors.
12. **`S-12` — WebGL-Unavailable Corporate Laptop Visitor:** `disableWebGL: true` (`addInitScript`) → Hero SVG fallback → Egypt SVG fallback → Alexandria → Alex West interactive 2D/3D SVG Master Plan & zones → full consultation booking with zero errors.

---

## 4. Coverage Thresholds (`N = 22` Features)

| Tier | Description | Project Pattern Minimum | Target Implemented | Traceability Rule |
|---|---|---|---|---|
| **Tier 1** | Feature Coverage | `>= 5 × 22 = 110` tests (`>= 5`/feature) | **116 tests** (5–6/feature) | Every test tagged `[F-XX]` |
| **Tier 2** | Boundary, Corner & Edge Cases | `>= 5 × 22 = 110` tests (`>= 5`/feature) | **118 tests** (5–7/feature) | Every test tagged `[T2-FXX-NN][F-XX]` (+ `[EC-YY]` for all 18 ECs) |
| **Tier 3** | Cross-Feature Pairwise Combinations | `>= 22` tests | **25 tests** | Every test tagged `[T3-NN][F-XX x F-YY]` |
| **Tier 4** | Real-World End-User Scenarios | `>= 11` scenarios | **12 scenarios** | Every scenario tagged `[S-NN]` |
| **TOTAL** | **All 4 Tiers** | **`>= 253` tests** | **271 tests** | **22/22 features + 18/18 edge cases** |
