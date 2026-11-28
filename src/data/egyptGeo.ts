import type {
  EgyptLandProperties,
  GeoJsonFeature,
  GeoJsonFeatureCollection,
  GeoJsonLineString,
  GeoJsonPolygon,
  GovernorateGeoProperties,
  HighwayGeoProperties,
  WaterwayGeoProperties,
} from '../types/geo';
import type { GovernorateId, LngLatTuple } from '../types/portfolio';
import { ACTIVE_GOVERNORATES, CONTEXTUAL_GOVERNORATES } from './governorates';

/**
 * 62-vertex verified CCW RFC 7946 Egypt national outline ring [lng, lat].
 * Shared directly by M2 Three.js 3D relief extrusion AND M3 MapLibre offline vector style.
 */
export const EGYPT_OUTLINE_RING: LngLatTuple[] = [
  [25.15, 31.57], [24.92, 30.80], [24.71, 29.85], [24.85, 28.50], [24.98, 26.50],
  [25.00, 24.00], [25.00, 22.00], [28.00, 22.00], [31.35, 22.00], [34.50, 22.00],
  [36.88, 22.00], [36.52, 22.42], [35.85, 22.95], [35.58, 23.38], [35.50, 23.95],
  [35.24, 24.45], [34.90, 25.07], [34.55, 25.60], [34.28, 26.10], [33.96, 26.68],
  [34.04, 26.86], [33.93, 27.02], [33.86, 27.24], [33.72, 27.43], [33.42, 27.85],
  [33.08, 28.36], [32.68, 29.10], [32.46, 29.43], [32.42, 29.73], [32.54, 29.96],
  [32.58, 29.97], [32.72, 29.58], [33.12, 29.02], [33.62, 28.24], [34.26, 27.73],
  [34.43, 28.05], [34.52, 28.50], [34.68, 29.04], [34.90, 29.49], [34.56, 30.35],
  [34.22, 31.32], [33.80, 31.14], [33.15, 31.18], [32.55, 31.08], [32.31, 31.27],
  [31.84, 31.53], [31.30, 31.58], [30.80, 31.56], [30.38, 31.47], [30.10, 31.34],
  [29.99, 31.27], [29.88, 31.21], [29.68, 31.08], [29.25, 30.92], [28.95, 30.88],
  [28.65, 31.00], [28.12, 31.14], [27.85, 31.24], [27.24, 31.36], [26.40, 31.48],
  [25.60, 31.58], [25.15, 31.57],
];

export const EGYPT_OUTLINE_GEOJSON: GeoJsonFeatureCollection<
  GeoJsonPolygon,
  EgyptLandProperties
> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 1,
      geometry: {
        type: 'Polygon',
        coordinates: [EGYPT_OUTLINE_RING],
      },
      properties: {
        id: 'egypt-mainland',
        nameAr: 'جمهورية مصر العربية',
        nameEn: 'Arab Republic of Egypt',
      },
    },
  ],
};

/** Nile Valley & Delta paths shared by M2 brass filament and M3 MapLibre waterways */
export const EGYPT_NILE_PATHS: {
  main: LngLatTuple[];
  rosetta: LngLatTuple[];
  damietta: LngLatTuple[];
} = {
  main: [
    [31.32, 22.02], [31.68, 22.50], [32.15, 22.95], [32.68, 23.55], [32.89, 24.09],
    [32.95, 24.48], [32.88, 24.98], [32.64, 25.69], [32.72, 26.16], [32.02, 26.15],
    [31.70, 26.56], [31.18, 27.18], [30.82, 27.72], [30.75, 28.10], [30.86, 28.56],
    [31.09, 29.07], [31.24, 29.55], [31.23, 30.05], [31.14, 30.18],
  ],
  rosetta: [
    [31.14, 30.18], [30.88, 30.46], [30.78, 30.82], [30.58, 31.12], [30.38, 31.46],
  ],
  damietta: [
    [31.14, 30.18], [31.24, 30.52], [31.38, 30.84], [31.62, 31.18], [31.83, 31.52],
  ],
};

export const EGYPT_WATERWAYS_GEOJSON: GeoJsonFeatureCollection<
  GeoJsonLineString,
  WaterwayGeoProperties
> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 101,
      geometry: {
        type: 'LineString',
        coordinates: EGYPT_NILE_PATHS.main,
      },
      properties: {
        id: 'nile-main',
        kind: 'nile_main',
        nameAr: 'نهر النيل',
        nameEn: 'Nile River',
      },
    },
    {
      type: 'Feature',
      id: 102,
      geometry: {
        type: 'LineString',
        coordinates: EGYPT_NILE_PATHS.rosetta,
      },
      properties: {
        id: 'rosetta-branch',
        kind: 'delta_branch',
        nameAr: 'فرع رشيد',
        nameEn: 'Rosetta Branch',
      },
    },
    {
      type: 'Feature',
      id: 103,
      geometry: {
        type: 'LineString',
        coordinates: EGYPT_NILE_PATHS.damietta,
      },
      properties: {
        id: 'damietta-branch',
        kind: 'delta_branch',
        nameAr: 'فرع دمياط',
        nameEn: 'Damietta Branch',
      },
    },
  ],
};

export const EGYPT_LAKE_NASSER_GEOJSON: GeoJsonFeatureCollection<
  GeoJsonPolygon,
  WaterwayGeoProperties
> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 201,
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [31.18, 22.02], [31.48, 22.02], [31.86, 22.45], [32.42, 22.98],
            [32.84, 23.58], [32.92, 23.98], [32.76, 24.02], [32.55, 23.55],
            [32.04, 22.92], [31.50, 22.42], [31.18, 22.02],
          ],
        ],
      },
      properties: {
        id: 'lake-nasser',
        kind: 'lake_nasser',
        nameAr: 'بحيرة ناصر',
        nameEn: 'Lake Nasser',
      },
    },
  ],
};

