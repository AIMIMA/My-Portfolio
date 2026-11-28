import type {
  ActiveGovernorateId,
  ContextualGovernorate,
  Governorate,
  GovernorateId,
} from '../types/portfolio';

export const ACTIVE_GOVERNORATES: readonly Governorate[] = [
  {
    id: 'alexandria',
    active: true,
    isFlagship: true,
    displayOrder: 1,
    name: {
      ar: 'الإسكندرية',
      en: 'Alexandria',
    },
    shortName: {
      ar: 'الإسكندرية',
      en: 'Alexandria',
    },
    tagline: {
      ar: 'عروس البحر المتوسط ومشاريع الإسكندرية الجديدة',
      en: 'Pearl of the Mediterranean & New Alexandria',
    },
    regionSummary: {
      ar: 'المحور الرئيسي للاستشارات: تغطية شاملة لـ 8 مشروعات كبرى تمتد من الإسكندرية الجديدة وبحيرة مريوط إلى سموحة وكينج مريوط وسان ستيفانو على الكورنيش.',
      en: 'Flagship advisory corridor spanning 8 premier developments across New Alexandria, Lake Mariout, Smouha, King Mariout, and the San Stefano Corniche seafront.',
    },
    center: { lat: 31.185, lng: 29.915 },
    focusBounds: [
      [29.66, 31.02],
      [30.02, 31.28],
    ],
    zoom: 10.2,
    bearing: -14,
    pitch: 40,
    projectCount: 8,
  },
  {
    id: 'matrouh',
    active: true,
    isFlagship: false,
    displayOrder: 2,
    name: {
      ar: 'مطروح (الساحل والعلمين)',
      en: 'Matrouh (North Coast & New Alamein)',
    },
    shortName: {
      ar: 'الساحل والعلمين',
      en: 'North Coast',
    },
    tagline: {
      ar: 'العلمين الجديدة، سيدي عبد الرحمن ورأس الحكمة',
      en: 'New Alamein, Sidi Abdel Rahman & Ras El Hekma',
    },
    regionSummary: {
      ar: 'أقوى الوجهات الساحلية والاستثمارية في المتوسط من أبراج العلمين الجديدة ومراسي سيدي عبد الرحمن حتى خليج رأس الحكمة.',
      en: 'Egypt’s premier Mediterranean coastal corridor stretching from New Alamein beachfront towers and Marassi Bay to Ras El Hekma.',
    },
    center: { lat: 30.97, lng: 28.56 },
    focusBounds: [
      [27.95, 30.78],
      [29.1, 31.18],
    ],
    zoom: 8.6,
    bearing: -8,
    pitch: 38,
    projectCount: 3,
  },
  {
    id: 'cairo',
    active: true,
    isFlagship: false,
    displayOrder: 3,
    name: {
      ar: 'القاهرة (الجديدة والعاصمة)',
      en: 'Cairo (New Cairo & New Capital)',
    },
    shortName: {
      ar: 'شرق القاهرة',
      en: 'East Cairo',
    },
    tagline: {
      ar: 'التجمع الخامس، مدينة المستقبل والعاصمة الإدارية',
      en: 'Fifth Settlement, Mostakbal City & New Capital',
    },
    regionSummary: {
      ar: 'مدن الجيل الرابع والمجتمعات العمرانية المتكاملة شرق القاهرة على محاور السويس وبن زايد.',
      en: 'Integrated fourth-generation master cities across East Cairo along the Cairo–Suez and Bin Zayed corridors.',
    },
    center: { lat: 30.04, lng: 31.66 },
    focusBounds: [
      [31.42, 29.9],
      [31.8, 30.15],
    ],
    zoom: 10.2,
    bearing: 6,
    pitch: 40,
    projectCount: 3,
  },
  {
    id: 'giza',
    active: true,
    isFlagship: false,
    displayOrder: 4,
    name: {
      ar: 'الجيزة (زايد وأكتوبر)',
      en: 'Giza (Sheikh Zayed & 6th of October)',
    },
    shortName: {
      ar: 'غرب القاهرة',
      en: 'West Cairo',
    },
    tagline: {
      ar: 'الشيخ زايد، زايد الجديدة و6 أكتوبر',
      en: 'Sheikh Zayed, New Zayed & 6th of October',
    },
    regionSummary: {
      ar: 'مجتمعات غرب القاهرة الراقية المتميزة بالكثافة المنخفضة والحدائق المركزية ومحور الضبعة والواحات.',
      en: 'Low-density West Cairo residential enclaves anchored around ZED Park, 6th of October, and the New Zayed Dabaa Axis.',
    },
    center: { lat: 30.02, lng: 30.945 },
    focusBounds: [
      [30.8, 29.9],
      [31.08, 30.12],
    ],
    zoom: 10.5,
    bearing: -6,
    pitch: 40,
    projectCount: 3,
  },
  {
    id: 'red-sea',
    active: true,
    isFlagship: false,
    displayOrder: 5,
    name: {
      ar: 'البحر الأحمر (الجونة وسوما باي)',
      en: 'Red Sea (El Gouna & Somabay)',
    },
    shortName: {
      ar: 'البحر الأحمر',
      en: 'Red Sea',
    },
    tagline: {
      ar: 'الجونة، مكادي هايتس وشبه جزيرة سوما باي',
      en: 'El Gouna, Makadi Heights & Somabay Peninsula',
    },
    regionSummary: {
      ar: 'مدن البحيرات الفيروزية واليخوت والسياحة المستدامة طوال العام بعوائد إيجارية دولارية متميزة.',
      en: 'Year-round Red Sea yachting, lagoon, and golf resort cities offering resilient seasonal and international rental yields.',
    },
    center: { lat: 27.065, lng: 33.85 },
    focusBounds: [
      [33.55, 26.75],
      [34.1, 27.48],
    ],
    zoom: 8.8,
    bearing: 12,
    pitch: 40,
    projectCount: 3,
  },
  {
    id: 'suez',
    active: true,
    isFlagship: false,
    displayOrder: 6,
    name: {
      ar: 'السويس (العين السخنة والجلالة)',
      en: 'Suez (Ain Sokhna & El Galala)',
    },
    shortName: {
      ar: 'العين السخنة',
      en: 'Ain Sokhna',
    },
    tagline: {
      ar: 'منتجعات الجلالة وشواطئ العين السخنة',
      en: 'El Galala Terraces & Ain Sokhna Coast',
    },
    regionSummary: {
      ar: 'أقرب واجهة بحرية للقاهرة والعاصمة الإدارية بمصاطب الجلالة المعمارية واللاجون الكريستالي.',
      en: 'Cairo’s closest Red Sea retreat combining mountainous Galala terraces, yacht marinas, and crystal lagoons.',
    },
    center: { lat: 29.575, lng: 32.385 },
    focusBounds: [
      [32.25, 29.36],
      [32.5, 29.8],
    ],
    zoom: 9.5,
    bearing: 10,
    pitch: 42,
    projectCount: 2,
  },
] as const;

