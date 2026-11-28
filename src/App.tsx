import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { ConsultantProfileModal } from './components/ConsultantProfileModal';
import { ConsultationModal } from './components/ConsultationModal';
import { GovernorateRail } from './components/GovernorateRail';
import { HeroOverlay } from './components/HeroOverlay';
import { HeroStage } from './components/HeroStage';
import { MapStage } from './components/MapStage';
import { MasterPlanControls } from './components/MasterPlanControls';
import { MasterPlanLegend } from './components/MasterPlanLegend';
import { ProjectInspector } from './components/ProjectInspector';
import { ProjectListDrawer } from './components/ProjectListDrawer';
import { ShortlistDrawer } from './components/ShortlistDrawer';
import { TopNavBar } from './components/TopNavBar';
import {
  ACTIVE_GOVERNORATE_ID_SET,
  ACTIVE_GOVERNORATES,
  CONTEXTUAL_GOVERNORATE_BY_ID,
  GOVERNORATE_BY_ID,
  PROJECTS,
  PROJECT_BY_ID,
  PROJECT_TO_GOV_MAP,
  getProjectsByGovernorate,
} from './data';
import {
  computeEgyptBlend,
  useChoreography,
  useReducedMotion,
} from './engine/choreography';
import { getTranslations, localize } from './i18n/translations';
import type { ViewportCameraMetrics } from './map/spatialMapEngine';
import type {
  ActiveGovernorateId,
  ConsultationContext,
  ContextualGovernorateId,
  FilterState,
  Locale,
  MapTileMode,
  MasterPlanMode,
  OverlayId,
  StageId,
  WebGLStatus,
  ZoneKind,
} from './types/portfolio';
import { EGYPT_CENTER } from './utils/mercator';
import { filterProjects } from './utils/search';
import { parseUrlState, serializeUrlState } from './utils/urlSync';

const LOCALE_STORAGE_KEY = 'aimima_portfolio_locale';
const SHORTLIST_STORAGE_KEY = 'aimima_portfolio_shortlist';

interface InitialHydratedState {
  locale: Locale;
  stage: StageId;
  governorateId: ActiveGovernorateId | null;
  projectId: string | null;
  masterPlanMode: MasterPlanMode;
  diveProgress: 0 | 1;
  wasSanitized: boolean;
}

function resolveInitialState(): InitialHydratedState {
  if (typeof window === 'undefined') {
    return {
      locale: 'ar',
      stage: 'hero',
      governorateId: null,
      projectId: null,
      masterPlanMode: '2d',
      diveProgress: 0,
      wasSanitized: false,
    };
  }

  const parsed = parseUrlState(
    window.location.search,
    ACTIVE_GOVERNORATE_ID_SET,
    PROJECT_TO_GOV_MAP,
  );

  const hasLangParamInSearch = new URLSearchParams(window.location.search).has('lang');
  let locale: Locale = parsed.locale;
  if (!parsed.langSpecified && !hasLangParamInSearch) {
    try {
      const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
      if (stored === 'ar' || stored === 'en') {
        locale = stored;
      }
    } catch {
      // Ignore storage access errors
    }
  }

  return {
    locale,
    stage: parsed.stage,
    governorateId: parsed.governorateId,
    projectId: parsed.projectId,
    masterPlanMode: parsed.masterPlanMode,
    diveProgress: parsed.diveProgress,
    wasSanitized: parsed.wasSanitized,
  };
}

function readStoredShortlist(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(SHORTLIST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const valid: string[] = [];
    for (const item of parsed) {
      if (
        typeof item === 'string' &&
        PROJECT_BY_ID.has(item) &&
        !valid.includes(item) &&
        valid.length < 3
      ) {
        valid.push(item);
      }
    }
    return valid;
  } catch {
    return [];
  }
}