const GOVERNORATE_RINGS: Record<GovernorateId, LngLatTuple[]> = {
  // 6 Active Featured Governorates
  alexandria: [
    [29.42, 30.96], [29.62, 30.86], [29.96, 30.95], [30.08, 31.12],
    [30.10, 31.34], [29.99, 31.27], [29.88, 31.21], [29.68, 31.08], [29.42, 30.96],
  ],
  matrouh: [
    [25.15, 31.57], [24.92, 30.80], [24.71, 29.85], [24.85, 28.50], [26.50, 28.50],
    [28.90, 28.80], [29.55, 29.90], [29.42, 30.96], [29.25, 30.92], [28.95, 30.88],
    [28.65, 31.00], [28.12, 31.14], [27.85, 31.24], [27.24, 31.36], [26.40, 31.48],
    [25.60, 31.58], [25.15, 31.57],
  ],
  cairo: [
    [31.20, 29.75], [31.88, 29.78], [31.92, 30.18], [31.58, 30.22],
    [31.24, 30.18], [31.20, 29.75],
  ],
  giza: [
    [28.90, 28.80], [29.85, 28.00], [30.10, 28.40], [30.10, 29.60], [31.12, 29.60],
    [31.22, 30.16], [30.72, 30.22], [30.20, 30.10], [29.55, 29.90], [28.90, 28.80],
  ],
  'red-sea': [
    [32.55, 28.95], [32.65, 27.60], [33.10, 26.20], [33.65, 24.50], [34.30, 23.00],
    [34.50, 22.00], [36.88, 22.00], [36.52, 22.42], [35.85, 22.95], [35.58, 23.38],
    [35.50, 23.95], [35.24, 24.45], [34.90, 25.07], [34.55, 25.60], [34.28, 26.10],
    [33.96, 26.68], [34.04, 26.86], [33.93, 27.02], [33.86, 27.24], [33.72, 27.43],
    [33.42, 27.85], [33.08, 28.36], [32.68, 29.10], [32.55, 28.95],
  ],
  suez: [
    [31.90, 29.25], [32.46, 29.25], [32.46, 29.43], [32.42, 29.73], [32.54, 29.96],
    [32.62, 30.18], [32.15, 30.25], [31.92, 30.18], [31.88, 29.78], [31.90, 29.25],
  ],

  // 21 Contextual Non-Active Egyptian Governorates
  'north-sinai': [
    [32.55, 31.08], [32.60, 30.20], [33.05, 29.75], [34.72, 29.78], [34.56, 30.35],
    [34.22, 31.32], [33.80, 31.14], [33.15, 31.18], [32.55, 31.08],
  ],
  'south-sinai': [
    [32.72, 29.58], [33.12, 29.02], [33.62, 28.24], [34.26, 27.73], [34.43, 28.05],
    [34.52, 28.50], [34.68, 29.04], [34.90, 29.49], [34.72, 29.78], [33.05, 29.75],
    [32.72, 29.58],
  ],
  'port-said': [
    [32.08, 31.05], [32.55, 31.08], [32.31, 31.27], [32.02, 31.32], [32.08, 31.05],
  ],
  ismailia: [
    [31.92, 30.18], [32.60, 30.20], [32.55, 30.92], [32.08, 31.05],
    [31.88, 30.65], [31.92, 30.18],
  ],
  damietta: [
    [31.56, 31.24], [32.02, 31.32], [31.84, 31.53], [31.55, 31.48], [31.56, 31.24],
  ],
  dakahlia: [
    [31.24, 30.72], [31.88, 30.65], [32.08, 31.05], [32.02, 31.32],
    [31.56, 31.24], [31.24, 31.20], [31.24, 30.72],
  ],
  sharqia: [
    [31.32, 30.22], [31.92, 30.18], [31.88, 30.65], [31.24, 30.72], [31.32, 30.22],
  ],
  'kafr-el-sheikh': [
    [30.48, 31.08], [31.24, 31.20], [31.55, 31.48], [31.30, 31.58],
    [30.80, 31.56], [30.38, 31.47], [30.48, 31.08],
  ],
  beheira: [
    [29.55, 29.90], [30.20, 30.10], [30.72, 30.22], [30.82, 30.72], [30.48, 31.08],
    [30.38, 31.47], [30.10, 31.34], [30.08, 31.12], [29.96, 30.95], [29.62, 30.86],
    [29.42, 30.96], [29.55, 29.90],
  ],
  gharbia: [
    [30.78, 30.68], [31.24, 30.72], [31.24, 31.20], [30.76, 31.08], [30.78, 30.68],
  ],
  monufia: [
    [30.72, 30.22], [31.18, 30.26], [31.24, 30.72], [30.78, 30.68], [30.72, 30.22],
  ],
  qalyubia: [
    [31.14, 30.18], [31.42, 30.20], [31.36, 30.52], [31.14, 30.48], [31.14, 30.18],
  ],
  fayoum: [
    [30.14, 29.02], [31.08, 29.02], [31.10, 29.56], [30.14, 29.56], [30.14, 29.02],
  ],
  'beni-suef': [
    [30.45, 28.68], [32.25, 28.70], [32.25, 29.22], [31.09, 29.22],
    [31.08, 29.00], [30.45, 28.68],
  ],
  minya: [
    [29.85, 27.60], [32.60, 27.60], [32.55, 28.70], [30.45, 28.68],
    [29.85, 28.00], [29.85, 27.60],
  ],
  assiut: [
    [30.40, 26.85], [32.78, 26.85], [32.65, 27.60], [30.35, 27.60], [30.40, 26.85],
  ],
  sohag: [
    [31.10, 26.20], [33.05, 26.20], [32.78, 26.85], [31.05, 26.85], [31.10, 26.20],
  ],
  qena: [
    [31.80, 25.75], [33.25, 25.75], [33.10, 26.20], [31.80, 26.20], [31.80, 25.75],
  ],
  luxor: [
    [31.80, 25.15], [33.42, 25.15], [33.25, 25.75], [31.80, 25.75], [31.80, 25.15],
  ],
  aswan: [
    [31.00, 22.00], [34.50, 22.00], [34.30, 23.00], [33.65, 24.50],
    [33.42, 25.15], [31.80, 25.15], [31.00, 24.20], [31.00, 22.00],
  ],
  'new-valley': [
    [25.00, 22.00], [31.00, 22.00], [31.00, 24.20], [31.80, 25.15], [31.80, 26.15],
    [30.40, 26.85], [29.85, 27.60], [29.85, 28.00], [28.90, 28.80], [26.50, 28.50],
    [24.85, 28.50], [24.98, 26.50], [25.00, 24.00], [25.00, 22.00],
  ],
};

