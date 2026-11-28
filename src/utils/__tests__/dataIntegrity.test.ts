import fs from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from '../../App';
import {
  ACTIVE_GOVERNORATES,
  CONSULTANT_PROFILE,
  CONTEXTUAL_GOVERNORATES,
  EGYPT_GOVERNORATES_GEOJSON,
  EGYPT_HIGHWAYS_GEOJSON,
  EGYPT_LAKE_NASSER_GEOJSON,
  EGYPT_OUTLINE_GEOJSON,
  EGYPT_OUTLINE_RING,
  EGYPT_WATERWAYS_GEOJSON,
  GOVERNORATE_BY_ID,
  PROJECTS,
  ZONE_KIND_META,
} from '../../data';
import { TRANSLATIONS } from '../../i18n/translations';
import type { LngLatTuple, LocalizedText, PlanPoint } from '../../types/portfolio';
import {
  EGYPT_LAT_LNG_BOUNDS,
  haversineKm,
  masterPlanToGeoJSON,
} from '../mercator';
import { buildWhatsAppUrl, validatePhone } from '../validation';

function pointInRing(px: number, py: number, ring: ReadonlyArray<readonly [number, number]>): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const pi = ring[i];
    const pj = ring[j];
    if (!pi || !pj) continue;
    const xi = pi[0];
    const yi = pi[1];
    const xj = pj[0];
    const yj = pj[1];
    const intersect =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function signedArea(ring: ReadonlyArray<readonly [number, number]>): number {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const curr = ring[i];
    const next = ring[i + 1];
    if (!curr || !next) continue;
    sum += curr[0] * next[1] - next[0] * curr[1];
  }
  return sum / 2;
}

function orientation(
  a: readonly [number, number],
  b: readonly [number, number],
  c: readonly [number, number],
): number {
  const val = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  if (Math.abs(val) < 1e-12) return 0;
  return val > 0 ? 1 : -1;
}

function segmentsProperlyIntersect(
  a1: readonly [number, number],
  a2: readonly [number, number],
  b1: readonly [number, number],
  b2: readonly [number, number],
): boolean {
  const o1 = orientation(a1, a2, b1);
  const o2 = orientation(a1, a2, b2);
  const o3 = orientation(b1, b2, a1);
  const o4 = orientation(b1, b2, a2);
  return o1 !== 0 && o2 !== 0 && o3 !== 0 && o4 !== 0 && o1 !== o2 && o3 !== o4;
}

function ringHasSelfIntersection(ring: ReadonlyArray<readonly [number, number]>): boolean {
  const n = ring.length - 1;
  for (let i = 0; i < n; i++) {
    const a1 = ring[i];
    const a2 = ring[i + 1];
    if (!a1 || !a2) continue;
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      const b1 = ring[j];
      const b2 = ring[j + 1];
      if (!b1 || !b2) continue;
      if (segmentsProperlyIntersect(a1, a2, b1, b2)) return true;
    }
  }
  return false;
}

function polygonsOverlap(polyA: readonly PlanPoint[], polyB: readonly PlanPoint[]): boolean {
  const closedA: PlanPoint[] = [...polyA, polyA[0]!];
  const closedB: PlanPoint[] = [...polyB, polyB[0]!];

  for (let i = 0; i < closedA.length - 1; i++) {
    const a1 = closedA[i]!;
    const a2 = closedA[i + 1]!;
    for (let j = 0; j < closedB.length - 1; j++) {
      const b1 = closedB[j]!;
      const b2 = closedB[j + 1]!;
      if (segmentsProperlyIntersect(a1, a2, b1, b2)) return true;
    }
  }
  for (const pt of polyA) {
    if (pointInRing(pt[0], pt[1], closedB)) return true;
  }
  for (const pt of polyB) {
    if (pointInRing(pt[0], pt[1], closedA)) return true;
  }
  return false;
}

function expectNonEmptyLocalized(text: LocalizedText, label: string): void {
  expect(text.ar.trim().length, `${label}.ar must be non-empty`).toBeGreaterThan(0);
  expect(text.en.trim().length, `${label}.en must be non-empty`).toBeGreaterThan(0);
}

