export type Locale = 'ar' | 'en';

export interface LocalizedText {
  ar: string;
  en: string;
}

/** Canonical primary stages reflected in <main id="app-shell" data-stage="..."> */
export type StageId = 'hero' | 'transition' | 'egypt' | 'governorate' | 'project';

/** Orthogonal overlays accessible from any stage without disturbing map/camera state */
export type OverlayId = 'none' | 'profile' | 'consultation' | 'shortlist';

/** Master Plan visualization mode reflected in data-masterplan-mode */
export type MasterPlanMode = '2d' | '3d';

/** Canonical 6 active real-estate governorate IDs */
export type ActiveGovernorateId =
  | 'alexandria'
  | 'matrouh'
  | 'cairo'
  | 'giza'
  | 'red-sea'
  | 'suez';

/** All 21 contextual non-active Egyptian governorate IDs */
export type ContextualGovernorateId =
  | 'north-sinai'
  | 'south-sinai'
  | 'port-said'
  | 'ismailia'
  | 'damietta'
  | 'dakahlia'
  | 'sharqia'
  | 'kafr-el-sheikh'
  | 'beheira'
  | 'gharbia'
  | 'monufia'
  | 'qalyubia'
  | 'fayoum'
  | 'beni-suef'
  | 'minya'
  | 'assiut'
  | 'sohag'
  | 'qena'
  | 'luxor'
  | 'aswan'
  | 'new-valley';

export type GovernorateId = ActiveGovernorateId | ContextualGovernorateId;

/** Frozen 8-member architectural land-use taxonomy (matches PROJECT.md & E2E IDs) */
export type ZoneKind =
  | 'residential_villas'
  | 'residential_apartments'
  | 'waterfront_lagoon'
  | 'commercial_promenade'
  | 'clubhouse_hospitality'
  | 'green_park_spine'
  | 'main_gate_access'
  | 'education_medical';

export type DeliveryStatus =
  | 'ready_to_move'
  | 'ready_and_phased'
  | 'phased_delivery'
  | 'under_construction'
  | 'new_launch';

export type UnitCategory =
  | 'apartment'
  | 'duplex'
  | 'villa'
  | 'townhouse'
  | 'twin_house'
  | 'chalet'
  | 'commercial'
  | 'hospitality';

export type ContactMethod = 'whatsapp' | 'phone' | 'email';

export type ConsultationPurpose =
  | 'investment'
  | 'residence'
  | 'vacation_home'
  | 'commercial'
  | 'comparison';

export type ConsultationErrorKey =
  | 'nameRequired'
  | 'nameTooShort'
  | 'phoneRequired'
  | 'phoneInvalidEgyptianPrefix'
  | 'phoneInvalidFormat'
  | 'methodRequired'
  | 'purposeRequired';

/** Unambiguous WGS84 point — also directly satisfies MapLibre LngLatLike */
export interface GeoPoint {
  lat: number;
  lng: number;
}

/** RFC 7946 GeoJSON / MapLibre position tuple: [longitude, latitude] */
export type LngLatTuple = [lng: number, lat: number];

/** MapLibre LngLatBoundsLike tuple: [[westLng, southLat], [eastLng, northLat]] */
export type GeoBounds = [southwest: LngLatTuple, northeast: LngLatTuple];

/** Normalized [u, v] vertex inside [0..100, 0..100] (u: West→East, v: North→South) */
export type PlanPoint = [u: number, v: number];

export interface PortraitAnchor {
  x: number;
  y: number;
  scale: number;
}

export interface ConsultantContact {
  whatsappE164: string;
  whatsappUrl: string;
  phoneDisplay: string;
  email: string;
  linkedinUrl?: string;
  instagramUrl?: string;
  githubUrl?: string;
}

export interface ConsultantStat {
  value: string;
  label: LocalizedText;
}

export interface PortraitFallbackMeta {
  /** Monogram rendered inside architectural SVG silhouette/medallion fallback (EC-15) */
  monogram: string;
  /** Natural aspect ratio (width / height) hint for Hero cutout plane before texture decode */
  heroAspectRatio?: number;
  /** CSS object-position framing for the editorial profile portrait (e.g. '50% 20%') */
  profileObjectPosition?: string;
  /** Enables automatic architectural SVG fallback on load failure or null URL (EC-15) */
  svgFallbackEnabled: boolean;
}