/** Canonical alias for active featured governorates */
export const GOVERNORATES = ACTIVE_GOVERNORATES;

export const CONTEXTUAL_GOVERNORATES: readonly ContextualGovernorate[] = [
  { id: 'aswan', active: false, name: { ar: 'أسوان', en: 'Aswan' }, center: { lat: 24.0889, lng: 32.8998 } },
  { id: 'luxor', active: false, name: { ar: 'الأقصر', en: 'Luxor' }, center: { lat: 25.6872, lng: 32.6396 } },
  { id: 'south-sinai', active: false, name: { ar: 'جنوب سيناء', en: 'South Sinai' }, center: { lat: 28.5, lng: 33.975 } },
  { id: 'north-sinai', active: false, name: { ar: 'شمال سيناء', en: 'North Sinai' }, center: { lat: 30.6, lng: 33.62 } },
  { id: 'port-said', active: false, name: { ar: 'بورسعيد', en: 'Port Said' }, center: { lat: 31.2653, lng: 32.3019 } },
  { id: 'ismailia', active: false, name: { ar: 'الإسماعيلية', en: 'Ismailia' }, center: { lat: 30.5965, lng: 32.2715 } },
  { id: 'damietta', active: false, name: { ar: 'دمياط', en: 'Damietta' }, center: { lat: 31.4175, lng: 31.8144 } },
  { id: 'dakahlia', active: false, name: { ar: 'الدقهلية', en: 'Dakahlia' }, center: { lat: 31.0409, lng: 31.3785 } },
  { id: 'sharqia', active: false, name: { ar: 'الشرقية', en: 'Sharqia' }, center: { lat: 30.5877, lng: 31.502 } },
  { id: 'kafr-el-sheikh', active: false, name: { ar: 'كفر الشيخ', en: 'Kafr El Sheikh' }, center: { lat: 31.3085, lng: 30.8039 } },
  { id: 'beheira', active: false, name: { ar: 'البحيرة', en: 'Beheira' }, center: { lat: 30.8481, lng: 30.3436 } },
  { id: 'gharbia', active: false, name: { ar: 'الغربية', en: 'Gharbia' }, center: { lat: 30.8754, lng: 31.0335 } },
  { id: 'monufia', active: false, name: { ar: 'المنوفية', en: 'Monufia' }, center: { lat: 30.5972, lng: 30.9876 } },
  { id: 'qalyubia', active: false, name: { ar: 'القليوبية', en: 'Qalyubia' }, center: { lat: 30.3292, lng: 31.2168 } },
  { id: 'fayoum', active: false, name: { ar: 'الفيوم', en: 'Fayoum' }, center: { lat: 29.3084, lng: 30.8428 } },
  { id: 'beni-suef', active: false, name: { ar: 'بني سويف', en: 'Beni Suef' }, center: { lat: 29.0661, lng: 31.0994 } },
  { id: 'minya', active: false, name: { ar: 'المنيا', en: 'Minya' }, center: { lat: 28.1099, lng: 30.7503 } },
  { id: 'assiut', active: false, name: { ar: 'أسيوط', en: 'Assiut' }, center: { lat: 27.1809, lng: 31.1837 } },
  { id: 'sohag', active: false, name: { ar: 'سوهاج', en: 'Sohag' }, center: { lat: 26.557, lng: 31.6948 } },
  { id: 'qena', active: false, name: { ar: 'قنا', en: 'Qena' }, center: { lat: 26.1551, lng: 32.716 } },
  { id: 'new-valley', active: false, name: { ar: 'الوادي الجديد', en: 'New Valley' }, center: { lat: 25.4473, lng: 28.983 } },
] as const;

export const GOVERNORATE_BY_ID: ReadonlyMap<ActiveGovernorateId, Governorate> = new Map(
  ACTIVE_GOVERNORATES.map((gov) => [gov.id, gov]),
);

export const CONTEXTUAL_GOVERNORATE_BY_ID: ReadonlyMap<string, ContextualGovernorate> = new Map(
  CONTEXTUAL_GOVERNORATES.map((gov) => [gov.id, gov]),
);

export const ACTIVE_GOVERNORATE_ID_SET: ReadonlySet<string> = new Set(
  ACTIVE_GOVERNORATES.map((gov) => gov.id),
);

export function isActiveGovernorateId(id: string): id is ActiveGovernorateId {
  return ACTIVE_GOVERNORATE_ID_SET.has(id);
}

export function getGovernorateById(id: ActiveGovernorateId | null | undefined): Governorate | undefined {
  if (!id) return undefined;
  return GOVERNORATE_BY_ID.get(id);
}

export function getAnyGovernorateMeta(
  id: GovernorateId,
): Governorate | ContextualGovernorate | undefined {
  if (isActiveGovernorateId(id)) {
    return GOVERNORATE_BY_ID.get(id);
  }
  return CONTEXTUAL_GOVERNORATE_BY_ID.get(id);
}
