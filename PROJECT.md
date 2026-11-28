# Project: My-Portfolio — Interactive 3D Egypt Real-Estate Maquette Portfolio

> **Living Single Source of Truth** — Synthesized from Step 0 Survey (`explorer_survey_1`, `spec_miner_survey_2`, `explorer_survey_3`) and `/home/antigravity/AIMIMA/My-Portfolio/.agents/teamwork/ORIGINAL_REQUEST.md`.

---

## Architecture

### Core Concept ("Living Interactive Film — Zero Passive Autoplay")
A bespoke, gallery-grade interactive real-estate investment consultant portfolio for **Abdullah Ibrahim Mohamed (`عبدالله ابراهيم محمد` — Senior Property Consultant)** focused exclusively on Egyptian real-estate developments — starting with **Alexandria (الإسكندرية)** as the flagship deep-dive (8 real compounds) and spanning **5 additional major Egyptian real-estate governorates** (14 more real developments = **22 real verified developments** across Egypt; aligned with the user's curated-start guidance while keeping full data/UI/E2E consistency). Direct contact & WhatsApp: **`01280249440` (`+201280249440`)**. Every camera motion and visual transition is driven **strictly by user actions** (scroll scrubbing, clicks, pointer parallax, drags, keyboard) — zero passive autoplay.

### Engine Architecture: Choreographed Hybrid
1. **Tech Stack**: **Vite `^8.3.8`** + **React `^19.3.1`** + **TypeScript `^5.9.3`** *(pinned to 5.9.3; avoid TS 7.0.2 breaking changes)* + **Vanilla CSS Custom Properties** *(strictly compliant with `web-app-development` skill — zero Tailwind, zero R3F, zero GSAP bloat)* + **Three.js `^0.187.0`** + **MapLibre GL JS `^6.19.0`** + **Lucide React `^1.78.0`**.
2. **Stage 1–2 — Three.js Architectural Maquette Hero (`HeroMaquetteEngine`)**:
   - Warm obsidian-plaster architectural atelier (`#141210`) with three-point studio lighting (warm golden key, cool Mediterranean hemisphere fill, brushed-brass rim).
   - Smoked walnut & travertine architectural plinth table with recessed satin Mediterranean/Red Sea water basin, carved beveled **3D limestone relief of Egypt** derived from the shared Mercator Egypt polygon, inlaid amber-gold Nile Valley & Delta light filament, and precision brushed-brass governorate pins (Alexandria prominent on the northern coast).
   - **Consultant Standing & Leaning on the Maquette Rim**: Depth-tested alpha-cutout real photograph of **Abdullah Ibrahim Mohamed** (processed and web-optimized from the user's uploaded photos in `/home/antigravity/` into `public/assets/consultant/`) anchored directly to the foreground beveled rim with soft contact shadow & subtle pointer parallax (`±3.5°` yaw, `±1.8°` pitch), wired via `portraitUrl` (hero leaning cutout) and `profilePhotoUrl` (consultant card/modal headshot) in `src/data/consultant.ts`, with graceful architectural SVG fallback if an image fails to load (`EC-15`).
   - **Zero-Seam Scroll-Scrubbed Dive (`p ∈ [0..1]`)**: Native `220vh` scroll track + wheel/keyboard/button drivers scrub Three.js camera along a Cubic Bézier spline overhead (`p ∈ [0..0.55]`), optically cross-dissolve (`p ∈ [0.55..0.88]`) into pre-mounted MapLibre synchronously via `jumpTo()` using the exact same Mercator Egypt framing, and **pause Three.js `requestAnimationFrame` completely at `p >= 1.0`** (respecting 2-vCPU SwiftShader budgets). 100% reversible by scrolling up or clicking breadcrumb.
3. **Stage 3–4 — Offline-First / Online-Enhanced Spatial Map (`SpatialMapEngine`)**:
   - **Offline-First Resilience**: MapLibre GL JS v6 boots immediately from a bundled architectural `StyleSpecification` (deep Mediterranean/Red Sea water, warm desert/limestone landmass, Nile & Delta, Lake Nasser, Egypt border, all governorate polygons with 6 active highlighted in brushed brass, major highway corridors, and project markers).
   - **Online-Enhanced Fidelity**: Silent async `AbortSignal.timeout(2500)` probe to `https://tiles.openfreemap.org/planet`; ONLY on HTTP 200 injects architectural-styled vector street/building layers underneath our overlays (full Google Maps / Nawy Alexandria Corniche & street context online, zero console errors offline!).
   - **MapLibre GL JS v6 Hard Rules**: Pass `antialias`, `preserveDrawingBuffer`, `failIfMajorPerformanceCaveat` inside `canvasContextAttributes` (NOT top-level `MapOptions`); do NOT chain `map.on()`; keep `pitch ∈ [0, 60°]`; catch `GPUInitializationError` and degrade gracefully to interactive 2.5D SVG Egypt map + SVG Master Plan!
   - **Arabic RTL Map Labels**: Render all governorate callouts, project pins, and gate labels as **HTML `maplibregl.Marker`s** for crisp native browser HarfBuzz RTL shaping, WCAG keyboard focus, and deterministic DOM IDs.
   - **Signature Cinematic Fly-To**: Selecting any governorate (`EGYPT_OVERVIEW → GOVERNORATE_FOCUS`) or any project (`→ PROJECT_MASTERPLAN`) runs a smooth preemptible parabolic `flyTo()` curve.
4. **Stage 5 — Georeferenced Interactive 2D/3D Master Plan (`MasterPlanController`)**:
   - Each of the 22 real projects defines 5–7 architectural land-use zones (`[0..100, 0..100]`), internal roads, `northAngleDeg`, and `scaleMeters`.
   - `masterPlanToGeoJSON(project)` projects each site plan accurately onto the project's true WGS84 coordinates, scale, and bearing on MapLibre!
   - **2D Architectural Plan (`pitch: 0°`)**: Crisp CAD parcel fills, procedural canvas hatch patterns (`map.addImage`), technical dashed site boundary, internal roads, parcel codes.
   - **3D Architectural Massing (`pitch: 54°`)**: Smooth `easeTo()` tilt + `fill-extrusion` layer with vertical gradients & warm directional `map.setLight`.
   - **Interactive Inspection**: 60fps `map.setFeatureState` hover/click parcel highlight, interactive Zone Inspector popover (`Inquire About This Zone`), Land-Use Legend filter, live metric Scale Bar, rotating North Arrow/Compass, AND a synchronized interactive SVG Master Plan fallback for WebGL-unavailable environments.
5. **Stage 6 — Orthogonal Overlays & Conversion Funnel**:
   - Accessible from ANY stage without losing camera/map state: **Consultant Profile Modal**, **Consultation Booking Modal** (auto-prefilled with active governorate/project/zone or shortlist, Egyptian/international phone validation, Reference ID receipt + localStorage persistence + one-click formatted bilingual WhatsApp brief), and **Project Shortlist Drawer** (up to 3 projects side-by-side comparison).
   - **Bilingual RTL-First**: Default `lang="ar" dir="rtl"` (`Cairo` + `IBM Plex Sans Arabic`, strict `letter-spacing: 0` on Arabic!), instant lossless toggle to `lang="en" dir="ltr"` (`Cormorant Garamond` + `Plus Jakarta Sans`), 100% CSS Logical Properties, URL query & History API deep-linking (`?lang=&stage=&gov=&project=&view=`).

### Aesthetic & Design Standards (`web-app-development` Skill)
- **Palette ("Atelier Limestone & Warm Obsidian")**: Warm Obsidian (`hsl(28, 10%, 7%)`), Basalt (`hsl(28, 9%, 11%)` with subtle mineral grain texture), Travertine Dark (`hsl(30, 10%, 16%)`), Glass (`hsla(28, 12%, 10%, 0.84)` + backdrop blur), Brushed Brass (`hsl(39, 54%, 56%)`), Carved Limestone (`hsl(36, 30%, 88%)`), Muted Sand (`hsl(33, 14%, 64%)`), Mediterranean Deep Teal (`hsl(192, 42%, 34%)`), Terracotta (`hsl(20, 44%, 52%)`), Hairline Borders (`hsla(36, 26%, 82%, 0.12)`).
- **STRICT ZERO-CLICHÉ RULE**: NO Tailwind CSS, NO purple/violet on dark, NO glowing/colored border outlines, NO headline biscuit pills with pulsing dots, NO gradient text fills (`background-clip: text`), NO grid/particle mesh backgrounds, NO icon-stuffed bento boxes, NO over-nested cards, NO dashboard overuse, NO textureless plastic surfaces, NO broken placeholder images.

---

## Feature Inventory

Every feature discovered in Step 0 Survey is assigned to a milestone (22 / 22 assigned — ZERO unassigned).

| # | Feature | Description | Milestone | Source |
|---|---|---|---|---|
| F-01 | 3D Architectural Egypt Maquette & Leaning Consultant Composition | Full-viewport Three.js studio scene of physical 3D Egypt maquette table + rim-anchored leaning consultant portrait (`portraitUrl` swap + bespoke default artwork) + subtle pointer parallax + WebGL SVG fallback | M2 | `ORIGINAL_REQUEST.md` L5, L7; Survey 2 & 3 |
| F-02 | Editorial Consultant Identity & Primary Actions | Asymmetric editorial Hero overlay (single `<h1>`, consultant name/title/tagline, 3 stats, Explore Map CTA, About Consultant & Book Consultation triggers, scroll cue) | M2 | `ORIGINAL_REQUEST.md` L5, L7; Survey 2 & 3 |
| F-03 | Scroll-Scrubbed Video-Like Dive Transition | Continuous reversible scroll-scrubbed dive (`p ∈ [0..1]`) from leaning on maquette rim into Egypt national map, Mercator-aligned cross-dissolve, scroll isolation inside drawers, Three.js rAF pause at `p >= 1` | M2 (+ M3 sync) | `ORIGINAL_REQUEST.md` L6, L7; Survey 2 & 3 |
| F-04 | Deterministic Direct Dive & Stage Controls | Button, keyboard (`ArrowDown`/`ArrowUp`/`PageDown`/`PageUp`), and stage progress controls executing the identical spline deterministically; preemptible mid-flight | M2 (+ M5 HUD) | Survey 2 & 3 |
| F-05 | Egypt National Overview & 22 Real-Coordinate Beacons | Offline-first / online-enhanced MapLibre Egypt overview showing all 22 real verified developments at WGS84 coordinates, 6 active + contextual governorates, hover previews, polite toast on non-active governorates | M3 | `ORIGINAL_REQUEST.md` L5, L7; Survey 2 & 3 |
| F-06 | Governorate & Filter Dock (Secondary Menu Reveal) | Revealed upon diving into Egypt overview: Governorate chips (Alexandria Flagship first + 5 major corridors), Unit Category filter, Delivery Status filter, Developer filter, live count, zero-match empty state + Reset Filters | M5 | `ORIGINAL_REQUEST.md` L7; Survey 2 |
| F-07 | Live Bilingual Search (AR & EN) | Instant search across project names, developers, districts, and governorates with Arabic normalization (`أ/إ/آ→ا`, `ة→ه`, `ى→ي`) and direct fly-to selection | M5 (+ M1 util) | Survey 2 |
| F-08 | Governorate Cinematic Fly-To & Spatial Focus | Signature parabolic `flyTo` zooming smoothly into selected governorate's exact bounding box, brass boundary highlight, dimmed outsiders, preemptible lateral switching | M3 | `ORIGINAL_REQUEST.md` L7; Survey 2 & 3 |
| F-09 | Governorate Projects Drawer & Bidirectional Map Sync | Slides open in Governorate Focus listing all governorate projects (8 real projects in Alexandria) with bidirectional hover highlight sync with map pins, isolated scroll, mobile bottom sheet | M5 | `ORIGINAL_REQUEST.md` L7; Survey 2 |
| F-10 | Project Cinematic Fly-To Transition | Identical signature parabolic `flyTo` diving directly into the selected project's real WGS84 site coordinates and bearing | M3 | `ORIGINAL_REQUEST.md` L7; Survey 2 & 3 |
| F-11 | Interactive Master Plan — 2D Architectural Blueprint View | Georeferenced CAD site plan (`pitch: 0°`) with 5–7 color-coded land-use zones, procedural hatch patterns, internal roads, true North arrow/compass, live metric scale bar, interactive legend filter, pan/zoom & Reset View | M4 | `ORIGINAL_REQUEST.md` L5, L7; Survey 2 & 3 |
| F-12 | Interactive Master Plan — 3D Massing View Toggle | Seamless `2D ↔ 3D` toggle tilting to `54°` with `fill-extrusion` architectural massing heights + directional studio lighting + user-controlled orbit (never auto-spinning) + 2.5D SVG fallback | M4 | Survey 2 & 3 |
| F-13 | Interactive Architectural Zone Inspector | 60fps `setFeatureState` hover/click parcel highlight opening contextual Zone Card (name, land-use, area/unit mix, summary, "Inquire About This Zone" CTA) + clean Escape dismissal | M4 | Survey 2 & 3 |
| F-14 | Concise Conversion-First Project Summary Card | High-signal summary (developer, district, feddans, green/water %, status, unit categories, indicative 2026 area/price/payment guidance, ≤4 highlights, Shortlist toggle, Prev/Next sibling switcher, Consultation & WhatsApp CTAs) | M4 | `ORIGINAL_REQUEST.md` L5; Survey 2 |
| F-15 | Consultant Profile Modal / Drawer | Accessible modal (`role="dialog"`, focus trap) showing Abdullah's full profile, credentials, covered governorates, partner developers, and direct WhatsApp/Phone/Email/LinkedIn channels | M5 | `ORIGINAL_REQUEST.md` L5; Survey 1 & 2 |
| F-16 | Interactive Consultation Booking Form | Context-aware modal auto-prefilling active Governorate, Project, Zone, or Shortlist; Egyptian (`01[0125]\d{8}` / `+20...`) & international phone validation; confirmation receipt with Reference ID (`REQ-2026-XXXX`), localStorage persistence, and WhatsApp brief link | M5 | `ORIGINAL_REQUEST.md` L5; Survey 2 |
| F-17 | Direct WhatsApp & Quick-Call Actions | One-click UTF-8 bilingual prefilled `wa.me/201280249440?text=...` and `tel:` actions across Hero, Profile, and Project Summary | M5 | Survey 1 & 2 |
| F-18 | Project Comparison Shortlist (Up to 3 Projects) | Save/compare up to 3 projects across governorates in floating Shortlist drawer (persisted in localStorage, 3-item cap toast) with one-click multi-project consultation | M5 | Survey 2 |
| F-19 | Spatial Breadcrumb Trail & History Deep-Linking | Persistent top spatial breadcrumb (`الماكت → مصر → المحافظة → المشروع`) synced bidirectionally with URL query params (`?lang=&stage=&gov=&project=&view=`) & History API, safely sanitizing invalid params | M5 (+ M1 util) | Survey 2 & 3 |
| F-20 | Bilingual Arabic (RTL Primary) & English (LTR) Toggle | Instant locale flip (`<html lang="ar|en" dir="rtl|ltr">`), logical CSS mirroring, zero untranslated strings, localStorage persistence, preserves camera/form state | M1 (+ M5 toggle) | `ORIGINAL_REQUEST.md`; Survey 2 & 3 |
| F-21 | Full Keyboard Navigation, A11y & Reduced Motion | Full Tab/Enter/Space/Escape hierarchy (Modal → Zone → Project → Gov → Egypt → Hero), focus traps, `aria-live` stage announcements, WCAG AA contrast, reactive `prefers-reduced-motion: reduce` | M5 (+ M2/M4 hooks) | Survey 2 & 3 |
| F-22 | Single-File Owner & Project Catalog Customization | Strongly-typed modular data layer (`src/data/consultant.ts`, `governorates.ts`, `projects.ts`, `egyptGeo.ts`) with automated schema/geographic/bilingual/polygon invariant Vitest suite | M1 | Survey 1, 2 & 3 |

---

## Milestones

| # | Name | Scope | Dependencies | Status | Sub-Orch Conv ID |
|---|------|-------|-------------|--------|------------------|
| M1 | Foundation, Design System, Real Consultant Photos & Verified Domain Data | Scaffold Vite 8 + React 19 + TS 5.9.3 + Vitest + `@playwright/test@1.65.1`; Vanilla CSS tokens/RTL/layout; SEO `index.html`; frozen types; verified 6 governorates + 22 real Egypt/Alexandria projects; `consultant.ts` (`Abdullah Ibrahim Mohamed` / `عبدالله ابراهيم محمد`, `Senior Property Consultant`, WhatsApp/phone `01280249440`, real processed web-ready photos in `public/assets/consultant/`); `egyptGeo.ts` polygons; `mercator.ts` & `masterPlanToGeoJSON`; AR/EN i18n; Arabic search/phone/URL utilities; comprehensive unit tests | none | COMPLETE | direct |
| M2 | Choreography Engine & 3D Architectural Hero Maquette | `ChoreographyController` (`useChoreography`, scroll-scrubbing physics, Cubic Bézier spline, preemptible flights, reduced-motion, scroll isolation) + Three.js `HeroMaquetteEngine` (walnut/travertine table, Mercator-aligned 3D Egypt relief, Nile filament, sea shader, brass pins, SwiftShader adaptation, pointer parallax, rim-anchored leaning real consultant photo cutout + 2.5D SVG fallback) + `<HeroStage>` & `<HeroOverlay>` + unit tests | M1 | COMPLETE | direct |
| M3 | Offline-First Spatial Map Engine & Governorate/Project Flights | MapLibre GL JS v6 `SpatialMapEngine` (bundled architectural Egypt GeoJSON style + silent async OpenFreeMap upgrade, `canvasContextAttributes`, optical morph sync with M2, preemptible parabolic `flyTo` for governorates & projects, governorate highlight/dim, accessible HTML RTL `Marker`s, non-active governorate handling, `GPUInitializationError` 2.5D SVG Egypt map fallback) + `<MapStage>` + unit tests | M1 | COMPLETE | direct |
| M4 | Georeferenced Interactive 2D/3D Master Plan & Project Inspector | `MasterPlanController` (`masterPlanToGeoJSON` layers, procedural CAD canvas hatch patterns, `fill-extrusion` 3D massing + `setLight`, 2D↔3D toggle, `setFeatureState` hover/click parcel highlight) + interactive SVG Master Plan fallback + `<MasterPlanControls>` (2D/3D, reset, rotating north arrow, live metric scale bar) + `<MasterPlanLegend>` (zone filter) + `<ProjectInspector>` (zone popover + concise conversion-first summary + sibling switcher) + unit tests | M1, M3 | COMPLETE | direct |
| M5 | Editorial Navigation HUD, Drawers, Consultation Funnel & Integration | Full `<App />` & `src/main.tsx` integrating M1–M4; `<TopNavBar>` (spatial breadcrumbs, AR/EN toggle, Shortlist & Profile buttons); `<GovernorateRail>` (governorate chips, search, category/status/developer filters, empty state); `<ProjectListDrawer>` (bidirectional map hover sync, mobile bottom sheet); `<ConsultationModal>` (context prefill, phone validation, Reference ID receipt, WhatsApp brief to `01280249440`); `<ConsultantProfileModal>` (real profile photo & credentials); `<ShortlistDrawer>` (max 3 compare & consult); URL/History sync; full keyboard & Escape hierarchy; production `npm run build` + `npx vitest run` | M1, M2, M3, M4 | COMPLETE | direct |
| E2E | E2E Testing Track (Parallel) | Requirement-driven opaque-box 4-tier Playwright test suite (`TEST_INFRA.md`, `playwright.config.ts`, `e2e/**`, `TEST_READY.md`) covering ALL 22 features (`F-01`–`F-22`) & 18 edge cases (`EC-01`–`EC-18`) aligned with user follow-up details | none (runs parallel) | COMPLETE | direct |
| M6 | Final Milestone: E2E Tiers 1–4 Pass & Tier-5 Adversarial Hardening | Phase 1: Sequential E2E Tiers 1 → 2 → 3 → 4 fix & verification until 100% pass + whole-project Forensic Audit. Phase 2: Dedicated Tier-5 white-box adversarial Challenger → Worker → Reviewer hardening loop until zero gaps remain. | M5, E2E (`TEST_READY.md`) | COMPLETE | direct |

---

## Interface Contracts

### 1. Canonical Stage & Testability DOM Contract (Shared Across M1–M5 & E2E Track)
`<main id="app-shell">` MUST expose these synchronized live attributes:
- `data-stage`: `"hero" | "transition" | "egypt" | "governorate" | "project"`
- `data-scroll-progress`: `"0.00"` .. `"1.00"` (fixed 2 decimals)
- `data-governorate`: `"<governorateId>"` or `"none"` (`alexandria`, `matrouh`, `cairo`, `giza`, `red-sea`, `suez`)
- `data-project`: `"<projectId>"` or `"none"` (e.g., `sawary`, `palm-hills-alex`, `creeks-alex`, `alex-west`, `muruj-smouha`, `valore-smouha`, `antoniadis-alex`, `san-stefano`, `north-edge-alamein`, `marassi`, `hacienda-waters`, `madinaty`, `bloomfields`, `il-bosco-nac`, `zed-west`, `o-west`, `solana-west`, `el-gouna`, `makadi-heights`, `somabay`, `azha-sokhna`, `il-monte-galala`)
- `data-parcel`: `"<zoneId>"` or `"none"`
- `data-masterplan-mode`: `"2d" | "3d"`
- `data-camera-moving`: `"true" | "false"`
- `data-lang`: `"ar" | "en"` (always synced with `document.documentElement.lang` & `dir="rtl|ltr"`)
- `data-map-tiles`: `"offline-vector" | "online-enhanced" | "svg-fallback"`
- `data-webgl-hero`: `"ready" | "fallback"`
- `data-webgl-map`: `"ready" | "fallback"`

**Canonical Interactive Element IDs**:
- Hero & Top Bar: `#hero-explore-btn`, `#hero-consult-btn`, `#hero-about-btn`, `#lang-toggle-btn`, `#profile-open-btn`, `#shortlist-open-btn`
- Breadcrumbs: `#breadcrumb-hero`, `#breadcrumb-egypt`, `#breadcrumb-governorate`, `#breadcrumb-project`
- Egypt Dock & Filters: `#egypt-search-input`, `#egypt-search-results`, `#filter-reset-btn`, `#filter-category-<cat>`, `#filter-status-<status>`, `#filter-developer-select`, `#gov-card-<govId>`, `#gov-marker-<govId>`, `#non-active-gov-toast`
- Governorate & Projects: `#governorate-drawer`, `#project-card-<projectId>`, `#map-pin-<projectId>`, `#shortlist-toggle-<projectId>`
- Master Plan & Inspector: `#masterplan-controls`, `#masterplan-mode-2d`, `#masterplan-mode-3d`, `#masterplan-reset-view-btn`, `#masterplan-north-arrow`, `#masterplan-scale-bar`, `#masterplan-legend`, `#masterplan-legend-item-<zoneKind>`, `#masterplan-zone-btn-<zoneId>`, `#masterplan-zone-panel`, `#masterplan-zone-inquire-btn`, `#project-inspector`, `#project-prev-btn`, `#project-next-btn`, `#project-back-btn`
- Overlays & Consultation: `#consultant-profile-modal`, `#shortlist-drawer`, `#shortlist-consult-btn`, `#consult-open-btn`, `#consult-modal`, `#consult-form`, `#consult-name`, `#consult-phone`, `#consult-method`, `#consult-purpose`, `#consult-notes`, `#consult-submit-btn`, `#consult-confirmation`, `#consult-reference-id`, `#consult-whatsapp-link`, `#consult-close-btn`

### 2. Core TypeScript Interfaces (`src/types/portfolio.ts` — Owned by M1)
- `Locale = 'ar' | 'en'`, `LocalizedText = { ar: string; en: string }`
- `StageId = 'hero' | 'transition' | 'egypt' | 'governorate' | 'project'`
- `OverlayId = 'none' | 'profile' | 'consultation' | 'shortlist'`
- `MasterPlanMode = '2d' | '3d'`
- `ZoneKind = 'residential_villas' | 'residential_apartments' | 'waterfront_lagoon' | 'commercial_promenade' | 'clubhouse_hospitality' | 'green_park_spine' | 'main_gate_access' | 'education_medical'`
- `DeliveryStatus = 'ready_to_move' | 'ready_and_phased' | 'phased_delivery' | 'under_construction' | 'new_launch'`
- `UnitCategory = 'apartment' | 'duplex' | 'villa' | 'townhouse' | 'twin_house' | 'chalet' | 'commercial' | 'hospitality'`
- `ConsultantProfile`, `Governorate`, `MasterPlanZone`, `RealEstateProject`, `FilterState`, `ConsultationContext`, `ConsultationSubmission`

### 3. M1 ↔ M2 / M3 / M4 / M5 Module Boundaries
- `src/utils/mercator.ts`:
  - `projectEgyptToMaquette(lat: number, lng: number): { x: number; z: number }` (shared projection keeping Three.js & MapLibre optically aligned!)
  - `masterPlanToGeoJSON(project: RealEstateProject): GeoJSON.FeatureCollection` (converts normalized `[0..100]` zones & roads to exact WGS84 GeoJSON polygons around `project.coordinates` scaled by `project.masterPlan.scaleMeters` and rotated by `project.masterPlan.northAngleDeg`)
  - `haversineKm(a, b): number`
- `src/utils/search.ts`:
  - `normalizeArabic(input: string): string` (`أ/إ/آ→ا`, `ة→ه`, `ى→ي`, diacritics stripped, lowercased)
  - `filterProjects(projects, filters): RealEstateProject[]`
- `src/utils/validation.ts`:
  - `validatePhone(raw: string): { valid: boolean; normalized: string; errorKey?: string }` (Egyptian `01[0125]\d{8}` with optional `+20`/`0020` OR international `+\d{10,15}`)
  - `buildWhatsAppUrl(e164: string, message: string): string`
  - `generateReferenceId(date?: Date): string` (`REQ-YYYY-XXXX`)
- `src/utils/urlSync.ts`:
  - `parseUrlState(search: string, validGovIds: Set<string>, validProjectIds: Map<string, string>): PartialAppState`
  - `serializeUrlState(state): string`
- `src/engine/choreography.ts` (M2):
  - Exports `ChoreographyState`, `ChoreographyActions`, `useChoreography(options)`, `computeHeroCameraPose(progress)`, `computeEgyptBlend(progress)`.
- `src/map/spatialMapEngine.ts` (M3):
  - Exports `SpatialMapHandle` (`getMap()`, `scrubEgyptTransition(blend)`, `flyToGovernorate(gov, instant?)`, `flyToProject(project, mode, instant?)`, `flyToEgyptOverview(instant?)`, `setHighlightedProject(id | null)`, `setVisibleProjectIds(ids)`, `resize()`, `destroy()`).
- `src/map/masterPlanLayer.ts` (M4):
  - Exports `MasterPlanController` (`attach(map)`, `showProject(project, mode)`, `clear()`, `setMode(mode)`, `setSelectedZone(zoneId | null)`, `setActiveZoneFilter(kind | null)`, `resetView()`, `resetNorth()`, `destroy()`).

---

## Code Layout

Strict exclusive file ownership per milestone (concurrent workers MUST NEVER touch another milestone's files):

```text
/home/antigravity/AIMIMA/My-Portfolio/
├── PROJECT.md                        # Top-level Project Orchestrator
├── TEST_INFRA.md                     # E2E Testing Track
├── TEST_READY.md                     # E2E Testing Track (published when 4-tier suite ready)
├── package.json                      # M1 (includes @playwright/test@^1.65.1 + test:e2e script)
├── tsconfig.json                     # M1 (strict TypeScript ^5.9.3)
├── vite.config.ts                    # M1 (React plugin + manualChunks for three & maplibre-gl)
├── vitest.config.ts                  # M1 (happy-dom environment)
├── playwright.config.ts              # E2E Testing Track ONLY
├── index.html                        # M1 (RTL ar default, SEO meta, Google Fonts + fallbacks)
├── public/                           # M1 (favicon, OG SVG, optional consultant asset docs)
├── src/
│   ├── styles/                       # M1 (tokens.css, base.css, layout.css, components.css, animations.css)
│   ├── types/                        # M1 (portfolio.ts, geo.ts)
│   ├── data/                         # M1 (consultant.ts, egyptGeo.ts, governorates.ts, projects.ts)
│   ├── i18n/                         # M1 (translations.ts)
│   ├── utils/                        # M1 (mercator.ts, search.ts, validation.ts, urlSync.ts + __tests__)
│   ├── engine/                       # M2 (choreography.ts, heroMaquette.ts, consultantFigure.ts, egyptReliefGeometry.ts + __tests__)
│   ├── map/
│   │   ├── mapStyle.ts               # M3
│   │   ├── spatialMapEngine.ts       # M3
│   │   ├── markers.ts                # M3
│   │   ├── __tests__/spatialMap.test.ts # M3
│   │   ├── masterPlanLayer.ts        # M4
│   │   ├── cadPatterns.ts            # M4
│   │   └── __tests__/masterPlan.test.ts # M4
│   ├── components/
│   │   ├── HeroStage.tsx             # M2
│   │   ├── HeroOverlay.tsx           # M2
│   │   ├── MapStage.tsx              # M3
│   │   ├── MasterPlanControls.tsx    # M4
│   │   ├── MasterPlanLegend.tsx      # M4
│   │   ├── MasterPlanSvgFallback.tsx # M4
│   │   ├── ProjectInspector.tsx      # M4
│   │   ├── TopNavBar.tsx             # M5
│   │   ├── GovernorateRail.tsx       # M5
│   │   ├── ProjectListDrawer.tsx     # M5
│   │   ├── ConsultationModal.tsx     # M5
│   │   ├── ConsultantProfileModal.tsx # M5
│   │   ├── ShortlistDrawer.tsx       # M5
│   │   └── __tests__/                # M5 (plus component unit tests)
│   ├── App.tsx                       # M5
│   └── main.tsx                      # M5
└── e2e/                              # E2E Testing Track ONLY (Tier 1-4 opaque-box Playwright suite + fixtures/helpers)
```

---

## Verification & Canonical Commands

- **Typecheck**: `npx tsc --noEmit`
- **Unit & Component Tests**: `npx vitest run`
- **Production Build**: `npm run build`
- **E2E Suite (Playwright Headless Chromium WebGL2)**: `npm run test:e2e` (reusing `/opt/ms-playwright/chromium-1255/chrome-linux64/chrome` or `CHROME_EXECUTABLE=/usr/bin/google-chrome` with SwiftShader WebGL2 support — zero large browser download).
- **Mandatory Integrity Rule**: Zero hardcoded test bypasses, zero dummy/facade stubs, zero fabricated logs; every milestone passes independent verification (2 Reviewers + 2 Challengers + 1 Forensic Auditor) before advancing.
