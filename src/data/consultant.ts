import type { ConsultantProfile } from '../types/portfolio';

export const CONSULTANT_PROFILE: ConsultantProfile = {
  name: {
    ar: 'عبدالله ابراهيم محمد',
    en: 'Abdullah Ibrahim Mohamed',
  },
  monogram: 'AIM',
  title: {
    ar: 'مستشار عقاري أول',
    en: 'Senior Property Consultant',
  },
  tagline: {
    ar: 'رؤية مكانية دقيقة لأبرز المشروعات العقارية في الإسكندرية ومصر — من الماستر بلان حتى قرار الاستثمار.',
    en: 'Spatial intelligence for Egypt’s premier developments — from Alexandria’s shoreline to national growth corridors.',
  },
  bio: {
    ar: 'أساعد المستثمرين والراغبين في السكن الراقي على مقارنة أبرز المشروعات العقارية في الإسكندرية والساحل الشمالي والقاهرة الجديدة والعاصمة الإدارية والشيخ زايد والبحر الأحمر والعين السخنة عبر قراءة معمارية دقيقة للموقع والماستر بلان، مع استشارة مستقلة وشفافة تناسب أهدافك المالية والعائلية.',
    en: 'Senior Property Consultant based in Alexandria, guiding buyers and investors across Egypt’s flagship developments—from New Alexandria and Smouha to North Coast, New Cairo, New Capital, West Cairo, Red Sea, and Ain Sokhna—through architectural master-plan analysis and transparent advisory.',
  },
  /**
   * Real processed transparent RGBA studio cutout seated on the 3D Egypt maquette rim.
   * HeroMaquetteEngine falls back gracefully to architectural SVG artwork if null or on error (EC-15).
   */
  portraitUrl: '/assets/consultant/hero-leaning.png',
  portraitAlt: {
    ar: 'عبدالله ابراهيم محمد — مستشار عقاري أول ساند على ماكت مصر ثلاثي الأبعاد',
    en: 'Abdullah Ibrahim Mohamed — Senior Property Consultant leaning on the 3D Egypt maquette',
  },
  portraitAnchor: {
    x: 0,
    y: 0,
    scale: 1,
  },
  profilePhotoUrl: '/assets/consultant/profile-portrait.webp',
  profilePhotoAlt: {
    ar: 'عبدالله ابراهيم محمد — مستشار عقاري أول',
    en: 'Abdullah Ibrahim Mohamed — Senior Property Consultant',
  },
  portraitFallback: {
    monogram: 'AIM',
    heroAspectRatio: 0.8,
    profileObjectPosition: '50% 20%',
    svgFallbackEnabled: true,
  },
  location: {
    ar: 'الإسكندرية، جمهورية مصر العربية',
    en: 'Alexandria, Egypt',
  },
  contact: {
    whatsappE164: '+201280249440',
    whatsappUrl: 'https://wa.me/201280249440',
    phoneDisplay: '01280249440',
    email: 'aimima.official@gmail.com',
    linkedinUrl: 'https://www.linkedin.com/in/aimima/',
    githubUrl: 'https://github.com/AIMIMA',
  },
  stats: [
    {
      value: '6',
      label: {
        ar: 'محافظات استثمارية',
        en: 'Investment Corridors',
      },
    },
    {
      value: '22+',
      label: {
        ar: 'مشروع عقاري موثّق',
        en: 'Verified Developments',
      },
    },
    {
      value: '100%',
      label: {
        ar: 'استشارة مستقلة مجانية',
        en: 'Independent Advisory',
      },
    },
  ],
  credentials: [
    {
      ar: 'تغطية متخصصة لمشروعات الإسكندرية الجديدة، سموحة، الكورنيش وكينج مريوط',
      en: 'Deep specialist coverage of New Alexandria, Smouha, Corniche & King Mariout',
    },
    {
      ar: 'تحليل مقارن للماستر بلان ونسب التحميل والواجهات البحرية والبحيرات',
      en: 'Architectural master-plan comparison across density, waterfronts & green ratios',
    },
    {
      ar: 'مقارنة شفافة لخطط السداد والعائد الإيجاري وإعادة البيع مع كبرى شركات التطوير',
      en: 'Transparent payment-plan, rental yield & resale comparisons across Tier-1 developers',
    },
    {
      ar: 'مرافقة كاملة من اختيار الوحدة وحتى التعاقد المباشر مع المطور دون عمولات إضافية',
      en: 'End-to-end advisory from unit selection to direct developer contracting',
    },
  ],
  specialties: [
    {
      ar: 'كمبوندات الإسكندرية الجديدة',
      en: 'New Alexandria Compounds',
    },
    {
      ar: 'الساحل الشمالي والعلمين الجديدة',
      en: 'North Coast & New Alamein',
    },
    {
      ar: 'التجمع والعاصمة والشيخ زايد',
      en: 'East & West Cairo',
    },
    {
      ar: 'الجونة والبحر الأحمر والعين السخنة',
      en: 'Red Sea & Ain Sokhna',
    },
  ],
  coveredGovernorateIds: [
    'alexandria',
    'matrouh',
    'cairo',
    'giza',
    'red-sea',
    'suez',
  ],
  partnerDevelopers: [
    { ar: 'السعودية المصرية للتعمير', en: 'Saudi Egyptian Developers (SED)' },
    { ar: 'بالم هيلز للتعمير', en: 'Palm Hills Developments' },
    { ar: 'مجموعة طلعت مصطفى', en: 'Talaat Moustafa Group (TMG)' },
    { ar: 'إعمار مصر', en: 'Emaar Misr Developments' },
    { ar: 'أورا للتطوير العقاري', en: 'Ora Developers' },
    { ar: 'أوراسكوم للتنمية', en: 'Orascom Development' },
    { ar: 'تطوير مصر', en: 'Tatweer Misr Developments' },
    { ar: 'سيتي إيدج للتطوير', en: 'City Edge Developments' },
    { ar: 'مصر إيطاليا العقارية', en: 'Misr Italia Properties' },
    { ar: 'مدار للتطوير العقاري', en: 'Madaar Developments' },
    { ar: 'إلسوير للتطوير وMMG', en: 'Elsewhere Developments & MMG' },
    { ar: 'شركة أبو سوما للتنمية', en: 'Somabay (Abu Soma Dev.)' },
  ],
};
