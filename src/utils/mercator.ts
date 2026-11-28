import type * as GeoJSON from 'geojson';
import { ZONE_KIND_META } from '../data/projects';
import type {
  GeoJsonFeature,
  GeoJsonLineString,
  GeoJsonPolygon,
  MasterPlanBoundaryFeatureProperties,
  MasterPlanFeatureCollection,
  MasterPlanRoadFeatureProperties,
  MasterPlanZoneFeatureProperties,
} from '../types/geo';
import type {
  GeoBounds,
  GeoPoint,
  LngLatTuple,
  PlanPoint,
  RealEstateProject,
  ZoneKind,
} from '../types/portfolio';

export { ZONE_KIND_META };

export const EGYPT_CENTER: GeoPoint = { lat: 26.82, lng: 30.8 };

/** MapLibre LngLatBoundsLike [[west, south], [east, north]] enclosing Egypt */
export const EGYPT_BOUNDS: GeoBounds = [
  [24.7, 22.0],
  [36.9, 31.67],
];

export const EGYPT_LAT_LNG_BOUNDS = {
  minLat: 22.0,
  maxLat: 31.67,
  minLng: 24.7,
  maxLng: 36.9,
} as const;

/** Exact Spherical Web Mercator (EPSG:3857) aspect ratio W / H of EGYPT_BOUNDS */
export const EGYPT_MERCATOR_ASPECT = 1.1237;

export const EARTH_RADIUS_KM = 6371.0088;
export const EARTH_CIRCUMFERENCE_M = 40075016.68557849;
export const METERS_PER_DEG_LAT = 111320;

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const MAX_MERCATOR_LAT = 85.051129;

const HALF_EGYPT_MERC_X =
  ((EGYPT_LAT_LNG_BOUNDS.maxLng - EGYPT_LAT_LNG_BOUNDS.minLng) * DEG_TO_RAD) / 2;

export const ZONE_KIND_COLORS: Record<ZoneKind, string> = {
  residential_villas: ZONE_KIND_META.residential_villas.fillColor,
  residential_apartments: ZONE_KIND_META.residential_apartments.fillColor,
  waterfront_lagoon: ZONE_KIND_META.waterfront_lagoon.fillColor,
  commercial_promenade: ZONE_KIND_META.commercial_promenade.fillColor,
  clubhouse_hospitality: ZONE_KIND_META.clubhouse_hospitality.fillColor,
  green_park_spine: ZONE_KIND_META.green_park_spine.fillColor,
  main_gate_access: ZONE_KIND_META.main_gate_access.fillColor,
  education_medical: ZONE_KIND_META.education_medical.fillColor,
};

export interface ScaleBarMetrics {
  meters: number;
  widthPx: number;
  metersPerPixel: number;
  labelAr: string;
  labelEn: string;
}

/**
 * Conformal Spherical Web Mercator Y coordinate in radians.
 */
export function mercatorY(latDeg: number): number {
  const clamped = Math.max(-MAX_MERCATOR_LAT, Math.min(MAX_MERCATOR_LAT, latDeg));
  const rad = clamped * DEG_TO_RAD;
  return Math.log(Math.tan(Math.PI / 4 + rad / 2));
}

const CENTER_MERC_X = EGYPT_CENTER.lng * DEG_TO_RAD;
const CENTER_MERC_Y = mercatorY(EGYPT_CENTER.lat);

/**
 * Projects WGS84 (lat, lng) into Three.js architectural maquette plane (x, z),
 * conformally aligned with MapLibre GL JS Web Mercator (EPSG:3857):
 *   +X = East, -Z = North, +Z = South.
 */
export function projectEgyptToMaquette(
  lat: number,
  lng: number,
  halfSpan = 1,
): { x: number; z: number } {
  const scale = halfSpan / HALF_EGYPT_MERC_X;
  const rawX = (lng * DEG_TO_RAD - CENTER_MERC_X) * scale;
  const rawZ = -(mercatorY(lat) - CENTER_MERC_Y) * scale;
  return {
    x: rawX === 0 ? 0 : rawX,
    z: rawZ === 0 ? 0 : rawZ,
  };
}

