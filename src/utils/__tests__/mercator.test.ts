import type * as GeoJSON from 'geojson';
import { describe, expect, it } from 'vitest';
import { PROJECTS, getProjectById } from '../../data';
import type { LngLatTuple, RealEstateProject } from '../../types/portfolio';
import {
  EGYPT_BOUNDS,
  EGYPT_CENTER,
  EGYPT_LAT_LNG_BOUNDS,
  EGYPT_MERCATOR_ASPECT,
  ZONE_KIND_COLORS,
  ZONE_KIND_META,
  computeGeoJSONBounds,
  computeScaleBarMeters,
  haversineKm,
  masterPlanToGeoJSON,
  mercatorY,
  projectEgyptToMaquette,
  projectLocalSitePointToLngLat,
  unprojectMaquetteToEgypt,
} from '../mercator';

function signedRingArea(ring: readonly LngLatTuple[]): number {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const curr = ring[i]!;
    const next = ring[i + 1]!;
    sum += curr[0] * next[1] - next[0] * curr[1];
  }
  return sum / 2;
}

describe('Web Mercator Projection, MasterPlan GeoJSON & Spatial Utilities', () => {
  it('projects EGYPT_CENTER to exact positive zero { x: 0, z: 0 } and preserves cardinal signs', () => {
    const center = projectEgyptToMaquette(EGYPT_CENTER.lat, EGYPT_CENTER.lng);
    expect(Object.is(center.x, 0)).toBe(true);
    expect(Object.is(center.z, 0)).toBe(true);

    // Alexandria is North-West of EGYPT_CENTER => x < 0, z < 0
    const alex = projectEgyptToMaquette(31.185, 29.915);
    expect(alex.x).toBeLessThan(0);
    expect(alex.z).toBeLessThan(0);

    // El Gouna is East of EGYPT_CENTER => x > 0
    const gouna = projectEgyptToMaquette(27.385, 33.6792);
    expect(gouna.x).toBeGreaterThan(0);

    // Aswan is South of EGYPT_CENTER => z > 0
    const aswan = projectEgyptToMaquette(24.0889, 32.8998);
    expect(aswan.z).toBeGreaterThan(0);

    // SW and NE bounds match expected Mercator aspect ratio (~1.1237)
    const sw = projectEgyptToMaquette(EGYPT_BOUNDS[0][1], EGYPT_BOUNDS[0][0]);
    const ne = projectEgyptToMaquette(EGYPT_BOUNDS[1][1], EGYPT_BOUNDS[1][0]);
    expect(sw.x).toBeCloseTo(-1, 6);
    expect(ne.x).toBeCloseTo(1, 6);
    const computedAspect = (ne.x - sw.x) / (sw.z - ne.z);
    expect(computedAspect).toBeCloseTo(EGYPT_MERCATOR_ASPECT, 3);
  });

  it('round-trips projectEgyptToMaquette <-> unprojectMaquetteToEgypt within < 1e-6° across all 22 projects', () => {
    for (const halfSpan of [1, 4.5]) {
      for (const project of PROJECTS) {
        const pt = projectEgyptToMaquette(
          project.coordinates.lat,
          project.coordinates.lng,
          halfSpan,
        );
        const restored = unprojectMaquetteToEgypt(pt.x, pt.z, halfSpan);
        expect(Math.abs(restored.lat - project.coordinates.lat)).toBeLessThan(1e-6);
        expect(Math.abs(restored.lng - project.coordinates.lng)).toBeLessThan(1e-6);
      }
    }
    expect(mercatorY(0)).toBeCloseTo(0, 10);
  });

  it('georeferences local site points accurately at 0° North and 90° clockwise rotation', () => {
    const center = { lat: 31.1635, lng: 29.9185 };
    const [cLng, cLat] = projectLocalSitePointToLngLat(50, 50, center, 1000, 0);
    expect(cLng).toBeCloseTo(center.lng, 10);
    expect(cLat).toBeCloseTo(center.lat, 10);

    // At northAngleDeg = 0°, [50, 0] is 500m due North
    const [nLng, nLat] = projectLocalSitePointToLngLat(50, 0, center, 1000, 0);
    expect(nLng).toBeCloseTo(center.lng, 8);
    expect(nLat).toBeGreaterThan(center.lat);
    const northDistMeters = haversineKm(center, { lat: nLat, lng: nLng }) * 1000;
    expect(Math.abs(northDistMeters - 500) / 500).toBeLessThan(0.005);

    // At northAngleDeg = 90° clockwise, [50, 0] rotates to 500m due East
    const [eLng, eLat] = projectLocalSitePointToLngLat(50, 0, center, 1000, 90);
    expect(eLat).toBeCloseTo(center.lat, 8);
    expect(eLng).toBeGreaterThan(center.lng);
    const eastDistMeters = haversineKm(center, { lat: eLat, lng: eLng }) * 1000;
    expect(Math.abs(eastDistMeters - 500) / 500).toBeLessThan(0.005);
  });

  it('emits valid RFC 7946 FeatureCollections with unique positive numeric IDs, CCW rings, real-meter heights, and scale-compensated visualHeight', () => {
    for (const project of PROJECTS) {
      const fc = masterPlanToGeoJSON(project);
      // Compile-time + runtime check that MasterPlanFeatureCollection satisfies @types/geojson FeatureCollection
      const standardFc: GeoJSON.FeatureCollection = fc;
      expect(standardFc.type).toBe('FeatureCollection');

      const seenIds = new Set<number>();
      let zoneCount = 0;
      let roadCount = 0;
      let boundaryCount = 0;

      for (const feature of fc.features) {
        expect(typeof feature.id).toBe('number');
        const id = feature.id as number;
        expect(Number.isInteger(id) && id > 0).toBe(true);
        expect(seenIds.has(id), `${project.id} duplicate feature id ${id}`).toBe(false);
        seenIds.add(id);

        if (feature.properties.featureType === 'boundary') {
          boundaryCount++;
          expect(id).toBe(9000);
          expect(feature.geometry.type).toBe('Polygon');
          if (feature.geometry.type === 'Polygon') {
            const ring = feature.geometry.coordinates[0]!;
            expect(ring[0]).toEqual(ring[ring.length - 1]);
            expect(signedRingArea(ring)).toBeGreaterThan(0);
          }
        } else if (feature.properties.featureType === 'zone') {
          zoneCount++;
          expect(id).toBeGreaterThanOrEqual(1);
          expect(id).toBeLessThanOrEqual(project.masterPlan.zones.length);
          expect(feature.geometry.type).toBe('Polygon');
          if (feature.geometry.type === 'Polygon') {
            const ring = feature.geometry.coordinates[0]!;
            expect(ring.length).toBeGreaterThanOrEqual(4);
            expect(ring[0]).toEqual(ring[ring.length - 1]);
            expect(signedRingArea(ring)).toBeGreaterThan(0);
          }

          const srcZone = project.masterPlan.zones.find((z) => z.id === feature.properties.zoneId);
          expect(srcZone).toBeDefined();
          // Real meters preserved (NOT multiplied by 12!)
          expect(feature.properties.extrusionHeight).toBe(srcZone!.extrusionHeight);
          const expectedVisual =
            Math.round(
              srcZone!.extrusionHeight *
                Math.max(1, Math.min(2.8, project.masterPlan.scaleMeters / 850)) *
                10,
            ) / 10;
          expect(feature.properties.visualHeight).toBe(expectedVisual);
          expect(feature.properties.fillColor).toBe(ZONE_KIND_COLORS[srcZone!.kind]);
          expect(feature.properties.patternId).toBe(ZONE_KIND_META[srcZone!.kind].patternId);
        } else {
          roadCount++;
          expect(id).toBeGreaterThanOrEqual(1001);
          expect(feature.geometry.type).toBe('LineString');
        }
      }

      expect(boundaryCount).toBe(1);
      expect(zoneCount).toBe(project.masterPlan.zones.length);
      expect(roadCount).toBe(project.masterPlan.roads.length);

      const bounds = computeGeoJSONBounds(fc);
      const [[minLng, minLat], [maxLng, maxLat]] = bounds;
      expect(minLng).toBeLessThan(project.coordinates.lng);
      expect(maxLng).toBeGreaterThan(project.coordinates.lng);
      expect(minLat).toBeLessThan(project.coordinates.lat);
      expect(maxLat).toBeGreaterThan(project.coordinates.lat);
      expect(minLat).toBeGreaterThan(EGYPT_LAT_LNG_BOUNDS.minLat);
      expect(maxLat).toBeLessThan(EGYPT_LAT_LNG_BOUNDS.maxLat);
    }

    // Verify specific height contrast: small boutique project (scaleMeters=220 -> factor 1) vs huge master city (scaleMeters=3600 -> factor 2.8)
    const valore = getProjectById('valore-smouha') as RealEstateProject;
    const madinaty = getProjectById('madinaty') as RealEstateProject;
    const valoreZone = masterPlanToGeoJSON(valore).features.find(
      (f) => f.properties.featureType === 'zone',
    );
    const madinatyZone = masterPlanToGeoJSON(madinaty).features.find(
      (f) => f.properties.featureType === 'zone',
    );
    expect(valoreZone?.properties.featureType === 'zone' && valoreZone.properties.visualHeight).toBe(
      valore.masterPlan.zones[0]!.extrusionHeight,
    );
    expect(
      madinatyZone?.properties.featureType === 'zone' && madinatyZone.properties.visualHeight,
    ).toBe(Math.round(madinaty.masterPlan.zones[0]!.extrusionHeight * 2.8 * 10) / 10);
  });

  it('computes symmetric Haversine distances and accurate Cairo-Alexandria separation', () => {
    const alex = { lat: 31.2001, lng: 29.9187 };
    const cairo = { lat: 30.0444, lng: 31.2357 };

    expect(haversineKm(alex, alex)).toBe(0);
    const d1 = haversineKm(alex, cairo);
    const d2 = haversineKm(cairo, alex);
    expect(d1).toBeCloseTo(d2, 10);
    expect(d1).toBeGreaterThan(170);
    expect(d1).toBeLessThan(190);
  });

  it('computes monotonic 512px MapLibre scale bars with AR/EN units', () => {
    const egyptScale = computeScaleBarMeters(26.82, 5.5, 120);
    const alexScale = computeScaleBarMeters(31.185, 11, 120);
    const sawaryScale = computeScaleBarMeters(31.1635, 15.8, 120);

    expect(egyptScale.meters).toBeGreaterThan(alexScale.meters);
    expect(alexScale.meters).toBeGreaterThan(sawaryScale.meters);

    expect(egyptScale.meters).toBe(100000);
    expect(egyptScale.labelEn).toBe('100 km');
    expect(egyptScale.labelAr).toBe('100 كم');

    expect(alexScale.meters).toBe(2000);
    expect(alexScale.labelEn).toBe('2 km');
    expect(alexScale.labelAr).toBe('2 كم');

    expect(sawaryScale.meters).toBe(100);
    expect(sawaryScale.labelEn).toBe('100 m');
    expect(sawaryScale.labelAr).toBe('100 م');

    expect(sawaryScale.widthPx).toBeLessThanOrEqual(120);
    expect(sawaryScale.widthPx).toBeGreaterThan(40);

    // Extreme-zoom tiny-bar clamping invariant
    const extremeZoomScale = computeScaleBarMeters(31.16, 22, 24);
    expect(extremeZoomScale.widthPx).toBeLessThanOrEqual(24);
    expect(extremeZoomScale.widthPx).toBeGreaterThan(0);
    expect(extremeZoomScale.meters).toBeGreaterThan(0);
    expect(extremeZoomScale.meters).toBeLessThan(1);
    expect(extremeZoomScale.labelEn).toMatch(/^0\.\d m$/);
    expect(extremeZoomScale.labelAr).toMatch(/^0\.\d م$/);
  });

  it('strictly enforces widthPx <= maxWidthPx for maxWidthPx < 24, exact sub-0.1m labels, and non-finite input resilience', () => {
    // Egypt grid including narrow maxWidthPx < 24 (1, 8, 16, 18, 20, 22, 24, 120)
    const lats = [22, 24.08, 26.82, 30.04, 31.16, 31.67];
    const zooms = [4, 8, 12, 16, 20, 22];
    const widths = [1, 8, 16, 18, 20, 22, 24, 120];

    for (const lat of lats) {
      for (const zoom of zooms) {
        for (const maxW of widths) {
          const bar = computeScaleBarMeters(lat, zoom, maxW);
          expect(Number.isFinite(bar.meters)).toBe(true);
          expect(Number.isFinite(bar.widthPx)).toBe(true);
          expect(Number.isFinite(bar.metersPerPixel)).toBe(true);
          expect(bar.meters).toBeGreaterThan(0);
          expect(bar.widthPx).toBeGreaterThan(0);
          expect(
            bar.widthPx,
            `Overflow at lat=${lat}, zoom=${zoom}, maxW=${maxW}: widthPx=${bar.widthPx}`,
          ).toBeLessThanOrEqual(maxW);
          expect(bar.labelEn).not.toMatch(/NaN|^0 [mk]/);
          expect(bar.labelAr).not.toMatch(/NaN|^0 [مك]/);
        }
      }
    }

    // Specific narrow-bar regressions
    expect(computeScaleBarMeters(31.16, 4, 16).widthPx).toBeLessThanOrEqual(16);
    expect(computeScaleBarMeters(31.16, 16, 16).widthPx).toBeLessThanOrEqual(16);

    // Exact sub-0.1m label parity (no truncation to "0 m" or rounding 0.05 to "0.1 m")
    const polar002 = computeScaleBarMeters(85.051129, 22, 24);
    expect(polar002.meters).toBe(0.02);
    expect(polar002.widthPx).toBeLessThanOrEqual(24);
    expect(polar002.labelEn).toBe('0.02 m');
    expect(polar002.labelAr).toBe('0.02 م');

    const polar005 = computeScaleBarMeters(80, 22, 24);
    expect(polar005.meters).toBe(0.05);
    expect(polar005.widthPx).toBeLessThanOrEqual(24);
    expect(polar005.labelEn).toBe('0.05 m');
    expect(polar005.labelAr).toBe('0.05 م');

    const ultraNarrow = computeScaleBarMeters(85.051129, 22, 1);
    expect(ultraNarrow.meters).toBe(0.001);
    expect(ultraNarrow.widthPx).toBeLessThanOrEqual(1);
    expect(ultraNarrow.widthPx).toBeGreaterThan(0);
    expect(ultraNarrow.labelEn).toBe('0.001 m');
    expect(ultraNarrow.labelAr).toBe('0.001 م');

    // Non-finite input guards (NaN / Infinity / non-positive maxWidthPx)
    for (const bad of [
      computeScaleBarMeters(NaN, 15, 120),
      computeScaleBarMeters(31.16, NaN, -10),
      computeScaleBarMeters(Infinity, -Infinity, 0),
    ]) {
      expect(Number.isFinite(bad.meters)).toBe(true);
      expect(Number.isFinite(bad.widthPx)).toBe(true);
      expect(Number.isFinite(bad.metersPerPixel)).toBe(true);
      expect(bad.meters).toBeGreaterThan(0);
      expect(bad.widthPx).toBeGreaterThan(0);
      expect(bad.widthPx).toBeLessThanOrEqual(120);
      expect(bad.labelEn).not.toContain('NaN');
      expect(bad.labelAr).not.toContain('NaN');
    }
  });

  it('ignores non-finite Infinity/-Infinity/NaN coordinates in computeGeoJSONBounds', () => {
    const nonFiniteOnly: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [Infinity, -Infinity] },
          properties: {},
        },
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [NaN, 31.16] },
          properties: {},
        },
      ],
    };
    expect(computeGeoJSONBounds(nonFiniteOnly)).toEqual([
      [EGYPT_CENTER.lng, EGYPT_CENTER.lat],
      [EGYPT_CENTER.lng, EGYPT_CENTER.lat],
    ]);

    const mixed: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        ...nonFiniteOnly.features,
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [29.9, 31.1],
              [Infinity, 31.2],
              [30.1, 31.3],
            ],
          },
          properties: {},
        },
      ],
    };
    expect(computeGeoJSONBounds(mixed)).toEqual([
      [29.9, 31.1],
      [30.1, 31.3],
    ]);
  });
});