const governorateFeatures: Array<GeoJsonFeature<GeoJsonPolygon, GovernorateGeoProperties>> = [
  ...ACTIVE_GOVERNORATES.map((gov, idx): GeoJsonFeature<GeoJsonPolygon, GovernorateGeoProperties> => ({
    type: 'Feature',
    id: idx + 1,
    geometry: {
      type: 'Polygon',
      coordinates: [GOVERNORATE_RINGS[gov.id]],
    },
    properties: {
      id: gov.id,
      nameAr: gov.name.ar,
      nameEn: gov.name.en,
      active: true,
      isFlagship: gov.isFlagship,
      projectCount: gov.projectCount,
      centerLng: gov.center.lng,
      centerLat: gov.center.lat,
    },
  })),
  ...CONTEXTUAL_GOVERNORATES.map(
    (gov, idx): GeoJsonFeature<GeoJsonPolygon, GovernorateGeoProperties> => ({
      type: 'Feature',
      id: ACTIVE_GOVERNORATES.length + idx + 1,
      geometry: {
        type: 'Polygon',
        coordinates: [GOVERNORATE_RINGS[gov.id]],
      },
      properties: {
        id: gov.id,
        nameAr: gov.name.ar,
        nameEn: gov.name.en,
        active: false,
        isFlagship: false,
        projectCount: 0,
        centerLng: gov.center.lng,
        centerLat: gov.center.lat,
      },
    }),
  ),
];

export const EGYPT_GOVERNORATES_GEOJSON: GeoJsonFeatureCollection<
  GeoJsonPolygon,
  GovernorateGeoProperties
> = {
  type: 'FeatureCollection',
  features: governorateFeatures,
};

export const EGYPT_HIGHWAYS_GEOJSON: GeoJsonFeatureCollection<
  GeoJsonLineString,
  HighwayGeoProperties
> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 301,
      geometry: {
        type: 'LineString',
        coordinates: [
          [29.88, 31.18], [29.96, 30.88], [30.22, 30.52],
          [30.58, 30.24], [30.95, 30.06], [31.14, 30.01],
        ],
      },
      properties: {
        id: 'alex-desert-rd',
        nameAr: 'طريق القاهرة الإسكندرية الصحراوي',
        nameEn: 'Cairo–Alexandria Desert Rd',
        corridor: 'desert',
      },
    },
    {
      type: 'Feature',
      id: 302,
      geometry: {
        type: 'LineString',
        coordinates: [
          [25.18, 31.54], [27.24, 31.32], [28.12, 31.08], [28.95, 30.83],
          [29.68, 31.04], [29.95, 31.22], [30.40, 31.42], [31.30, 31.52], [32.30, 31.24],
        ],
      },
      properties: {
        id: 'coastal-intl-rd',
        nameAr: 'الطريق الدولي الساحلي',
        nameEn: 'International Coastal Rd',
        corridor: 'coastal',
      },
    },
    {
      type: 'Feature',
      id: 303,
      geometry: {
        type: 'LineString',
        coordinates: [
          [31.12, 30.14], [31.36, 30.16], [31.46, 30.04],
          [31.38, 29.94], [31.14, 29.94], [31.04, 30.04], [31.12, 30.14],
        ],
      },
      properties: {
        id: 'cairo-ring-rd',
        nameAr: 'الطريق الدائري',
        nameEn: 'Cairo Ring Rd',
        corridor: 'ring',
      },
    },
    {
      type: 'Feature',
      id: 304,
      geometry: {
        type: 'LineString',
        coordinates: [
          [31.38, 30.09], [31.64, 30.10], [31.95, 30.08], [32.30, 30.02], [32.52, 29.97],
        ],
      },
      properties: {
        id: 'cairo-suez-rd',
        nameAr: 'طريق القاهرة السويس',
        nameEn: 'Cairo–Suez Rd',
        corridor: 'desert',
      },
    },
    {
      type: 'Feature',
      id: 305,
      geometry: {
        type: 'LineString',
        coordinates: [
          [31.48, 29.96], [31.95, 29.74], [32.35, 29.68], [32.38, 29.44], [32.64, 29.12],
        ],
      },
      properties: {
        id: 'galala-sokhna-rd',
        nameAr: 'طريق الجلالة والعين السخنة',
        nameEn: 'Galala & Ain Sokhna Rd',
        corridor: 'red_sea',
      },
    },
    {
      type: 'Feature',
      id: 306,
      geometry: {
        type: 'LineString',
        coordinates: [
          [32.64, 29.12], [33.05, 28.36], [33.66, 27.39], [33.82, 27.22],
          [33.88, 26.97], [33.96, 26.82], [34.25, 26.10], [34.86, 25.07],
        ],
      },
      properties: {
        id: 'red-sea-coastal-rd',
        nameAr: 'طريق البحر الأحمر الساحلي',
        nameEn: 'Red Sea Coastal Rd',
        corridor: 'red_sea',
      },
    },
  ],
};