export function App() {
  const initial = useMemo(resolveInitialState, []);
  const reducedMotion = useReducedMotion();

  const [locale, setLocale] = useState<Locale>(initial.locale);
  const [stage, setStage] = useState<StageId>(initial.stage);
  const [governorateId, setGovernorateId] = useState<ActiveGovernorateId | null>(
    initial.governorateId,
  );
  const [projectId, setProjectId] = useState<string | null>(initial.projectId);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [activeZoneFilter, setActiveZoneFilter] = useState<ZoneKind | null>(null);
  const [masterPlanMode, setMasterPlanMode] = useState<MasterPlanMode>(
    initial.masterPlanMode,
  );
  const [overlay, setOverlay] = useState<OverlayId>('none');
  const [consultContextOverride, setConsultContextOverride] =
    useState<ConsultationContext | null>(null);

  const [filters, setFilters] = useState<FilterState>({
    query: '',
    governorateId: null,
    unitCategory: null,
    status: null,
    developer: null,
  });

  const [highlightedProjectId, setHighlightedProjectId] = useState<string | null>(null);
  const [shortlistIds, setShortlistIds] = useState<string[]>(readStoredShortlist);
  const [shortlistCapNotice, setShortlistCapNotice] = useState<boolean>(false);
  const [nonActiveGovId, setNonActiveGovId] = useState<ContextualGovernorateId | null>(
    null,
  );

  const [webglHero, setWebglHero] = useState<WebGLStatus | null>(null);
  const [webglMap, setWebglMap] = useState<WebGLStatus | null>(null);
  const [mapTiles, setMapTiles] = useState<MapTileMode>('offline-vector');
  const [mapCameraMoving, setMapCameraMoving] = useState<boolean>(false);
  const [viewportMetrics, setViewportMetrics] = useState<ViewportCameraMetrics>({
    lat: EGYPT_CENTER.lat,
    lng: EGYPT_CENTER.lng,
    zoom: 5.35,
    bearing: 0,
    pitch: 0,
  });

  const [resetViewNonce, setResetViewNonce] = useState<number>(0);
  const [resetNorthNonce, setResetNorthNonce] = useState<number>(0);

  const isPopStateUpdateRef = useRef<boolean>(false);
  const didInitialUrlSyncRef = useRef<boolean>(false);

  const t = getTranslations(locale);

  const onReachEgypt = useCallback(() => {
    setStage((prev) => (prev === 'governorate' || prev === 'project' ? prev : 'egypt'));
  }, []);

  const onReachHero = useCallback(() => {
    setGovernorateId(null);
    setProjectId(null);
    setSelectedZoneId(null);
    setActiveZoneFilter(null);
    setHighlightedProjectId(null);
    setStage('hero');
  }, []);

  const onEnterTransition = useCallback(() => {
    setStage((prev) =>
      prev === 'governorate' || prev === 'project' ? prev : 'transition',
    );
  }, []);

  const {
    diveProgress,
    isDiveMoving,
    setDiveProgressImmediate,
    animateDiveTo,
    cancelDiveAnimation,
  } = useChoreography({
    initialProgress: initial.diveProgress,
    stage,
    overlay,
    reducedMotion,
    onReachEgypt,
    onReachHero,
    onEnterTransition,
  });

  // Sync <html lang dir>, document title, and localStorage locale preference
  useEffect(() => {
    const dir = locale === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
    document.title = t.meta.title;

    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // Ignore private browsing restrictions
    }
  }, [locale, t.meta.title]);

  // Persist shortlist in localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem(SHORTLIST_STORAGE_KEY, JSON.stringify(shortlistIds));
    } catch {
      // Ignore private browsing restrictions
    }
  }, [shortlistIds]);

  // Bidirectional URL query & History API synchronization
  useEffect(() => {
    if (stage === 'transition') return;

    const cleanSearch = serializeUrlState({
      locale,
      stage,
      governorateId,
      projectId,
      masterPlanMode,
    });
    const targetUrl = `${window.location.pathname}${cleanSearch}`;
    const currentUrl = `${window.location.pathname}${window.location.search}`;

    if (!didInitialUrlSyncRef.current) {
      didInitialUrlSyncRef.current = true;
      if (initial.wasSanitized && currentUrl !== targetUrl) {
        window.history.replaceState(null, '', targetUrl);
      }
      return;
    }

    if (isPopStateUpdateRef.current) {
      isPopStateUpdateRef.current = false;
      return;
    }

    if (currentUrl !== targetUrl) {
      window.history.pushState(null, '', targetUrl);
    }
  }, [locale, stage, governorateId, projectId, masterPlanMode, initial.wasSanitized]);

  useEffect(() => {
    const onPopState = (): void => {
      const parsed = parseUrlState(
        window.location.search,
        ACTIVE_GOVERNORATE_ID_SET,
        PROJECT_TO_GOV_MAP,
      );
      isPopStateUpdateRef.current = true;
      if (parsed.langSpecified) {
        setLocale(parsed.locale);
      }
      setStage(parsed.stage);
      setGovernorateId(parsed.governorateId);
      setProjectId(parsed.projectId);
      setMasterPlanMode(parsed.masterPlanMode);
      setSelectedZoneId(null);
      setActiveZoneFilter(null);
      setHighlightedProjectId(null);
      setDiveProgressImmediate(parsed.diveProgress);
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [setDiveProgressImmediate]);

  // Navigation Handlers
  const handleExploreMap = useCallback(() => {
    setNonActiveGovId(null);
    animateDiveTo(1);
  }, [animateDiveTo]);

  const handleReturnToHero = useCallback(() => {
    cancelDiveAnimation();
    setNonActiveGovId(null);
    setSelectedZoneId(null);
    setActiveZoneFilter(null);
    setProjectId(null);
    setGovernorateId(null);
    setHighlightedProjectId(null);
    setMapCameraMoving(false);
    animateDiveTo(0);
  }, [animateDiveTo, cancelDiveAnimation]);

  const handleReturnToEgypt = useCallback(() => {
    cancelDiveAnimation();
    setDiveProgressImmediate(1);
    setNonActiveGovId(null);
    setSelectedZoneId(null);
    setActiveZoneFilter(null);
    setProjectId(null);
    setGovernorateId(null);
    setHighlightedProjectId(null);
    setStage('egypt');
  }, [cancelDiveAnimation, setDiveProgressImmediate]);

  const handleSelectGovernorate = useCallback(
    (govId: ActiveGovernorateId) => {
      cancelDiveAnimation();
      setDiveProgressImmediate(1);
      setNonActiveGovId(null);
      setSelectedZoneId(null);
      setActiveZoneFilter(null);
      setProjectId(null);
      setHighlightedProjectId(null);
      setGovernorateId(govId);
      setStage('governorate');
    },
    [cancelDiveAnimation, setDiveProgressImmediate],
  );

  const handleSelectProject = useCallback(
    (nextProjectId: string) => {
      const proj = PROJECT_BY_ID.get(nextProjectId);
      if (!proj) return;
      cancelDiveAnimation();
      setDiveProgressImmediate(1);
      setNonActiveGovId(null);
      setSelectedZoneId(null);
      setActiveZoneFilter(null);
      setHighlightedProjectId(null);
      setGovernorateId(proj.governorateId);
      setProjectId(proj.id);
      setStage('project');
    },
    [cancelDiveAnimation, setDiveProgressImmediate],
  );

  const handleBackFromProject = useCallback(() => {
    setSelectedZoneId(null);
    setActiveZoneFilter(null);
    setProjectId(null);
    setHighlightedProjectId(null);
    if (governorateId) {
      setStage('governorate');
    } else {
      setStage('egypt');
    }
  }, [governorateId]);

  // 6-Level Escape Key Unwind Hierarchy (EC-07)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;

      if (overlay !== 'none') {
        event.preventDefault();
        setOverlay('none');
        setConsultContextOverride(null);
        return;
      }

      if (nonActiveGovId !== null) {
        event.preventDefault();
        setNonActiveGovId(null);
        return;
      }

      if (shortlistCapNotice) {
        event.preventDefault();
        setShortlistCapNotice(false);
        return;
      }

      if (stage === 'project' && selectedZoneId !== null) {
        event.preventDefault();
        setSelectedZoneId(null);
        return;
      }

      if (stage === 'project') {
        event.preventDefault();
        handleBackFromProject();
        return;
      }

      if (stage === 'governorate') {
        event.preventDefault();
        handleReturnToEgypt();
        return;
      }

      if (stage === 'egypt' || stage === 'transition') {
        event.preventDefault();
        handleReturnToHero();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    overlay,
    nonActiveGovId,
    shortlistCapNotice,
    stage,
    selectedZoneId,
    handleBackFromProject,
    handleReturnToEgypt,
    handleReturnToHero,
  ]);

  // Auto-dismiss shortlist cap notice after 5s
  useEffect(() => {
    if (!shortlistCapNotice) return undefined;
    const timer = window.setTimeout(() => setShortlistCapNotice(false), 5000);
    return () => window.clearTimeout(timer);
  }, [shortlistCapNotice]);

  // Derived active entities & filtered cohorts
  const activeGovernorate = governorateId
    ? GOVERNORATE_BY_ID.get(governorateId) ?? null
    : null;
  const activeProject = projectId ? PROJECT_BY_ID.get(projectId) ?? null : null;
  const selectedZone = useMemo(() => {
    if (!activeProject || !selectedZoneId) return null;
    return activeProject.masterPlan.zones.find((z) => z.id === selectedZoneId) ?? null;
  }, [activeProject, selectedZoneId]);

  const filteredNationalProjects = useMemo(
    () =>
      filterProjects(
        PROJECTS,
        { ...filters, governorateId: null },
        ACTIVE_GOVERNORATES,
      ),
    [filters],
  );

  const filteredGovernorateProjects = useMemo(() => {
    if (!governorateId) return [];
    return filterProjects(
      PROJECTS,
      { ...filters, governorateId },
      ACTIVE_GOVERNORATES,
    );
  }, [filters, governorateId]);

  const visibleProjectIds = useMemo(() => {
    const source =
      stage === 'governorate' && governorateId
        ? filteredGovernorateProjects
        : filteredNationalProjects;
    return new Set(source.map((p) => p.id));
  }, [stage, governorateId, filteredGovernorateProjects, filteredNationalProjects]);

  const shortlistSet = useMemo(() => new Set(shortlistIds), [shortlistIds]);

  const handleToggleShortlist = useCallback((targetProjectId: string) => {
    setShortlistIds((prev) => {
      if (prev.includes(targetProjectId)) {
        setShortlistCapNotice(false);
        return prev.filter((id) => id !== targetProjectId);
      }
      if (prev.length >= 3) {
        setShortlistCapNotice(true);
        return prev;
      }
      setShortlistCapNotice(false);
      return [...prev, targetProjectId];
    });
  }, []);

  const handleSiblingProject = useCallback(
    (delta: -1 | 1) => {
      if (!activeProject) return;
      const siblings = getProjectsByGovernorate(activeProject.governorateId);
      if (siblings.length <= 1) return;
      const idx = siblings.findIndex((p) => p.id === activeProject.id);
      const nextIdx = (idx + delta + siblings.length) % siblings.length;
      const nextProj = siblings[nextIdx];
      if (!nextProj) return;
      setSelectedZoneId(null);
      setActiveZoneFilter(null);
      setProjectId(nextProj.id);
    },
    [activeProject],
  );

  const openConsultationModal = useCallback(
    (override?: Partial<ConsultationContext>) => {
      setConsultContextOverride({
        governorateId:
          override?.governorateId !== undefined ? override.governorateId : governorateId,
        projectId: override?.projectId !== undefined ? override.projectId : projectId,
        zoneId: override?.zoneId !== undefined ? override.zoneId : selectedZoneId,
        shortlistProjectIds: override?.shortlistProjectIds ?? shortlistIds,
      });
      setOverlay('consultation');
    },
    [governorateId, projectId, selectedZoneId, shortlistIds],
  );

  const activeConsultContext: ConsultationContext = consultContextOverride ?? {
    governorateId,
    projectId,
    zoneId: selectedZoneId,
    shortlistProjectIds: shortlistIds,
  };

  // Blend & DOM Contract Calculations
  const effectiveProgress =
    stage === 'egypt' || stage === 'governorate' || stage === 'project'
      ? 1
      : stage === 'hero'
        ? 0
        : diveProgress;

  const blend = computeEgyptBlend(effectiveProgress);
  const isCameraMoving = isDiveMoving || (effectiveProgress >= 1 && mapCameraMoving);

  // Localized ARIA Live Stage Announcement
  const liveAnnouncement = useMemo(() => {
    if (stage === 'hero') return t.stages.hero;
    if (stage === 'transition') return t.stages.transition;
    if (stage === 'egypt') return t.stages.egypt;
    if (stage === 'governorate' && activeGovernorate) {
      return `${t.stages.governoratePrefix} ${localize(activeGovernorate.name, locale)}`;
    }
    if (stage === 'project' && activeProject) {
      const modeLabel =
        masterPlanMode === '3d' ? t.stages.mode3dAnnounce : t.stages.mode2dAnnounce;
      return `${t.stages.projectPrefix} ${localize(activeProject.name, locale)} — ${modeLabel}`;
    }
    return t.stages.egypt;
  }, [stage, activeGovernorate, activeProject, masterPlanMode, locale, t.stages]);

  const nonActiveGovMeta = nonActiveGovId
    ? CONTEXTUAL_GOVERNORATE_BY_ID.get(nonActiveGovId) ?? null
    : null;

  return (
    <main
      id="app-shell"
      tabIndex={-1}
      className="app-shell"
      data-stage={stage}
      data-scroll-progress={effectiveProgress.toFixed(2)}
      data-governorate={governorateId ?? 'none'}
      data-project={projectId ?? 'none'}
      data-parcel={selectedZoneId ?? 'none'}
      data-masterplan-mode={masterPlanMode}
      data-camera-moving={isCameraMoving ? 'true' : 'false'}
      data-lang={locale}
      data-map-tiles={mapTiles}
      data-webgl-hero={webglHero && webglMap ? webglHero : undefined}
      data-webgl-map={webglMap ?? undefined}
    >
      <a className="skip-link" href="#stage-viewport">
        {t.meta.skipToContent}
      </a>

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </div>

      <div id="stage-viewport" className="stage-viewport">
        <HeroStage
          locale={locale}
          diveProgress={effectiveProgress}
          heroOpacity={blend.heroOpacity}
          interactive={blend.heroInteractive}
          onWebGLStatusChange={setWebglHero}
        />

        <MapStage
          locale={locale}
          stage={stage}
          mapOpacity={effectiveProgress >= 1 ? 1 : blend.mapOpacity}
          interactive={effectiveProgress >= 0.6}
          reducedMotion={reducedMotion}
          activeGovernorateId={governorateId}
          activeProject={activeProject}
          masterPlanMode={masterPlanMode}
          selectedZoneId={selectedZoneId}
          activeZoneFilter={activeZoneFilter}
          highlightedProjectId={highlightedProjectId}
          visibleProjectIds={visibleProjectIds}
          resetViewNonce={resetViewNonce}
          resetNorthNonce={resetNorthNonce}
          onWebGLStatusChange={setWebglMap}
          onTileModeChange={setMapTiles}
          onCameraMovingChange={setMapCameraMoving}
          onViewportMetricsChange={setViewportMetrics}
          onSelectGovernorate={handleSelectGovernorate}
          onSelectContextualGovernorate={(cId) => setNonActiveGovId(cId)}
          onSelectProject={handleSelectProject}
          onHoverProject={setHighlightedProjectId}
          onSelectZone={(zId) => setSelectedZoneId(zId)}
        />
      </div>

      <TopNavBar
        locale={locale}
        stage={stage}
        activeGovernorate={activeGovernorate}
        activeProject={activeProject}
        shortlistCount={shortlistIds.length}
        onSelectHero={handleReturnToHero}
        onSelectEgypt={handleReturnToEgypt}
        onSelectGovernorate={handleSelectGovernorate}
        onToggleLocale={() => setLocale((prev) => (prev === 'ar' ? 'en' : 'ar'))}
        onOpenProfile={() => setOverlay('profile')}
        onOpenShortlist={() => setOverlay('shortlist')}
        onOpenConsultation={() => openConsultationModal()}
      />

      <HeroOverlay
        locale={locale}
        visible={stage === 'hero' || stage === 'transition'}
        opacity={blend.overlayOpacity}
        webglStatus={webglHero ?? 'ready'}
        onExploreMap={handleExploreMap}
        onOpenConsultation={() => openConsultationModal()}
        onOpenProfile={() => setOverlay('profile')}
      />

      {(stage === 'egypt' || stage === 'governorate') ? (
        <GovernorateRail
          locale={locale}
          stage={stage}
          activeGovernorateId={governorateId}
          filters={filters}
          filteredCount={
            stage === 'governorate'
              ? filteredGovernorateProjects.length
              : filteredNationalProjects.length
          }
          onSelectGovernorate={handleSelectGovernorate}
          onSelectAllEgypt={handleReturnToEgypt}
          onSelectProjectFromSearch={handleSelectProject}
          onUpdateFilters={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
          onResetFilters={() =>
            setFilters({
              query: '',
              governorateId: null,
              unitCategory: null,
              status: null,
              developer: null,
            })
          }
          onOpenConsultation={() => openConsultationModal()}
        />
      ) : null}

      {stage === 'governorate' && activeGovernorate ? (
        <ProjectListDrawer
          locale={locale}
          governorate={activeGovernorate}
          projects={filteredGovernorateProjects}
          highlightedProjectId={highlightedProjectId}
          shortlistIds={shortlistSet}
          onBackToEgypt={handleReturnToEgypt}
          onSelectProject={handleSelectProject}
          onHoverProject={setHighlightedProjectId}
          onToggleShortlist={handleToggleShortlist}
          onResetFilters={() =>
            setFilters({
              query: '',
              governorateId: null,
              unitCategory: null,
              status: null,
              developer: null,
            })
          }
        />
      ) : null}

      {stage === 'project' && activeProject ? (
        <>
          <ProjectInspector
            locale={locale}
            project={activeProject}
            selectedZone={selectedZone}
            isShortlisted={shortlistSet.has(activeProject.id)}
            onBackToGovernorate={handleBackFromProject}
            onPrevProject={() => handleSiblingProject(-1)}
            onNextProject={() => handleSiblingProject(1)}
            onToggleShortlist={handleToggleShortlist}
            onOpenConsultation={() => openConsultationModal()}
            onInquireZone={(zId) =>
              openConsultationModal({
                governorateId: activeProject.governorateId,
                projectId: activeProject.id,
                zoneId: zId,
              })
            }
            onCloseZone={() => setSelectedZoneId(null)}
          />

          <MasterPlanControls
            locale={locale}
            mode={masterPlanMode}
            lat={viewportMetrics.lat || activeProject.coordinates.lat}
            zoom={viewportMetrics.zoom || activeProject.masterPlan.masterPlanZoom}
            bearing={viewportMetrics.bearing}
            onChangeMode={(m) => setMasterPlanMode(m)}
            onResetView={() => setResetViewNonce((n) => n + 1)}
            onResetNorth={() => setResetNorthNonce((n) => n + 1)}
          />

          <MasterPlanLegend
            locale={locale}
            project={activeProject}
            activeZoneFilter={activeZoneFilter}
            onToggleZoneFilter={(kind) =>
              setActiveZoneFilter((prev) => (prev === kind ? null : kind))
            }
          />
        </>
      ) : null}

      {/* Polite Toast for Non-Active Contextual Governorates (EC-04) */}
      {nonActiveGovMeta ? (
        <div id="non-active-gov-toast" className="toast anim-toast-enter" role="status">
          <span>
            <strong>{localize(nonActiveGovMeta.name, locale)}</strong> —{' '}
            {t.egyptDock.nonActiveGovToast}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => {
                setNonActiveGovId(null);
                openConsultationModal();
              }}
            >
              {t.egyptDock.nonActiveGovConsultCta}
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm btn--icon"
              aria-label={t.a11y.closeDialog}
              onClick={() => setNonActiveGovId(null)}
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}

      {/* Shortlist 3-Item Cap Toast (EC-11) */}
      {shortlistCapNotice ? (
        <div id="shortlist-cap-toast" className="toast anim-toast-enter" role="status">
          <span>{t.shortlist.maxReachedToast}</span>
          <button
            type="button"
            className="btn btn--ghost btn--sm btn--icon"
            aria-label={t.a11y.closeDialog}
            onClick={() => setShortlistCapNotice(false)}
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <ConsultantProfileModal
        locale={locale}
        open={overlay === 'profile'}
        onClose={() => setOverlay('none')}
        onBookConsultation={() => openConsultationModal()}
      />

      <ConsultationModal
        locale={locale}
        open={overlay === 'consultation'}
        context={activeConsultContext}
        onClose={() => {
          setOverlay('none');
          setConsultContextOverride(null);
        }}
      />

      <ShortlistDrawer
        locale={locale}
        open={overlay === 'shortlist'}
        shortlistProjectIds={shortlistIds}
        onClose={() => setOverlay('none')}
        onRemoveProject={(id) =>
          setShortlistIds((prev) => prev.filter((item) => item !== id))
        }
        onClearAll={() => setShortlistIds([])}
        onOpenProject={(id) => {
          setOverlay('none');
          handleSelectProject(id);
        }}
        onConsultShortlist={() =>
          openConsultationModal({ shortlistProjectIds: shortlistIds })
        }
      />
    </main>
  );
}

export default App;