function collectLeafKeys(obj: unknown, prefix = ''): string[] {
  if (typeof obj !== 'object' || obj === null) {
    return [prefix];
  }
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      keys.push(...collectLeafKeys(v, next));
    } else {
      keys.push(next);
    }
  }
  return keys.sort();
}

function collectLeafValues(obj: unknown): string[] {
  if (typeof obj === 'string') return [obj];
  if (typeof obj !== 'object' || obj === null) return [];
  const vals: string[] = [];
  for (const v of Object.values(obj)) {
    vals.push(...collectLeafValues(v));
  }
  return vals;
}

describe('Domain Data, Geography & Bilingual Integrity Invariants', () => {
  it('defines 6 active governorates (Alexandria flagship first) + 21 contextual = 27 total', () => {
    expect(ACTIVE_GOVERNORATES).toHaveLength(6);
    expect(CONTEXTUAL_GOVERNORATES).toHaveLength(21);
    expect(ACTIVE_GOVERNORATES.length + CONTEXTUAL_GOVERNORATES.length).toBe(27);

    const first = ACTIVE_GOVERNORATES[0];
    expect(first?.id).toBe('alexandria');
    expect(first?.isFlagship).toBe(true);
    expect(ACTIVE_GOVERNORATES.filter((g) => g.isFlagship)).toHaveLength(1);

    const allIds = [
      ...ACTIVE_GOVERNORATES.map((g) => g.id),
      ...CONTEXTUAL_GOVERNORATES.map((g) => g.id),
    ];
    expect(new Set(allIds).size).toBe(27);
  });

  it('defines all 22 verified projects with exact canonical IDs and per-governorate counts', () => {
    expect(PROJECTS).toHaveLength(22);

    const expectedCounts: Record<string, number> = {
      alexandria: 8,
      matrouh: 3,
      cairo: 3,
      giza: 3,
      'red-sea': 3,
      suez: 2,
    };

    const actualCounts: Record<string, number> = {};
    for (const p of PROJECTS) {
      actualCounts[p.governorateId] = (actualCounts[p.governorateId] ?? 0) + 1;
    }
    expect(actualCounts).toEqual(expectedCounts);

    for (const gov of ACTIVE_GOVERNORATES) {
      expect(gov.projectCount).toBe(actualCounts[gov.id]);
    }

    const projectIds = PROJECTS.map((p) => p.id);
    expect(new Set(projectIds).size).toBe(22);
    expect(projectIds).toEqual(
      expect.arrayContaining([
        'sawary',
        'palm-hills-alex',
        'creeks-alex',
        'alex-west',
        'muruj-smouha',
        'valore-smouha',
        'antoniadis-alex',
        'san-stefano',
        'north-edge-alamein',
        'marassi',
        'hacienda-waters',
        'madinaty',
        'bloomfields',
        'il-bosco-nac',
        'zed-west',
        'o-west',
        'solana-west',
        'el-gouna',
        'makadi-heights',
        'somabay',
        'azha-sokhna',
        'il-monte-galala',
      ]),
    );
  });

  it('places all 22 projects inside Egypt bounds, parent focusBounds, Egypt outline, and parent polygon', () => {
    const govGeoById = new Map<string, LngLatTuple[]>();
    for (const feature of EGYPT_GOVERNORATES_GEOJSON.features) {
      const ring = feature.geometry.coordinates[0];
      if (ring) govGeoById.set(feature.properties.id, ring);
    }

    for (const project of PROJECTS) {
      const { lat, lng } = project.coordinates;
      expect(lat, `${project.id} lat`).toBeGreaterThanOrEqual(EGYPT_LAT_LNG_BOUNDS.minLat);
      expect(lat, `${project.id} lat`).toBeLessThanOrEqual(EGYPT_LAT_LNG_BOUNDS.maxLat);
      expect(lng, `${project.id} lng`).toBeGreaterThanOrEqual(EGYPT_LAT_LNG_BOUNDS.minLng);
      expect(lng, `${project.id} lng`).toBeLessThanOrEqual(EGYPT_LAT_LNG_BOUNDS.maxLng);

      const parentGov = GOVERNORATE_BY_ID.get(project.governorateId);
      expect(parentGov, `Missing parent gov for ${project.id}`).toBeDefined();
      const [[west, south], [east, north]] = parentGov!.focusBounds;
      expect(lng, `${project.id} lng > west`).toBeGreaterThan(west);
      expect(lng, `${project.id} lng < east`).toBeLessThan(east);
      expect(lat, `${project.id} lat > south`).toBeGreaterThan(south);
      expect(lat, `${project.id} lat < north`).toBeLessThan(north);

      expect(
        pointInRing(lng, lat, EGYPT_OUTLINE_RING),
        `${project.id} inside Egypt outline polygon`,
      ).toBe(true);

      const govRing = govGeoById.get(project.governorateId);
      expect(govRing).toBeDefined();
      expect(
        pointInRing(lng, lat, govRing!),
        `${project.id} inside parent ${project.governorateId} polygon`,
      ).toBe(true);
    }
  });

  it('maintains >= 1.0 km Haversine separation across all 231 pairs of projects', () => {
    let minKm = Infinity;
    let pairCount = 0;

    for (let i = 0; i < PROJECTS.length; i++) {
      for (let j = i + 1; j < PROJECTS.length; j++) {
        pairCount++;
        const a = PROJECTS[i]!;
        const b = PROJECTS[j]!;
        const dist = haversineKm(a.coordinates, b.coordinates);
        if (dist < minKm) minKm = dist;
        expect(dist, `${a.id} <-> ${b.id}`).toBeGreaterThanOrEqual(1.0);
      }
    }

    expect(pairCount).toBe(231);
    expect(minKm).toBeGreaterThan(1.4);
  });

  it('verifies all 132 master-plan zones have unique IDs, valid [0..100] geometry, zero self-intersections, and zero sibling overlaps', () => {
    const seenZoneIds = new Set<string>();
    let totalZones = 0;

    for (const project of PROJECTS) {
      const { zones, roads } = project.masterPlan;
      expect(zones.length, `${project.id} zone count`).toBeGreaterThanOrEqual(5);
      expect(zones.length, `${project.id} zone count`).toBeLessThanOrEqual(8);
      expect(roads.length, `${project.id} road count`).toBeGreaterThanOrEqual(1);
      expect(project.conciseSummary.highlights.length).toBeGreaterThanOrEqual(1);
      expect(project.conciseSummary.highlights.length).toBeLessThanOrEqual(4);

      for (const zone of zones) {
        totalZones++;
        expect(seenZoneIds.has(zone.id), `Duplicate zone id ${zone.id}`).toBe(false);
        seenZoneIds.add(zone.id);
        expect(zone.polygon.length, `${zone.id} vertices`).toBeGreaterThanOrEqual(3);
        expect(zone.extrusionHeight, `${zone.id} extrusionHeight`).toBeGreaterThan(0);

        for (const [u, v] of zone.polygon) {
          expect(u).toBeGreaterThanOrEqual(0);
          expect(u).toBeLessThanOrEqual(100);
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(100);
        }

        const closed: PlanPoint[] = [...zone.polygon, zone.polygon[0]!];
        expect(Math.abs(signedArea(closed)), `${zone.id} non-degenerate area`).toBeGreaterThan(1);
        expect(ringHasSelfIntersection(closed), `${zone.id} self-intersection`).toBe(false);
      }

      // Check sibling zones do not overlap
      for (let i = 0; i < zones.length; i++) {
        for (let j = i + 1; j < zones.length; j++) {
          const za = zones[i]!;
          const zb = zones[j]!;
          expect(
            polygonsOverlap(za.polygon, zb.polygon),
            `${project.id}: ${za.id} overlaps ${zb.id}`,
          ).toBe(false);
        }
      }

      // Verify GeoJSON output lies inside Egypt bounds
      const fc = masterPlanToGeoJSON(project);
      expect(fc.features.length).toBe(1 + zones.length + roads.length);
    }

    expect(totalZones).toBe(132);
  });

  it('verifies Egypt GeoJSON national outline, Lake Nasser, waterways, and all 27 governorate polygons are closed CCW with zero self-intersections', () => {
    expect(EGYPT_OUTLINE_GEOJSON.features).toHaveLength(1);
    expect(EGYPT_GOVERNORATES_GEOJSON.features).toHaveLength(27);
    expect(EGYPT_WATERWAYS_GEOJSON.features).toHaveLength(3);
    expect(EGYPT_LAKE_NASSER_GEOJSON.features).toHaveLength(1);

    const allPolygonRings: Array<{ name: string; ring: LngLatTuple[] }> = [
      { name: 'egypt-mainland', ring: EGYPT_OUTLINE_RING },
      ...EGYPT_GOVERNORATES_GEOJSON.features.map((f) => ({
        name: f.properties.id,
        ring: f.geometry.coordinates[0]!,
      })),
      ...EGYPT_LAKE_NASSER_GEOJSON.features.map((f) => ({
        name: f.properties.id,
        ring: f.geometry.coordinates[0]!,
      })),
    ];

    for (const { name, ring } of allPolygonRings) {
      expect(ring.length, `${name} ring length`).toBeGreaterThanOrEqual(4);
      const first = ring[0]!;
      const last = ring[ring.length - 1]!;
      expect(first, `${name} closed`).toEqual(last);
      expect(signedArea(ring), `${name} CCW positive area`).toBeGreaterThan(0);
      expect(ringHasSelfIntersection(ring), `${name} self-intersection`).toBe(false);

      for (const [lng, lat] of ring) {
        expect(lng).toBeGreaterThanOrEqual(EGYPT_LAT_LNG_BOUNDS.minLng);
        expect(lng).toBeLessThanOrEqual(EGYPT_LAT_LNG_BOUNDS.maxLng);
        expect(lat).toBeGreaterThanOrEqual(EGYPT_LAT_LNG_BOUNDS.minLat);
        expect(lat).toBeLessThanOrEqual(EGYPT_LAT_LNG_BOUNDS.maxLat);
      }
    }

    // Verify all highway corridors and Nile waterways lie strictly inside Egypt bounds
    expect(EGYPT_HIGHWAYS_GEOJSON.features.length).toBeGreaterThanOrEqual(6);
    for (const feature of [
      ...EGYPT_HIGHWAYS_GEOJSON.features,
      ...EGYPT_WATERWAYS_GEOJSON.features,
    ]) {
      expect(feature.geometry.coordinates.length).toBeGreaterThanOrEqual(2);
      for (const [lng, lat] of feature.geometry.coordinates) {
        expect(lng, `${feature.properties.id} lng`).toBeGreaterThanOrEqual(
          EGYPT_LAT_LNG_BOUNDS.minLng,
        );
        expect(lng, `${feature.properties.id} lng`).toBeLessThanOrEqual(
          EGYPT_LAT_LNG_BOUNDS.maxLng,
        );
        expect(lat, `${feature.properties.id} lat`).toBeGreaterThanOrEqual(
          EGYPT_LAT_LNG_BOUNDS.minLat,
        );
        expect(lat, `${feature.properties.id} lat`).toBeLessThanOrEqual(
          EGYPT_LAT_LNG_BOUNDS.maxLat,
        );
      }
    }
  });

  it('verifies all LocalizedText fields and TRANSLATIONS AR/EN key tree parity with zero empty strings', () => {
    expectNonEmptyLocalized(CONSULTANT_PROFILE.name, 'consultant.name');
    expectNonEmptyLocalized(CONSULTANT_PROFILE.title, 'consultant.title');
    expectNonEmptyLocalized(CONSULTANT_PROFILE.tagline, 'consultant.tagline');
    expectNonEmptyLocalized(CONSULTANT_PROFILE.bio, 'consultant.bio');
    expectNonEmptyLocalized(CONSULTANT_PROFILE.portraitAlt, 'consultant.portraitAlt');
    expectNonEmptyLocalized(CONSULTANT_PROFILE.profilePhotoAlt, 'consultant.profilePhotoAlt');
    expectNonEmptyLocalized(CONSULTANT_PROFILE.location, 'consultant.location');
    CONSULTANT_PROFILE.stats.forEach((s, i) => expectNonEmptyLocalized(s.label, `stat[${i}]`));
    CONSULTANT_PROFILE.credentials.forEach((c, i) => expectNonEmptyLocalized(c, `cred[${i}]`));
    CONSULTANT_PROFILE.specialties.forEach((s, i) => expectNonEmptyLocalized(s, `spec[${i}]`));
    CONSULTANT_PROFILE.partnerDevelopers.forEach((d, i) =>
      expectNonEmptyLocalized(d, `partner[${i}]`),
    );

    expect(CONSULTANT_PROFILE.portraitUrl).toBe('/assets/consultant/hero-leaning.png');
    expect(CONSULTANT_PROFILE.profilePhotoUrl).toBe('/assets/consultant/profile-portrait.webp');
    expect(validatePhone(CONSULTANT_PROFILE.contact.whatsappE164).valid).toBe(true);

    for (const gov of ACTIVE_GOVERNORATES) {
      expectNonEmptyLocalized(gov.name, `${gov.id}.name`);
      expectNonEmptyLocalized(gov.shortName, `${gov.id}.shortName`);
      expectNonEmptyLocalized(gov.tagline, `${gov.id}.tagline`);
      expectNonEmptyLocalized(gov.regionSummary, `${gov.id}.regionSummary`);
    }

    for (const gov of CONTEXTUAL_GOVERNORATES) {
      expectNonEmptyLocalized(gov.name, `${gov.id}.name`);
    }

    for (const meta of Object.values(ZONE_KIND_META)) {
      expectNonEmptyLocalized(meta.label, `zoneMeta.${meta.kind}`);
    }

    for (const project of PROJECTS) {
      expectNonEmptyLocalized(project.name, `${project.id}.name`);
      expectNonEmptyLocalized(project.developer, `${project.id}.developer`);
      expectNonEmptyLocalized(project.district, `${project.id}.district`);
      expectNonEmptyLocalized(project.conciseSummary.areaRangeSqm, `${project.id}.area`);
      expectNonEmptyLocalized(project.conciseSummary.indicativePrice, `${project.id}.price`);
      expectNonEmptyLocalized(project.conciseSummary.paymentHorizon, `${project.id}.payment`);
      expectNonEmptyLocalized(project.conciseSummary.deliveryWindow, `${project.id}.delivery`);
      project.conciseSummary.highlights.forEach((h, i) =>
        expectNonEmptyLocalized(h, `${project.id}.highlight[${i}]`),
      );
      for (const zone of project.masterPlan.zones) {
        expectNonEmptyLocalized(zone.name, `${zone.id}.name`);
        expectNonEmptyLocalized(zone.summary, `${zone.id}.summary`);
        if (zone.unitMix) {
          expectNonEmptyLocalized(zone.unitMix, `${zone.id}.unitMix`);
        }
      }
    }

    const arKeys = collectLeafKeys(TRANSLATIONS.ar);
    const enKeys = collectLeafKeys(TRANSLATIONS.en);
    expect(arKeys).toEqual(enKeys);
    expect(arKeys.length).toBeGreaterThan(100);

    for (const val of [...collectLeafValues(TRANSLATIONS.ar), ...collectLeafValues(TRANSLATIONS.en)]) {
      expect(val.trim().length).toBeGreaterThan(0);
    }
  });

  it('enforces exact verified consultant identity, contact channels, real PNG/WebP assets within size budgets, and zero identity drift', () => {
    expect(CONSULTANT_PROFILE.name.ar).toBe('عبدالله ابراهيم محمد');
    expect(CONSULTANT_PROFILE.name.en).toBe('Abdullah Ibrahim Mohamed');
    expect(CONSULTANT_PROFILE.title.ar).toBe('مستشار عقاري أول');
    expect(CONSULTANT_PROFILE.title.en).toBe('Senior Property Consultant');

    expect(CONSULTANT_PROFILE.contact.phoneDisplay).toBe('01280249440');
    expect(CONSULTANT_PROFILE.contact.whatsappE164).toBe('+201280249440');
    expect(CONSULTANT_PROFILE.contact.whatsappUrl).toBe('https://wa.me/201280249440');
    expect(validatePhone(CONSULTANT_PROFILE.contact.phoneDisplay)).toEqual({
      valid: true,
      normalized: '+201280249440',
    });
    expect(validatePhone(CONSULTANT_PROFILE.contact.whatsappE164)).toEqual({
      valid: true,
      normalized: '+201280249440',
    });
    expect(buildWhatsAppUrl(CONSULTANT_PROFILE.contact.whatsappE164, '')).toBe(
      'https://wa.me/201280249440',
    );
    expect(buildWhatsAppUrl(CONSULTANT_PROFILE.contact.phoneDisplay, '')).toBe(
      'https://wa.me/201280249440',
    );

    expect(CONSULTANT_PROFILE.portraitUrl).toBe('/assets/consultant/hero-leaning.png');
    expect(CONSULTANT_PROFILE.profilePhotoUrl).toBe('/assets/consultant/profile-portrait.webp');
    expectNonEmptyLocalized(CONSULTANT_PROFILE.profilePhotoAlt, 'consultant.profilePhotoAlt');
    expect(CONSULTANT_PROFILE.portraitFallback?.svgFallbackEnabled).toBe(true);

    // Verify real processed public assets physically exist, carry valid binary headers, and fit strict size budgets
    const publicDir = path.resolve(process.cwd(), 'public');
    const heroAbs = path.join(publicDir, 'assets/consultant/hero-leaning.png');
    const profileAbs = path.join(publicDir, 'assets/consultant/profile-portrait.webp');
    expect(fs.existsSync(heroAbs), 'Missing public/assets/consultant/hero-leaning.png').toBe(true);
    expect(fs.existsSync(profileAbs), 'Missing public/assets/consultant/profile-portrait.webp').toBe(true);

    const heroBuf = fs.readFileSync(heroAbs);
    expect(heroBuf.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    expect(heroBuf.length).toBeGreaterThanOrEqual(50_000);
    expect(heroBuf.length).toBeLessThan(500_000);

    const profileBuf = fs.readFileSync(profileAbs);
    expect(profileBuf.subarray(0, 4).toString('ascii')).toBe('RIFF');
    expect(profileBuf.subarray(8, 12).toString('ascii')).toBe('WEBP');
    expect(profileBuf.length).toBeGreaterThanOrEqual(15_000);
    expect(profileBuf.length).toBeLessThan(150_000);

    for (const relPath of ['favicon.svg', 'og-card.svg']) {
      const absPath = path.join(publicDir, relPath);
      expect(fs.existsSync(absPath), `Missing public asset: ${relPath}`).toBe(true);
      expect(fs.statSync(absPath).size, `Empty public asset: ${relPath}`).toBeGreaterThan(0);
    }

    // Zero stale spelling or leftover placeholder phone regressions in translations
    const allAr = collectLeafValues(TRANSLATIONS.ar).join('\n');
    const allEn = collectLeafValues(TRANSLATIONS.en).join('\n');
    expect(allAr).not.toContain('عبدالله إبراهيم محمد');
    expect(allAr).not.toContain('01000000000');
    expect(allAr).not.toContain('01012345678');
    expect(allEn).not.toContain('Abdullah Ibrahim Mohammed');
    expect(allEn).not.toContain('01000000000');
    expect(allEn).not.toContain('01012345678');

    expect(TRANSLATIONS.ar.meta.title).toContain('عبدالله ابراهيم محمد');
    expect(TRANSLATIONS.ar.meta.title).toContain('مستشار عقاري أول');
    expect(TRANSLATIONS.ar.nav.brandSubtitle).toBe('مستشار عقاري أول');
    expect(TRANSLATIONS.en.meta.title).toContain('Abdullah Ibrahim Mohamed');
    expect(TRANSLATIONS.en.meta.title).toContain('Senior Property Consultant');
    expect(TRANSLATIONS.en.nav.brandSubtitle).toBe('Senior Property Consultant');
  });

  it('places all 27 governorate centers strictly inside ONLY their own polygon (zero misses or border-strip overlaps)', () => {
    const allGovernorates = [...ACTIVE_GOVERNORATES, ...CONTEXTUAL_GOVERNORATES];
    expect(allGovernorates).toHaveLength(27);

    const govRings = EGYPT_GOVERNORATES_GEOJSON.features.map((feature) => ({
      id: feature.properties.id,
      ring: feature.geometry.coordinates[0]!,
    }));

    for (const gov of allGovernorates) {
      const containing = govRings
        .filter(({ ring }) => pointInRing(gov.center.lng, gov.center.lat, ring))
        .map(({ id }) => id);
      expect(
        containing,
        `Governorate ${gov.id} center (${gov.center.lat}, ${gov.center.lng}) contained by [${containing.join(', ')}]`,
      ).toEqual([gov.id]);
    }
  });

  it('enforces public/og-card.svg RTL text-anchor="start" and CSS cascade safety invariants', () => {
    const rootDir = process.cwd();
    const ogSvg = fs.readFileSync(path.join(rootDir, 'public/og-card.svg'), 'utf8');

    // Every RTL <text> element must anchor at inline-start (right edge), NEVER text-anchor="end"
    const rtlTextTags = ogSvg.match(/<text\b[^>]*direction="rtl"[^>]*>/g) ?? [];
    expect(rtlTextTags.length).toBeGreaterThanOrEqual(3);
    for (const tag of rtlTextTags) {
      expect(tag).toContain('text-anchor="start"');
      expect(tag).not.toContain('text-anchor="end"');
    }
    expect(ogSvg).not.toContain('<filter');
    expect(ogSvg).toContain('عبدالله ابراهيم محمد');
    expect(ogSvg).toContain('Abdullah Ibrahim Mohamed');
    expect(ogSvg).toContain('01 · SENIOR PROPERTY CONSULTANT · EGYPT');
    expect(ogSvg).toContain('مستشار عقاري أول');

    // components.css must wrap .surface-plaster position: relative in zero-specificity :where()
    const componentsCss = fs.readFileSync(path.join(rootDir, 'src/styles/components.css'), 'utf8');
    expect(componentsCss).toMatch(/:where\(\.surface-plaster\)\s*\{\s*position:\s*relative;\s*\}/);
    expect(componentsCss).not.toMatch(/(?<!:where\()\.surface-plaster\s*\{[^}]*position:\s*relative/);
    expect(componentsCss).toMatch(/\.surface-plaster\s*\{\s*isolation:\s*isolate;\s*\}/);
    expect(componentsCss).toContain('.eyebrow:lang(ar)');
    expect(componentsCss).toContain('.eyebrow[dir=\'rtl\']');

    // base.css must reset tracking tokens on arbitrary :lang(ar) / [dir='rtl'] elements
    const baseCss = fs.readFileSync(path.join(rootDir, 'src/styles/base.css'), 'utf8');
    expect(baseCss).toMatch(/:lang\(ar\),\s*\[dir='rtl'\]\s*\{[^}]*--tracking-display:\s*0;[^}]*--tracking-eyebrow:\s*0;[^}]*letter-spacing:\s*0;/);
  });
});

