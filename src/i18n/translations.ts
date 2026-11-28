import type {
  ConsultationErrorKey,
  ConsultationPurpose,
  ContactMethod,
  DeliveryStatus,
  Locale,
  LocalizedText,
  UnitCategory,
  ZoneKind,
} from '../types/portfolio';

export interface TranslationDictionary {
  meta: {
    title: string;
    description: string;
    skipToContent: string;
  };
  nav: {
    brandSubtitle: string;
    langToggleLabel: string;
    langToggleAria: string;
    openProfile: string;
    openShortlist: string;
    shortlistCountAria: string;
    bookConsultation: string;
    breadcrumbs: {
      navAria: string;
      hero: string;
      egypt: string;
      governorateFallback: string;
      projectFallback: string;
    };
  };
  hero: {
    indexLabel: string;
    exploreMapCta: string;
    bookConsultationCta: string;
    aboutConsultantCta: string;
    scrollCue: string;
    scrollCueSub: string;
    webglFallbackNote: string;
    maquetteCaption: string;
  };
  stages: {
    hero: string;
    transition: string;
    egypt: string;
    governoratePrefix: string;
    projectPrefix: string;
    mode2dAnnounce: string;
    mode3dAnnounce: string;
  };
  egyptDock: {
    title: string;
    allEgypt: string;
    flagshipBadge: string;
    projectsSingular: string;
    projectsPlural: string;
    searchPlaceholder: string;
    searchAria: string;
    searchClear: string;
    searchNoResults: string;
    searchSuggestConsult: string;
    searchGroupGovernorates: string;
    searchGroupProjects: string;
    filterCategoryLabel: string;
    filterStatusLabel: string;
    filterDeveloperLabel: string;
    filterAll: string;
    resetFilters: string;
    showingCountLabel: string;
    emptyTitle: string;
    emptyBody: string;
    nonActiveGovToast: string;
    nonActiveGovConsultCta: string;
    mapModeOffline: string;
    mapModeOnline: string;
    mapModeSvg: string;
  };
  governorateDrawer: {
    backToEgypt: string;
    projectsHeading: string;
    viewMasterPlan: string;
    addToShortlist: string;
    removeFromShortlist: string;
    expandSheet: string;
    collapseSheet: string;
    feddansUnit: string;
    greenWaterShort: string;
  };
  masterPlan: {
    mode2d: string;
    mode3d: string;
    modeToggleAria: string;
    resetView: string;
    resetNorth: string;
    northSymbol: string;
    scaleMetersUnit: string;
    scaleKmUnit: string;
    legendTitle: string;
    legendAllZones: string;
    zoneInspectorTitle: string;
    zoneFootprintLabel: string;
    zoneUnitMixLabel: string;
    inquireZoneCta: string;
    closeZoneInspector: string;
    orbitHint3d: string;
    svgFallbackNotice: string;
    zoomIn: string;
    zoomOut: string;
    rotateLeft: string;
    rotateRight: string;
  };
  projectInspector: {
    backToGovernorate: string;
    prevProject: string;
    nextProject: string;
    developerLabel: string;
    districtLabel: string;
    totalAreaLabel: string;
    greenWaterLabel: string;
    deliveryStatusLabel: string;
    unitTypesLabel: string;
    areaRangeLabel: string;
    indicativePriceLabel: string;
    indicativePriceDisclaimer: string;
    paymentHorizonLabel: string;
    deliveryWindowLabel: string;
    highlightsTitle: string;
    bookConsultationCta: string;
    whatsappCta: string;
    callCta: string;
    addToShortlist: string;
    inShortlist: string;
  };
  zoneKinds: Record<ZoneKind, string>;
  deliveryStatuses: Record<DeliveryStatus, string>;
  unitCategories: Record<UnitCategory, string>;
  consultation: {
    modalTitle: string;
    modalSubtitle: string;
    contextHeading: string;
    contextGeneral: string;
    contextGovernorate: string;
    contextProject: string;
    contextZone: string;
    contextShortlist: string;
    nameLabel: string;
    namePlaceholder: string;
    phoneLabel: string;
    phonePlaceholder: string;
    phoneHint: string;
    methodLabel: string;
    methodOptions: Record<ContactMethod, string>;
    purposeLabel: string;
    purposeOptions: Record<ConsultationPurpose, string>;
    budgetLabel: string;
    budgetPlaceholder: string;
    notesLabel: string;
    notesPlaceholder: string;
    submitCta: string;
    closeLabel: string;
    receiptTitle: string;
    receiptSubtitle: string;
    referenceIdLabel: string;
    savedNotice: string;
    sendWhatsAppCta: string;
    newRequestCta: string;
    waGreeting: string;
    waProjectLabel: string;
    waGovLabel: string;
    waZoneLabel: string;
    waShortlistLabel: string;
    waPurposeLabel: string;
    waRefLabel: string;
    errors: Record<ConsultationErrorKey, string>;
  };
  profile: {
    modalTitle: string;
    closeLabel: string;
    aboutHeading: string;
    credentialsHeading: string;
    specialtiesHeading: string;
    coveredGovsHeading: string;
    partnersHeading: string;
    contactHeading: string;
    whatsappCta: string;
    callCta: string;
    emailCta: string;
    linkedinLabel: string;
    bookConsultationCta: string;
    locationLabel: string;
    independentAdvisoryBadge: string;
  };
  shortlist: {
    drawerTitle: string;
    emptyTitle: string;
    emptyBody: string;
    maxReachedToast: string;
    removeAria: string;
    openProjectCta: string;
    consultShortlistCta: string;
    clearAll: string;
    compareDeveloper: string;
    compareArea: string;
    compareGreen: string;
    compareStatus: string;
    comparePrice: string;
  };
  a11y: {
    closeDialog: string;
    mapRegionLabel: string;
    heroRegionLabel: string;
    masterPlanRegionLabel: string;
    governoratePinAria: string;
    projectPinAria: string;
  };
}