/**
 * Exact inverse of projectEgyptToMaquette, returning WGS84 { lat, lng }.
 */
export function unprojectMaquetteToEgypt(
  x: number,
  z: number,
  halfSpan = 1,
): GeoPoint {
  const scale = halfSpan / HALF_EGYPT_MERC_X;
  const lng = (x / scale + CENTER_MERC_X) * RAD_TO_DEG;
  const my = CENTER_MERC_Y - z / scale;
  const lat = (2 * Math.atan(Math.exp(my)) - Math.PI / 2) * RAD_TO_DEG;
  return {
    lat: lat === 0 ? 0 : lat,
    lng: lng === 0 ? 0 : lng,
  };
}

/**
 * Projects a normalized [u, v] in [0..100, 0..100] master-plan coordinate
 * (u: West→East, v: North→South) into RFC 7946 [lng, lat] around site center,
 * scaled by scaleMeters and rotated clockwise by northAngleDeg.
 */
export function projectLocalSitePointToLngLat(
  u: number,
  v: number,
  center: GeoPoint,
  scaleMeters: number,
  northAngleDeg: number,
): LngLatTuple {
  const eastLocal = ((u - 50) / 100) * scaleMeters;
  const northLocal = ((50 - v) / 100) * scaleMeters;
  const theta = northAngleDeg * DEG_TO_RAD;
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);

  const eastRot = eastLocal * cosT + northLocal * sinT;
  const northRot = -eastLocal * sinT + northLocal * cosT;

  const metersPerDegLng = METERS_PER_DEG_LAT * Math.cos(center.lat * DEG_TO_RAD);
  const lng = center.lng + eastRot / metersPerDegLng;
  const lat = center.lat + northRot / METERS_PER_DEG_LAT;
  return [lng, lat];
}

function signedRingArea(ring: readonly LngLatTuple[]): number {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const curr = ring[i];
    const next = ring[i + 1];
    if (!curr || !next) continue;
    sum += curr[0] * next[1] - next[0] * curr[1];
  }
  return sum / 2;
}

function ensureClosedCcwRing(points: readonly LngLatTuple[]): LngLatTuple[] {
  const ring: LngLatTuple[] = points.map(([lng, lat]) => [lng, lat]);
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first && last && (first[0] !== last[0] || first[1] !== last[1])) {
    ring.push([first[0], first[1]]);
  }
  if (signedRingArea(ring) < 0) {
    ring.reverse();
  }
  return ring;
}

function computeRingCentroid(ccwClosedRing: readonly LngLatTuple[]): LngLatTuple {
  let area2 = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < ccwClosedRing.length - 1; i++) {
    const p0 = ccwClosedRing[i];
    const p1 = ccwClosedRing[i + 1];
    if (!p0 || !p1) continue;
    const cross = p0[0] * p1[1] - p1[0] * p0[1];
    area2 += cross;
    cx += (p0[0] + p1[0]) * cross;
    cy += (p0[1] + p1[1]) * cross;
  }
  if (Math.abs(area2) > 1e-14) {
    return [cx / (3 * area2), cy / (3 * area2)];
  }
  const count = Math.max(1, ccwClosedRing.length - 1);
  let sumLng = 0;
  let sumLat = 0;
  for (let i = 0; i < count; i++) {
    const pt = ccwClosedRing[i];
    if (!pt) continue;
    sumLng += pt[0];
    sumLat += pt[1];
  }
  return [sumLng / count, sumLat / count];
}

/**
 * Converts a project's normalized [0..100] architectural master plan into a
 * georeferenced RFC 7946 FeatureCollection ready for MapLibre GL JS v6 layers
 * and `map.setFeatureState` (top-level positive integer `id` on every feature).
 */