describe('M1 Minimal Bootable Shell Contract (<App />)', () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  it('renders <main id="app-shell"> with all 11 canonical data-* attributes, single h1, and lossless AR/EN RTL/LTR toggle', () => {
    render(createElement(App));

    const main = document.getElementById('app-shell');
    expect(main).toBeInTheDocument();
    expect(main?.tagName).toBe('MAIN');
    expect(main).toHaveAttribute('data-stage', 'hero');
    expect(main).toHaveAttribute('data-scroll-progress', '0.00');
    expect(main).toHaveAttribute('data-governorate', 'none');
    expect(main).toHaveAttribute('data-project', 'none');
    expect(main).toHaveAttribute('data-parcel', 'none');
    expect(main).toHaveAttribute('data-masterplan-mode', '2d');
    expect(main).toHaveAttribute('data-camera-moving', 'false');
    expect(main).toHaveAttribute('data-lang', 'ar');
    expect(main).toHaveAttribute('data-map-tiles', 'offline-vector');
    expect(main).toHaveAttribute('data-webgl-hero', 'fallback');
    expect(main).toHaveAttribute('data-webgl-map', 'fallback');

    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');

    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(CONSULTANT_PROFILE.name.ar);

    const toggle = document.getElementById('lang-toggle-btn') as HTMLButtonElement;
    expect(toggle).toBeInTheDocument();
    fireEvent.click(toggle);

    expect(main).toHaveAttribute('data-lang', 'en');
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
    expect(headings[0]).toHaveTextContent(CONSULTANT_PROFILE.name.en);
  });
});