export const TRANSLATIONS: Record<Locale, TranslationDictionary> = {
  ar: {
    meta: {
      title: 'عبدالله ابراهيم محمد — مستشار عقاري أول | خريطة المشاريع العقارية التفاعلية 3D في مصر',
      description:
        'استكشف أبرز المشاريع العقارية في الإسكندرية ومصر عبر ماكت 3D تفاعلي وخرائط ماستر بلان تفصيلية بمواقعها الحقيقية — استشارات عقارية مستقلة مع عبدالله ابراهيم محمد، مستشار عقاري أول.',
      skipToContent: 'الانتقال مباشرة إلى المحتوى الرئيسي',
    },
    nav: {
      brandSubtitle: 'مستشار عقاري أول',
      langToggleLabel: 'EN',
      langToggleAria: 'التبديل إلى اللغة الإنجليزية',
      openProfile: 'عن المستشار',
      openShortlist: 'المقارنة',
      shortlistCountAria: 'قائمة المقارنة العقارية',
      bookConsultation: 'احجز استشارة',
      breadcrumbs: {
        navAria: 'مسار التنقل المكاني',
        hero: 'الماكت',
        egypt: 'مصر',
        governorateFallback: 'المحافظة',
        projectFallback: 'المشروع',
      },
    },
    hero: {
      indexLabel: '01 · استشارات عقارية مكانية في مصر',
      exploreMapCta: 'استكشف خريطة مصر',
      bookConsultationCta: 'احجز استشارة عقارية',
      aboutConsultantCta: 'عن المستشار',
      scrollCue: 'مرّر للأسفل للانتقال إلى الخريطة',
      scrollCueSub: 'كل حركة مستجيبة لتفاعلك — بدون تشغيل تلقائي',
      webglFallbackNote: 'وضع العرض الهندسي 2.5D نشط لتوافق المتصفح',
      maquetteCaption: 'ماكت مصر المعماري — الإسكندرية و6 محاور استثمارية',
    },
    stages: {
      hero: 'واجهة الماكت الثلاثي الأبعاد لجمهورية مصر العربية',
      transition: 'جارٍ الانتقال البصري من الماكت إلى خريطة مصر',
      egypt: 'خريطة مصر الشاملة — 6 محافظات و22 مشروعاً موثقاً',
      governoratePrefix: 'التركيز المكاني على محافظة',
      projectPrefix: 'الماستر بلان التفاعلي لمشروع',
      mode2dAnnounce: 'تم التبديل إلى المخطط الهندسي ثنائي الأبعاد 2D',
      mode3dAnnounce: 'تم التبديل إلى المجسم المعماري ثلاثي الأبعاد 3D',
    },
    egyptDock: {
      title: 'المحاور والمحافظات',
      allEgypt: 'كل مصر',
      flagshipBadge: 'المحافظة الرئيسية',
      projectsSingular: 'مشروع',
      projectsPlural: 'مشاريع',
      searchPlaceholder: 'ابحث باسم المشروع، المطور، المنطقة أو المحافظة...',
      searchAria: 'البحث في المشروعات العقارية والمحافظات',
      searchClear: 'مسح البحث',
      searchNoResults: 'لم يتم العثور على مشروعات مطابقة لبحثك.',
      searchSuggestConsult: 'تواصل معنا للبحث عن فرص عقارية مخصصة',
      searchGroupGovernorates: 'المحافظات',
      searchGroupProjects: 'المشروعات العقارية',
      filterCategoryLabel: 'نوع الوحدة',
      filterStatusLabel: 'حالة الاستلام',
      filterDeveloperLabel: 'المطور العقاري',
      filterAll: 'الكل',
      resetFilters: 'إعادة ضبط الفلاتر',
      showingCountLabel: 'المشروعات المعروضة',
      emptyTitle: 'لا توجد مشروعات مطابقة لهذه الفلاتر',
      emptyBody: 'جرّب تعديل معايير البحث أو إعادة ضبط الفلاتر لعرض جميع المشروعات الموثقة.',
      nonActiveGovToast: 'مشروعات مختارة قريباً — تواصل للاستشارة في هذه المحافظة',
      nonActiveGovConsultCta: 'احجز استشارة الآن',
      mapModeOffline: 'خريطة متجهة مدمجة',
      mapModeOnline: 'خريطة شوارع عالية الدقة',
      mapModeSvg: 'خريطة تفاعلية 2.5D',
    },
    governorateDrawer: {
      backToEgypt: 'العودة إلى خريطة مصر',
      projectsHeading: 'المشروعات العقارية في المحافظة',
      viewMasterPlan: 'عرض الماستر بلان',
      addToShortlist: 'أضف للمقارنة',
      removeFromShortlist: 'إزالة من المقارنة',
      expandSheet: 'توسيع القائمة',
      collapseSheet: 'تصغير القائمة',
      feddansUnit: 'فدان',
      greenWaterShort: 'مسطحات خضراء ومائية',
    },
    masterPlan: {
      mode2d: 'مخطط 2D',
      mode3d: 'مجسم 3D',
      modeToggleAria: 'التبديل بين مخطط 2D ومجسم 3D',
      resetView: 'إعادة التوسيط',
      resetNorth: 'إعادة الشمال',
      northSymbol: 'ش',
      scaleMetersUnit: 'م',
      scaleKmUnit: 'كم',
      legendTitle: 'دليل الاستخدامات',
      legendAllZones: 'كل القطاعات',
      zoneInspectorTitle: 'تفاصيل القطاع المعماري',
      zoneFootprintLabel: 'النسبة التخطيطية',
      zoneUnitMixLabel: 'توزيع الوحدات',
      inquireZoneCta: 'استفسر عن هذا القطاع',
      closeZoneInspector: 'إغلاق تفاصيل القطاع',
      orbitHint3d: 'اسحب للتدوير والتحكم بالزاوية المعمارية',
      svgFallbackNotice: 'عرض الماستر بلان التفاعلي عبر المخطط المتجه SVG',
      zoomIn: 'تكبير',
      zoomOut: 'تصغير',
      rotateLeft: 'تدوير لليسار',
      rotateRight: 'تدوير لليمين',
    },
    projectInspector: {
      backToGovernorate: 'العودة لمشروعات المحافظة',
      prevProject: 'المشروع السابق',
      nextProject: 'المشروع التالي',
      developerLabel: 'المطور العقاري',
      districtLabel: 'الموقع والحي',
      totalAreaLabel: 'المساحة الإجمالية',
      greenWaterLabel: 'المسطحات الخضراء والمائية',
      deliveryStatusLabel: 'حالة الاستلام',
      unitTypesLabel: 'فئات الوحدات',
      areaRangeLabel: 'نطاق المساحات',
      indicativePriceLabel: 'النطاق السعري الاسترشادي',
      indicativePriceDisclaimer: 'أسعار استرشادية قابلة للتحديث — تواصل لأحدث خطط السداد والمتاح',
      paymentHorizonLabel: 'أنظمة السداد',
      deliveryWindowLabel: 'موعد الاستلام',
      highlightsTitle: 'أبرز المزايا المعمارية والاستثمارية',
      bookConsultationCta: 'احجز استشارة للمشروع',
      whatsappCta: 'واتساب مباشر',
      callCta: 'اتصال هاتفي',
      addToShortlist: 'أضف للمقارنة',
      inShortlist: 'في قائمة المقارنة',
    },
    zoneKinds: {
      residential_villas: 'فيلات وتاون هاوس',
      residential_apartments: 'وحدات وأبراج سكنية',
      waterfront_lagoon: 'بحيرات وواجهة مائية',
      commercial_promenade: 'ممشى تجاري وإداري',
      clubhouse_hospitality: 'نادي اجتماعي وضيافة',
      green_park_spine: 'حدائق ومحور أخضر',
      main_gate_access: 'بوابات ومداخل رئيسية',
      education_medical: 'خدمات تعليمية وطبية',
    },
    deliveryStatuses: {
      ready_to_move: 'استلام فوري',
      ready_and_phased: 'استلام فوري ومرحلي',
      phased_delivery: 'استلام مرحلي',
      under_construction: 'تحت الإنشاء',
      new_launch: 'طرح جديد',
    },
    unitCategories: {
      apartment: 'شقق',
      duplex: 'دوبلكس',
      villa: 'فيلات مستقلة',
      townhouse: 'تاون هاوس',
      twin_house: 'توين هاوس',
      chalet: 'شاليهات',
      commercial: 'تجاري / إداري',
      hospitality: 'فندقي / ضيافة',
    },
    consultation: {
      modalTitle: 'احجز استشارة عقارية مستقلة',
      modalSubtitle: 'تواصل مباشر لتحليل الماستر بلان ومقارنة أحدث الأسعار وخطط السداد.',
      contextHeading: 'سياق الاستشارة المحدد تلقائياً',
      contextGeneral: 'استشارة عقارية عامة في مصر',
      contextGovernorate: 'المحافظة',
      contextProject: 'المشروع',
      contextZone: 'القطاع المعماري',
      contextShortlist: 'قائمة المقارنة',
      nameLabel: 'الاسم الكامل',
      namePlaceholder: 'مثال: أحمد محمود',
      phoneLabel: 'رقم الهاتف أو واتساب',
      phonePlaceholder: 'مثال: 01280249440 أو +201280249440',
      phoneHint: 'يقبل أرقام الموبايل المصرية (010/011/012/015) أو الأرقام الدولية بـ +',
      methodLabel: 'وسيلة التواصل المفضلة',
      methodOptions: {
        whatsapp: 'واتساب',
        phone: 'مكالمة هاتفية',
        email: 'البريد الإلكتروني',
      },
      purposeLabel: 'هدف الشراء أو الاستشارة',
      purposeOptions: {
        investment: 'استثمار وعائد إيجاري / إعادة بيع',
        residence: 'سكن عائلي أساسي',
        vacation_home: 'وحدة ساحلية / مصيفية',
        commercial: 'استثمار تجاري أو إداري',
        comparison: 'مقارنة بين عدة مشروعات',
      },
      budgetLabel: 'الميزانية التقديرية (اختياري)',
      budgetPlaceholder: 'مثال: 8 – 12 مليون ج.م',
      notesLabel: 'ملاحظات إضافية (اختياري)',
      notesPlaceholder: 'اذكر عدد الغرف المطلوب أو خطة السداد المفضلة...',
      submitCta: 'تأكيد طلب الاستشارة',
      closeLabel: 'إغلاق نافذة الاستشارة',
      receiptTitle: 'تم تسجيل طلب الاستشارة بنجاح',
      receiptSubtitle: 'سيتواصل معك عبدالله ابراهيم محمد وفق وسيلة التواصل المختارة.',
      referenceIdLabel: 'الرقم المرجعي للطلب',
      savedNotice: 'تم حفظ نسخة من الطلب محلياً على جهازك لسهولة المتابعة.',
      sendWhatsAppCta: 'إرسال الملخص عبر واتساب الآن',
      newRequestCta: 'تسجيل طلب استشارة جديد',
      waGreeting: 'مرحباً أ/ عبدالله، أرغب في حجز استشارة عقارية بخصوص:',
      waProjectLabel: 'المشروع',
      waGovLabel: 'المحافظة',
      waZoneLabel: 'القطاع المعماري',
      waShortlistLabel: 'مشروعات المقارنة',
      waPurposeLabel: 'الهدف',
      waRefLabel: 'الرقم المرجعي',
      errors: {
        nameRequired: 'يرجى إدخال الاسم الكامل.',
        nameTooShort: 'يرجى إدخال اسم لا يقل عن حرفين.',
        phoneRequired: 'يرجى إدخال رقم الهاتف للتواصل.',
        phoneInvalidEgyptianPrefix:
          'بادئة رقم الموبايل المصري غير صحيحة (يجب أن يبدأ بـ 010 أو 011 أو 012 أو 015).',
        phoneInvalidFormat:
          'يرجى إدخال رقم موبايل مصري صحيح (11 رقماً) أو رقم دولي بصيغة +.',
        methodRequired: 'يرجى اختيار وسيلة التواصل المفضلة.',
        purposeRequired: 'يرجى اختيار هدف الاستشارة.',
      },
    },
    profile: {
      modalTitle: 'ملف المستشار العقاري',
      closeLabel: 'إغلاق النافذة التعريفية',
      aboutHeading: 'نبذة ومنهجية العمل',
      credentialsHeading: 'نقاط القوة الاستشارية',
      specialtiesHeading: 'التخصصات العقارية',
      coveredGovsHeading: 'المحافظات المغطاة',
      partnersHeading: 'أبرز المطورين في الدليل',
      contactHeading: 'قنوات التواصل المباشر',
      whatsappCta: 'تواصل عبر واتساب',
      callCta: 'اتصال مباشر',
      emailCta: 'البريد الإلكتروني',
      linkedinLabel: 'حساب LinkedIn',
      bookConsultationCta: 'احجز جلسة استشارة مجانية',
      locationLabel: 'المقر',
      independentAdvisoryBadge: 'استشارة مستقلة وشفافة',
    },
    shortlist: {
      drawerTitle: 'قائمة المقارنة العقارية',
      emptyTitle: 'قائمة المقارنة فارغة حالياً',
      emptyBody: 'أضف حتى 3 مشروعات من أي محافظة لمقارنتها جنباً إلى جنب وطلب استشارة شاملة.',
      maxReachedToast: 'الحد الأقصى 3 مشاريع في قائمة المقارنة — احذف مشروعاً لإضافة آخر',
      removeAria: 'إزالة من قائمة المقارنة',
      openProjectCta: 'عرض الماستر بلان',
      consultShortlistCta: 'استشارة مقارنة لهذه المشروعات',
      clearAll: 'مسح القائمة',
      compareDeveloper: 'المطور',
      compareArea: 'المساحة',
      compareGreen: 'المسطحات',
      compareStatus: 'الاستلام',
      comparePrice: 'السعر الاسترشادي',
    },
    a11y: {
      closeDialog: 'إغلاق',
      mapRegionLabel: 'خريطة مصر العقارية التفاعلية',
      heroRegionLabel: 'مشهد الماكت ثلاثي الأبعاد لخريطة مصر',
      masterPlanRegionLabel: 'مخطط الماستر بلان التفاعلي للمشروع',
      governoratePinAria: 'فتح محافظة',
      projectPinAria: 'فتح ماستر بلان مشروع',
    },
  },
  en: {
    meta: {
      title: 'Abdullah Ibrahim Mohamed — Senior Property Consultant | Interactive 3D Egypt Real Estate Portfolio',
      description:
        'Explore flagship real estate developments across Alexandria and Egypt via an interactive 3D maquette and georeferenced 2D/3D master plans — independent advisory by Abdullah Ibrahim Mohamed, Senior Property Consultant.',
      skipToContent: 'Skip to main content',
    },
    nav: {
      brandSubtitle: 'Senior Property Consultant',
      langToggleLabel: 'عربي',
      langToggleAria: 'Switch language to Arabic',
      openProfile: 'About Consultant',
      openShortlist: 'Shortlist',
      shortlistCountAria: 'Project comparison shortlist',
      bookConsultation: 'Book Consultation',
      breadcrumbs: {
        navAria: 'Spatial navigation breadcrumb',
        hero: 'Maquette',
        egypt: 'Egypt',
        governorateFallback: 'Governorate',
        projectFallback: 'Development',
      },
    },
    hero: {
      indexLabel: '01 · Spatial Real Estate Advisory — Egypt',
      exploreMapCta: 'Explore Egypt Map',
      bookConsultationCta: 'Book Consultation',
      aboutConsultantCta: 'About Consultant',
      scrollCue: 'Scroll to dive into Egypt',
      scrollCueSub: 'Every camera movement is driven strictly by your actions',
      webglFallbackNote: '2.5D architectural fallback view active for this device',
      maquetteCaption: 'Architectural Egypt Maquette — Alexandria & 6 Corridors',
    },
    stages: {
      hero: '3D Architectural Egypt Maquette hero view',
      transition: 'Transitioning from the architectural maquette into the national Egypt map',
      egypt: 'Egypt national overview — 6 active governorates and 22 verified developments',
      governoratePrefix: 'Spatial focus on governorate',
      projectPrefix: 'Interactive master plan for',
      mode2dAnnounce: 'Switched to 2D architectural blueprint view',
      mode3dAnnounce: 'Switched to 3D architectural massing view',
    },
    egyptDock: {
      title: 'Investment Corridors',
      allEgypt: 'All Egypt',
      flagshipBadge: 'Flagship',
      projectsSingular: 'Project',
      projectsPlural: 'Projects',
      searchPlaceholder: 'Search project, developer, district, or governorate...',
      searchAria: 'Search developments and governorates',
      searchClear: 'Clear search',
      searchNoResults: 'No developments matched your query.',
      searchSuggestConsult: 'Contact for tailored off-market advisory',
      searchGroupGovernorates: 'Governorates',
      searchGroupProjects: 'Developments',
      filterCategoryLabel: 'Unit Category',
      filterStatusLabel: 'Delivery Status',
      filterDeveloperLabel: 'Developer',
      filterAll: 'All',
      resetFilters: 'Reset Filters',
      showingCountLabel: 'Showing',
      emptyTitle: 'No developments match these filters',
      emptyBody: 'Adjust your filter selections or reset filters to view all 22 verified developments.',
      nonActiveGovToast: 'Curated projects coming soon — Contact for advisory in this governorate',
      nonActiveGovConsultCta: 'Inquire Now',
      mapModeOffline: 'Bundled Vector Map',
      mapModeOnline: 'Enhanced Street Map',
      mapModeSvg: '2.5D Interactive Map',
    },
    governorateDrawer: {
      backToEgypt: 'Back to Egypt Overview',
      projectsHeading: 'Developments in Corridor',
      viewMasterPlan: 'View Master Plan',
      addToShortlist: 'Add to Shortlist',
      removeFromShortlist: 'Remove from Shortlist',
      expandSheet: 'Expand list',
      collapseSheet: 'Collapse list',
      feddansUnit: 'Feddans',
      greenWaterShort: 'Green & Water',
    },
    masterPlan: {
      mode2d: '2D Plan',
      mode3d: '3D Massing',
      modeToggleAria: 'Toggle between 2D Plan and 3D Massing',
      resetView: 'Reset View',
      resetNorth: 'Reset North',
      northSymbol: 'N',
      scaleMetersUnit: 'm',
      scaleKmUnit: 'km',
      legendTitle: 'Land-Use Legend',
      legendAllZones: 'All Zones',
      zoneInspectorTitle: 'Architectural Zone Details',
      zoneFootprintLabel: 'Site Share',
      zoneUnitMixLabel: 'Unit Mix',
      inquireZoneCta: 'Inquire About This Zone',
      closeZoneInspector: 'Close zone inspector',
      orbitHint3d: 'Drag to orbit and inspect architectural massing',
      svgFallbackNotice: 'Interactive SVG master plan fallback view active',
      zoomIn: 'Zoom in',
      zoomOut: 'Zoom out',
      rotateLeft: 'Rotate left',
      rotateRight: 'Rotate right',
    },
    projectInspector: {
      backToGovernorate: 'Back to Governorate Projects',
      prevProject: 'Previous Project',
      nextProject: 'Next Project',
      developerLabel: 'Developer',
      districtLabel: 'District',
      totalAreaLabel: 'Total Area',
      greenWaterLabel: 'Green & Water Ratio',
      deliveryStatusLabel: 'Delivery Status',
      unitTypesLabel: 'Unit Categories',
      areaRangeLabel: 'Area Range',
      indicativePriceLabel: 'Indicative Starting Price',
      indicativePriceDisclaimer:
        'Indicative starting guidance — contact for live availability & payment plans',
      paymentHorizonLabel: 'Payment Horizon',
      deliveryWindowLabel: 'Delivery Window',
      highlightsTitle: 'Key Architectural & Investment Highlights',
      bookConsultationCta: 'Book Project Consultation',
      whatsappCta: 'Direct WhatsApp',
      callCta: 'Call Consultant',
      addToShortlist: 'Add to Shortlist',
      inShortlist: 'In Shortlist',
    },
    zoneKinds: {
      residential_villas: 'Villas & Townhouses',
      residential_apartments: 'Residences & Towers',
      waterfront_lagoon: 'Waterfront & Lagoons',
      commercial_promenade: 'Commercial Promenade',
      clubhouse_hospitality: 'Clubhouse & Hospitality',
      green_park_spine: 'Central Park & Green Spine',
      main_gate_access: 'Main Gates & Access',
      education_medical: 'Education & Medical',
    },
    deliveryStatuses: {
      ready_to_move: 'Ready to Move',
      ready_and_phased: 'Ready & Phased',
      phased_delivery: 'Phased Delivery',
      under_construction: 'Under Construction',
      new_launch: 'New Launch',
    },
    unitCategories: {
      apartment: 'Apartments',
      duplex: 'Duplexes',
      villa: 'Villas',
      townhouse: 'Townhouses',
      twin_house: 'Twin Houses',
      chalet: 'Chalets',
      commercial: 'Commercial',
      hospitality: 'Hospitality',
    },
    consultation: {
      modalTitle: 'Book an Independent Consultation',
      modalSubtitle: 'Direct advisory for master-plan review, live pricing, and payment comparison.',
      contextHeading: 'Pre-filled Advisory Context',
      contextGeneral: 'General Egypt Real Estate Advisory',
      contextGovernorate: 'Governorate',
      contextProject: 'Development',
      contextZone: 'Architectural Zone',
      contextShortlist: 'Comparison Shortlist',
      nameLabel: 'Full Name',
      namePlaceholder: 'e.g. Ahmed Mahmoud',
      phoneLabel: 'Phone or WhatsApp Number',
      phonePlaceholder: 'e.g. 01280249440 or +201280249440',
      phoneHint: 'Accepts Egyptian mobile numbers (010/011/012/015) or international + numbers',
      methodLabel: 'Preferred Contact Method',
      methodOptions: {
        whatsapp: 'WhatsApp',
        phone: 'Phone Call',
        email: 'Email',
      },
      purposeLabel: 'Consultation Purpose',
      purposeOptions: {
        investment: 'Investment & Rental / Resale Yield',
        residence: 'Primary Family Residence',
        vacation_home: 'Coastal / Vacation Home',
        commercial: 'Commercial or Administrative',
        comparison: 'Multi-Project Comparison',
      },
      budgetLabel: 'Estimated Budget (Optional)',
      budgetPlaceholder: 'e.g. 8–12M EGP',
      notesLabel: 'Additional Notes (Optional)',
      notesPlaceholder: 'Preferred bedrooms, delivery window, or payment horizon...',
      submitCta: 'Confirm Consultation Request',
      closeLabel: 'Close consultation modal',
      receiptTitle: 'Consultation Request Confirmed',
      receiptSubtitle: 'Abdullah Ibrahim Mohamed will reach out via your preferred channel.',
      referenceIdLabel: 'Reference ID',
      savedNotice: 'A confirmation copy has been stored locally for your records.',
      sendWhatsAppCta: 'Send Brief via WhatsApp Now',
      newRequestCta: 'Submit Another Inquiry',
      waGreeting: 'Hello Abdullah, I would like to book a real-estate consultation regarding:',
      waProjectLabel: 'Development',
      waGovLabel: 'Governorate',
      waZoneLabel: 'Architectural Zone',
      waShortlistLabel: 'Shortlisted Projects',
      waPurposeLabel: 'Purpose',
      waRefLabel: 'Reference ID',
      errors: {
        nameRequired: 'Please enter your full name.',
        nameTooShort: 'Name must be at least 2 characters.',
        phoneRequired: 'Please enter a phone or WhatsApp number.',
        phoneInvalidEgyptianPrefix:
          'Invalid Egyptian mobile prefix (must start with 010, 011, 012, or 015).',
        phoneInvalidFormat:
          'Please enter a valid 11-digit Egyptian mobile or international + number.',
        methodRequired: 'Please select a preferred contact method.',
        purposeRequired: 'Please select your consultation purpose.',
      },
    },
    profile: {
      modalTitle: 'Consultant Profile',
      closeLabel: 'Close profile dialog',
      aboutHeading: 'Background & Advisory Method',
      credentialsHeading: 'Advisory Credentials',
      specialtiesHeading: 'Core Specialties',
      coveredGovsHeading: 'Covered Corridors',
      partnersHeading: 'Featured Catalog Developers',
      contactHeading: 'Direct Channels',
      whatsappCta: 'Message on WhatsApp',
      callCta: 'Direct Call',
      emailCta: 'Send Email',
      linkedinLabel: 'LinkedIn Profile',
      bookConsultationCta: 'Book Free Advisory Session',
      locationLabel: 'Base',
      independentAdvisoryBadge: 'Independent Advisory',
    },
    shortlist: {
      drawerTitle: 'Project Shortlist',
      emptyTitle: 'Your comparison shortlist is empty',
      emptyBody:
        'Save up to 3 developments from any governorate to compare metrics side-by-side and book a combined consultation.',
      maxReachedToast: 'Maximum 3 projects in shortlist — remove one to add another',
      removeAria: 'Remove from shortlist',
      openProjectCta: 'Open Master Plan',
      consultShortlistCta: 'Consult on Shortlisted Projects',
      clearAll: 'Clear Shortlist',
      compareDeveloper: 'Developer',
      compareArea: 'Area',
      compareGreen: 'Green & Water',
      compareStatus: 'Status',
      comparePrice: 'Indicative Price',
    },
    a11y: {
      closeDialog: 'Close',
      mapRegionLabel: 'Interactive Egypt real estate map',
      heroRegionLabel: '3D Egypt architectural maquette hero scene',
      masterPlanRegionLabel: 'Interactive development master plan',
      governoratePinAria: 'Focus governorate',
      projectPinAria: 'Open master plan for',
    },
  },
};

export function getTranslations(locale: Locale): TranslationDictionary {
  return TRANSLATIONS[locale];
}

export function localize(text: LocalizedText, locale: Locale): string {
  return text[locale];
}

export function formatMetricNumber(value: number, _locale: Locale): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
  }).format(value);
}