export function masterPlanToGeoJSON(
  project: RealEstateProject,
): MasterPlanFeatureCollection {
  const { coordinates, masterPlan } = project;
  const { scaleMeters, northAngleDeg, zones, roads } = masterPlan;

  const heightScaleFactor = Math.max(1, Math.min(2.8, scaleMeters / 850));

  const features: Array<
    GeoJsonFeature<
      GeoJsonPolygon | GeoJsonLineString,
      | MasterPlanZoneFeatureProperties
      | MasterPlanRoadFeatureProperties
      | MasterPlanBoundaryFeatureProperties
    >
  > = [];

  // 1. Outer site boundary polygon ([2,2]..[98,98], closed CCW, top-level id = 9000)
  const boundaryPlanPoints: readonly PlanPoint[] = [
    [2, 2],
    [98, 2],
    [98, 98],
    [2, 98],
  ];
  const boundaryRing = ensureClosedCcwRing(
    boundaryPlanPoints.map(([u, v]) =>
      projectLocalSitePointToLngLat(u, v, coordinates, scaleMeters, northAngleDeg),
    ),
  );
  features.push({
    type: 'Feature',
    id: 9000,
    geometry: {
      type: 'Polygon',
      coordinates: [boundaryRing],
    },
    properties: {
      featureType: 'boundary',
      featureNumericId: 9000,
      projectId: project.id,
      scaleMeters,
      northAngleDeg,
    },
  });

  // 2. Architectural land-use zone polygons (ids 1..zones.length)
  zones.forEach((zone, index) => {
    const featureNumericId = index + 1;
    const meta = ZONE_KIND_META[zone.kind];
    const projectedRing = ensureClosedCcwRing(
      zone.polygon.map(([u, v]) =>
        projectLocalSitePointToLngLat(u, v, coordinates, scaleMeters, northAngleDeg),
      ),
    );
    const [centroidLng, centroidLat] = computeRingCentroid(projectedRing);
    const visualHeight = Math.round(zone.extrusionHeight * heightScaleFactor * 10) / 10;

    features.push({
      type: 'Feature',
      id: featureNumericId,
      geometry: {
        type: 'Polygon',
        coordinates: [projectedRing],
      },
      properties: {
        featureType: 'zone',
        featureNumericId,
        projectId: project.id,
        zoneId: zone.id,
        code: zone.code,
        kind: zone.kind,
        nameAr: zone.name.ar,
        nameEn: zone.name.en,
        summaryAr: zone.summary.ar,
        summaryEn: zone.summary.en,
        fillColor: meta.fillColor,
        strokeColor: meta.strokeColor,
        patternId: meta.patternId,
        extrusionHeight: zone.extrusionHeight,
        visualHeight,
        footprintRatio: zone.footprintRatio ?? '',
        centroidLng,
        centroidLat,
      },
    });
  });

  // 3. Internal road & promenade LineStrings (ids 1001..1000+roads.length)
  roads.forEach((road, index) => {
    const featureNumericId = 1001 + index;
    const roadCoords = road.points.map(([u, v]) =>
      projectLocalSitePointToLngLat(u, v, coordinates, scaleMeters, northAngleDeg),
    );
    features.push({
      type: 'Feature',
      id: featureNumericId,
      geometry: {
        type: 'LineString',
        coordinates: roadCoords,
      },
      properties: {
        featureType: 'road',
        featureNumericId,
        projectId: project.id,
        roadId: road.id,
        roadKind: road.kind,
        roadIndex: index,
      },
    });
  });

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * Computes [[minLng, minLat], [maxLng, maxLat]] bounding box across all geometries
 * in any RFC 7946 FeatureCollection.
 */
export function computeGeoJSONBounds(fc: GeoJSON.FeatureCollection): GeoBounds {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  const visitPosition = (pos: GeoJSON.Position): void => {
    const lng = pos[0];
    const lat = pos[1];
    if (
      typeof lng !== 'number' ||
      typeof lat !== 'number' ||
      !Number.isFinite(lng) ||
      !Number.isFinite(lat)
    ) {
      return;
    }
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  };

  const visitGeometry = (geometry: GeoJSON.Geometry | null): void => {
    if (!geometry) return;
    switch (geometry.type) {
      case 'Point':
        visitPosition(geometry.coordinates);
        break;
      case 'MultiPoint':
      case 'LineString':
        geometry.coordinates.forEach(visitPosition);
        break;
      case 'MultiLineString':
      case 'Polygon':
        geometry.coordinates.forEach((ring) => ring.forEach(visitPosition));
        break;
      case 'MultiPolygon':
        geometry.coordinates.forEach((poly) =>
          poly.forEach((ring) => ring.forEach(visitPosition)),
        );
        break;
      case 'GeometryCollection':
        geometry.geometries.forEach(visitGeometry);
        break;
    }
  };

  for (const feature of fc.features) {
    visitGeometry(feature.geometry);
  }

  if (!Number.isFinite(minLng)) {
    return [
      [EGYPT_CENTER.lng, EGYPT_CENTER.lat],
      [EGYPT_CENTER.lng, EGYPT_CENTER.lat],
    ];
  }

  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

/**
 * Great-circle Haversine distance in kilometers between two WGS84 points.
 */
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = (b.lat - a.lat) * DEG_TO_RAD;
  const dLng = (b.lng - a.lng) * DEG_TO_RAD;
  const lat1 = a.lat * DEG_TO_RAD;
  const lat2 = b.lat * DEG_TO_RAD;

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
  return EARTH_RADIUS_KM * c;
}

/**
 * Computes cartographic metric scale bar values using MapLibre GL JS's 512px world tile pitch.
 */
export function computeScaleBarMeters(
  lat: number,
  zoom: number,
  maxWidthPx = 120,
): ScaleBarMetrics {
  const finiteLat = Number.isFinite(lat) ? lat : EGYPT_CENTER.lat;
  const finiteZoom = Number.isFinite(zoom) ? zoom : 10;
  const finiteMaxW =
    Number.isFinite(maxWidthPx) && maxWidthPx > 0 ? maxWidthPx : 120;

  const clampedLat = Math.max(-MAX_MERCATOR_LAT, Math.min(MAX_MERCATOR_LAT, finiteLat));
  const clampedZoom = Math.max(0, Math.min(22, finiteZoom));
  const safeMaxWidth = Math.max(1, finiteMaxW);

  const metersPerPixel =
    (EARTH_CIRCUMFERENCE_M * Math.cos(clampedLat * DEG_TO_RAD)) /
    (512 * Math.pow(2, clampedZoom));

  const maxMeters = metersPerPixel * safeMaxWidth;
  const exponent = Math.floor(Math.log10(maxMeters));
  const magnitude = Math.pow(10, exponent);

  let niceMeters = magnitude;
  const steps = [1, 2, 5] as const;
  for (const step of steps) {
    const candidate = step * magnitude;
    if (candidate <= maxMeters) {
      niceMeters = candidate;
    }
  }
  if (niceMeters > maxMeters) {
    niceMeters = 5 * Math.pow(10, exponent - 1);
  }

  const subMeterDecimals =
    niceMeters < 1
      ? Math.max(1, -Math.floor(Math.log10(niceMeters) + 1e-12))
      : 0;
  const cleanMeters =
    subMeterDecimals > 0
      ? Number(niceMeters.toFixed(subMeterDecimals))
      : Math.round(niceMeters);

  const widthPx = Math.min(
    safeMaxWidth,
    Number((cleanMeters / metersPerPixel).toFixed(1)),
  );
  const isKm = cleanMeters >= 1000;
  const displayNum = isKm
    ? Number((cleanMeters / 1000).toFixed(cleanMeters % 1000 === 0 ? 0 : 1))
    : cleanMeters;

  return {
    meters: cleanMeters,
    widthPx,
    metersPerPixel,
    labelAr: isKm ? `${displayNum} كم` : `${displayNum} م`,
    labelEn: isKm ? `${displayNum} km` : `${displayNum} m`,
  };
}