export interface ConsultantProfile {
  name: LocalizedText;
  monogram: string;
  title: LocalizedText;
  tagline: LocalizedText;
  bio: LocalizedText;
  /**
   * Hero 3D Maquette rim-anchored leaning consultant cutout (alpha PNG/WebP under `/assets/consultant/`).
   * Consumed by M2 (`consultantFigure.ts` / `HeroMaquetteEngine`). Falls back gracefully to bespoke
   * architectural SVG studio artwork if `null` or on load error (EC-15).
   */
  portraitUrl: string | null;
  portraitAlt: LocalizedText;
  portraitAnchor?: PortraitAnchor;
  /**
   * Executive studio headshot (WebP/PNG under `/assets/consultant/`) for M5 (`ConsultantProfileModal` & identity cards).
   * Falls back gracefully to architectural SVG monogram medallion if `null` or on load error (EC-15).
   */
  profilePhotoUrl: string | null;
  profilePhotoAlt: LocalizedText;
  /** Framing & automatic SVG fallback metadata consumed by M2 and M5 (EC-15) */
  portraitFallback?: PortraitFallbackMeta;
  location: LocalizedText;
  contact: ConsultantContact;
  stats: ConsultantStat[];
  credentials: LocalizedText[];
  specialties: LocalizedText[];
  coveredGovernorateIds: ActiveGovernorateId[];
  partnerDevelopers: LocalizedText[];
}

export interface Governorate {
  id: ActiveGovernorateId;
  active: true;
  isFlagship: boolean;
  displayOrder: number;
  name: LocalizedText;
  shortName: LocalizedText;
  tagline: LocalizedText;
  regionSummary: LocalizedText;
  /** WGS84 focal center (also valid MapLibre LngLatLike) */
  center: GeoPoint;
  /** Strictly encloses all projects in this governorate: [[west, south], [east, north]] */
  focusBounds: GeoBounds;
  /** Calibrated MapLibre focus zoom for desktop/tablet framing */
  zoom: number;
  /** Subtle architectural camera bearing (degrees clockwise from North) */
  bearing: number;
  /** Target tilt pitch in Governorate Focus (degrees, strictly <= 60) */
  pitch: number;
  projectCount: number;
}

export interface ContextualGovernorate {
  id: ContextualGovernorateId;
  active: false;
  name: LocalizedText;
  center: GeoPoint;
}

export interface ZoneKindMeta {
  kind: ZoneKind;
  codePrefix: string;
  label: LocalizedText;
  fillColor: string;
  strokeColor: string;
  patternId: string;
  defaultHeightMeters: number;
}

export interface MasterPlanZone {
  id: string;
  code: string;
  kind: ZoneKind;
  name: LocalizedText;
  summary: LocalizedText;
  unitMix?: LocalizedText;
  footprintRatio?: string;
  /** Normalized [0..100, 0..100] architectural polygon vertices (open ring, >= 4 vertices) */
  polygon: PlanPoint[];
  /** Real architectural massing height in meters (0.5m water → 115m skyscrapers) */
  extrusionHeight: number;
}

export interface MasterPlanRoad {
  id: string;
  kind: 'boulevard' | 'promenade' | 'internal';
  points: PlanPoint[];
}

export interface MasterPlanSpec {
  /** Clockwise rotation of site plan top edge (v=0) relative to True North in degrees */
  northAngleDeg: number;
  /** Physical width of the [0..100] square site plan in meters */
  scaleMeters: number;
  /** Calibrated MapLibre zoom so site renders ~480px across on desktop */
  masterPlanZoom: number;
  /** Internal boulevard & promenade polylines in [0..100] space */
  roads: MasterPlanRoad[];
  /** 5–7 non-overlapping architectural land-use zones */
  zones: MasterPlanZone[];
}

export interface ProjectConciseSummary {
  areaRangeSqm: LocalizedText;
  indicativePrice: LocalizedText;
  paymentHorizon: LocalizedText;
  deliveryWindow: LocalizedText;
  /** Max 4 concise bullet highlights (conversion-engineered teaser) */
  highlights: LocalizedText[];
}

export interface RealEstateProject {
  id: string;
  governorateId: ActiveGovernorateId;
  featured?: boolean;
  name: LocalizedText;
  developer: LocalizedText;
  district: LocalizedText;
  /** Verified WGS84 site centroid */
  coordinates: GeoPoint;
  areaFeddans: number;
  greenWaterPercent: number;
  status: DeliveryStatus;
  unitCategories: UnitCategory[];
  conciseSummary: ProjectConciseSummary;
  masterPlan: MasterPlanSpec;
}

export interface FilterState {
  query: string;
  governorateId: ActiveGovernorateId | null;
  unitCategory: UnitCategory | null;
  status: DeliveryStatus | null;
  developer: string | null;
}

export interface ConsultationContext {
  governorateId: ActiveGovernorateId | null;
  projectId: string | null;
  zoneId: string | null;
  shortlistProjectIds: string[];
}

export interface ConsultationSubmission {
  referenceId: string;
  submittedAt: string;
  locale: Locale;
  fullName: string;
  phoneRaw: string;
  phoneNormalized: string;
  preferredMethod: ContactMethod;
  purpose: ConsultationPurpose;
  notes: string;
  context: ConsultationContext;
}

export interface PartialAppState {
  locale: Locale;
  stage: StageId;
  governorateId: ActiveGovernorateId | null;
  projectId: string | null;
  masterPlanMode: MasterPlanMode;
}

export type MapTileMode = 'offline-vector' | 'online-enhanced' | 'svg-fallback';
export type WebGLStatus = 'ready' | 'fallback';
