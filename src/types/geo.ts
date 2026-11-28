import type * as GeoJSON from 'geojson';
import type {
  GovernorateId,
  LngLatTuple,
  ZoneKind,
} from './portfolio';

export interface GeoJsonPoint extends GeoJSON.Point {
  type: 'Point';
  coordinates: LngLatTuple;
}

export interface GeoJsonLineString extends GeoJSON.LineString {
  type: 'LineString';
  coordinates: LngLatTuple[];
}

export interface GeoJsonPolygon extends GeoJSON.Polygon {
  type: 'Polygon';
  coordinates: LngLatTuple[][];
}

export type GeoJsonGeometry = GeoJsonPoint | GeoJsonLineString | GeoJsonPolygon;

export interface GeoJsonFeature<
  G extends GeoJsonGeometry = GeoJsonGeometry,
  P extends Record<string, unknown> = Record<string, unknown>,
> extends GeoJSON.Feature<G, P> {
  type: 'Feature';
  id?: string | number;
  geometry: G;
  properties: P;
}

export interface GeoJsonFeatureCollection<
  G extends GeoJsonGeometry = GeoJsonGeometry,
  P extends Record<string, unknown> = Record<string, unknown>,
> extends GeoJSON.FeatureCollection<G, P> {
  type: 'FeatureCollection';
  features: Array<GeoJsonFeature<G, P>>;
}

export interface EgyptLandProperties {
  id: 'egypt-mainland';
  nameAr: string;
  nameEn: string;
  [key: string]: unknown;
}

export interface GovernorateGeoProperties {
  id: GovernorateId;
  nameAr: string;
  nameEn: string;
  active: boolean;
  isFlagship: boolean;
  projectCount: number;
  centerLng: number;
  centerLat: number;
  [key: string]: unknown;
}

export interface WaterwayGeoProperties {
  id: string;
  kind: 'nile_main' | 'delta_branch' | 'lake_nasser';
  nameAr: string;
  nameEn: string;
  [key: string]: unknown;
}

export interface HighwayGeoProperties {
  id: string;
  nameAr: string;
  nameEn: string;
  corridor: 'coastal' | 'desert' | 'ring' | 'red_sea';
  [key: string]: unknown;
}

export interface MasterPlanZoneFeatureProperties {
  featureType: 'zone';
  featureNumericId: number;
  projectId: string;
  zoneId: string;
  code: string;
  kind: ZoneKind;
  nameAr: string;
  nameEn: string;
  summaryAr: string;
  summaryEn: string;
  fillColor: string;
  strokeColor: string;
  patternId: string;
  /** True architectural height in meters */
  extrusionHeight: number;
  /** Scale-compensated 3D massing height in meters for MapLibre fill-extrusion */
  visualHeight: number;
  footprintRatio: string;
  centroidLng: number;
  centroidLat: number;
  [key: string]: unknown;
}

export interface MasterPlanRoadFeatureProperties {
  featureType: 'road';
  featureNumericId: number;
  projectId: string;
  roadId: string;
  roadKind: 'boulevard' | 'promenade' | 'internal';
  roadIndex: number;
  [key: string]: unknown;
}

export interface MasterPlanBoundaryFeatureProperties {
  featureType: 'boundary';
  featureNumericId: number;
  projectId: string;
  scaleMeters: number;
  northAngleDeg: number;
  [key: string]: unknown;
}

export type MasterPlanFeatureProperties =
  | MasterPlanZoneFeatureProperties
  | MasterPlanRoadFeatureProperties
  | MasterPlanBoundaryFeatureProperties;

export type MasterPlanFeatureCollection = GeoJsonFeatureCollection<
  GeoJsonPolygon | GeoJsonLineString,
  MasterPlanFeatureProperties
>;
