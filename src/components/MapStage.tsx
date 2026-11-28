import { useEffect, useMemo, useRef, useState } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  ACTIVE_GOVERNORATES,
  CONTEXTUAL_GOVERNORATES,
  EGYPT_NILE_PATHS,
  EGYPT_OUTLINE_RING,
  GOVERNORATE_BY_ID,
  PROJECTS,
} from '../data';
import { probeCanvasWebGL } from '../engine/heroMaquette';
import { getTranslations, localize } from '../i18n/translations';
import { createSpatialMapEngine } from '../map/spatialMapEngine';
import type { SpatialMapHandle, ViewportCameraMetrics } from '../map/spatialMapEngine';
import type {
  ActiveGovernorateId,
  ContextualGovernorateId,
  GeoBounds,
  Locale,
  MapTileMode,
  MasterPlanMode,
  RealEstateProject,
  StageId,
  WebGLStatus,
  ZoneKind,
} from '../types/portfolio';
import { EGYPT_BOUNDS, EGYPT_CENTER } from '../utils/mercator';
import { MasterPlanSvgFallback } from './MasterPlanSvgFallback';

const FALLBACK_CONTEXTUAL_IDS: ReadonlySet<ContextualGovernorateId> = new Set([
  'aswan',
  'luxor',
  'port-said',
  'south-sinai',
  'assiut',
  'new-valley',
]);

export interface MapStageProps {
  locale: Locale;
  stage: StageId;
  mapOpacity: number;
  interactive: boolean;
  reducedMotion: boolean;
  activeGovernorateId: ActiveGovernorateId | null;
  activeProject: RealEstateProject | null;
  masterPlanMode: MasterPlanMode;
  selectedZoneId: string | null;
  activeZoneFilter: ZoneKind | null;
  highlightedProjectId: string | null;
  visibleProjectIds: ReadonlySet<string>;
  resetViewNonce: number;
  resetNorthNonce: number;
  onWebGLStatusChange: (status: WebGLStatus) => void;
  onTileModeChange: (mode: MapTileMode) => void;
  onCameraMovingChange: (moving: boolean) => void;
  onViewportMetricsChange: (metrics: ViewportCameraMetrics) => void;
  onSelectGovernorate: (govId: ActiveGovernorateId) => void;
  onSelectContextualGovernorate: (govId: ContextualGovernorateId) => void;
  onSelectProject: (projectId: string) => void;
  onHoverProject: (projectId: string | null) => void;
  onSelectZone: (zoneId: string) => void;
}

function projectToBoundsPercent(
  lng: number,
  lat: number,
  bounds: GeoBounds,
): { leftPct: number; topPct: number } {
  const [[minLng, minLat], [maxLng, maxLat]] = bounds;
  const spanLng = Math.max(0.05, maxLng - minLng);
  const spanLat = Math.max(0.05, maxLat - minLat);
  const padLng = spanLng * 0.14;
  const padLat = spanLat * 0.14;

  const u = (lng - (minLng - padLng)) / (spanLng + 2 * padLng);
  const v = ((maxLat + padLat) - lat) / (spanLat + 2 * padLat);

  return {
    leftPct: Math.max(6, Math.min(94, u * 100)),
    topPct: Math.max(10, Math.min(88, v * 100)),
  };
}

export function MapStage({
  locale,
  stage,
  mapOpacity,
  interactive,
  reducedMotion,
  activeGovernorateId,
  activeProject,
  masterPlanMode,
  selectedZoneId,
  activeZoneFilter,
  highlightedProjectId,
  visibleProjectIds,
  resetViewNonce,
  resetNorthNonce,
  onWebGLStatusChange,
  onTileModeChange,
  onCameraMovingChange,
  onViewportMetricsChange,
  onSelectGovernorate,
  onSelectContextualGovernorate,
  onSelectProject,
  onHoverProject,
  onSelectZone,
}: MapStageProps) {
  const t = getTranslations(locale);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapHandleRef = useRef<SpatialMapHandle | null>(null);
  const hasMountedInitialRef = useRef<boolean>(false);
  const prevStageKeyRef = useRef<string>('');
  const prevModeRef = useRef<MasterPlanMode>(masterPlanMode);

  const [useFallback, setUseFallback] = useState<boolean>(() => !probeCanvasWebGL());
  const [engineMountTick, setEngineMountTick] = useState<number>(0);
  const [svgPan, setSvgPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [svgZoom, setSvgZoom] = useState<number>(1);
  const [svgBearing, setSvgBearing] = useState<number>(0);

  // Keep latest callbacks in ref so MapLibre event closures never go stale
  const cbRef = useRef({
    onWebGLStatusChange,
    onTileModeChange,
    onCameraMovingChange,
    onViewportMetricsChange,
    onSelectGovernorate,
    onSelectContextualGovernorate,
    onSelectProject,
    onHoverProject,
    onSelectZone,
  });
  cbRef.current = {
    onWebGLStatusChange,
    onTileModeChange,
    onCameraMovingChange,
    onViewportMetricsChange,
    onSelectGovernorate,
    onSelectContextualGovernorate,
    onSelectProject,
    onHoverProject,
    onSelectZone,
  };

  useEffect(() => {
    if (useFallback) {
      cbRef.current.onWebGLStatusChange('fallback');
      if (stage !== 'hero') {
        cbRef.current.onTileModeChange('svg-fallback');
      }
      cbRef.current.onCameraMovingChange(false);
      cbRef.current.onViewportMetricsChange({
        lat: activeProject?.coordinates.lat ?? EGYPT_CENTER.lat,
        lng: activeProject?.coordinates.lng ?? EGYPT_CENTER.lng,
        zoom: activeProject?.masterPlan.masterPlanZoom ?? 5.5,
        bearing: 0,
        pitch: masterPlanMode === '3d' ? 54 : 0,
      });
    }
  }, [useFallback, stage, activeProject, masterPlanMode]);

  useEffect(() => {
    if (useFallback) return undefined;
    const container = containerRef.current;
    if (!container) return undefined;

    let cancelled = false;
    let cleanupMap: (() => void) | null = null;

    const timer = window.setTimeout(() => {
      if (cancelled || !containerRef.current) return;

      const handle = createSpatialMapEngine(containerRef.current, {
        onMapReady: () => {
          cbRef.current.onWebGLStatusChange('ready');
        },
        onWebGLFallback: () => {
          mapHandleRef.current = null;
          setUseFallback(true);
        },
        onTileModeChange: (m) => cbRef.current.onTileModeChange(m),
        onCameraMovingChange: (moving) => cbRef.current.onCameraMovingChange(moving),
        onViewportMetricsChange: (metrics) => cbRef.current.onViewportMetricsChange(metrics),
        onSelectGovernorate: (id) => cbRef.current.onSelectGovernorate(id),
        onSelectContextualGovernorate: (id) => cbRef.current.onSelectContextualGovernorate(id),
        onSelectProject: (id) => cbRef.current.onSelectProject(id),
        onHoverProject: (id) => cbRef.current.onHoverProject(id),
        onSelectZone: (id) => cbRef.current.onSelectZone(id),
      });

      if (!handle) {
        setUseFallback(true);
        return;
      }

      mapHandleRef.current = handle;
      setEngineMountTick((n) => n + 1);

      const onResize = (): void => handle.resize();
      window.addEventListener('resize', onResize);

      cleanupMap = () => {
        window.removeEventListener('resize', onResize);
        mapHandleRef.current = null;
        handle.destroy();
      };
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      cleanupMap?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useFallback]);

  // Synchronize HTML markers on every relevant state update
  useEffect(() => {
    const handle = mapHandleRef.current;
    if (!handle) return;
    handle.syncMarkers({
      locale,
      stage,
      activeGovernorateId,
      activeProject,
      highlightedProjectId,
      visibleProjectIds,
      selectedZoneId,
      activeZoneFilter,
    });
  }, [
    engineMountTick,
    locale,
    stage,
    activeGovernorateId,
    activeProject,
    highlightedProjectId,
    visibleProjectIds,
    selectedZoneId,
    activeZoneFilter,
  ]);

  // Drive camera transitions when spatial target (egypt-overview / governorate / project) changes
  useEffect(() => {
    const stageKey =
      stage === 'project' && activeProject
        ? `project:${activeProject.id}`
        : stage === 'governorate' && activeGovernorateId
          ? `gov:${activeGovernorateId}`
          : 'egypt-overview';

    if (useFallback) {
      if (prevStageKeyRef.current === stageKey) return;
      prevStageKeyRef.current = stageKey;
      hasMountedInitialRef.current = true;
      setSvgPan({ x: 0, y: 0 });
      setSvgZoom(1);
      setSvgBearing(0);
      cbRef.current.onCameraMovingChange(false);
      return;
    }

    const handle = mapHandleRef.current;
    if (!handle) return;

    if (prevStageKeyRef.current === stageKey) return;
    prevStageKeyRef.current = stageKey;

    const isInitialHydration = !hasMountedInitialRef.current;
    hasMountedInitialRef.current = true;
    const instant = isInitialHydration || reducedMotion;

    if (stage === 'project' && activeProject) {
      prevModeRef.current = masterPlanMode;
      handle.flyToProject(activeProject, masterPlanMode, instant);
    } else if (stage === 'governorate' && activeGovernorateId) {
      const gov = GOVERNORATE_BY_ID.get(activeGovernorateId);
      if (gov) {
        handle.flyToGovernorate(gov, instant);
      }
    } else {
      handle.flyToEgyptOverview(instant || stage === 'hero' || stage === 'transition');
    }
  }, [
    engineMountTick,
    stage,
    activeGovernorateId,
    activeProject,
    masterPlanMode,
    reducedMotion,
    useFallback,
  ]);

  // Sync 2D <-> 3D Master Plan toggle without re-flying from scratch
  useEffect(() => {
    if (prevModeRef.current === masterPlanMode) return;
    prevModeRef.current = masterPlanMode;
    if (stage !== 'project' || !activeProject) return;

    if (useFallback) {
      cbRef.current.onCameraMovingChange(false);
      return;
    }
    mapHandleRef.current?.setMasterPlanMode(activeProject, masterPlanMode, reducedMotion);
  }, [masterPlanMode, stage, activeProject, reducedMotion, useFallback]);

  // Sync selected zone & legend filter
  useEffect(() => {
    mapHandleRef.current?.setSelectedZone(selectedZoneId);
  }, [selectedZoneId]);

  useEffect(() => {
    mapHandleRef.current?.setActiveZoneFilter(activeZoneFilter);
  }, [activeZoneFilter]);

  // Reset View & Reset North triggers
  useEffect(() => {
    if (resetViewNonce === 0) return;
    if (useFallback) {
      setSvgPan({ x: 0, y: 0 });
      setSvgZoom(1);
      setSvgBearing(0);
      return;
    }
    if (stage === 'project' && activeProject) {
      mapHandleRef.current?.resetMasterPlanView(activeProject, masterPlanMode, reducedMotion);
    }
  }, [resetViewNonce, stage, activeProject, masterPlanMode, reducedMotion, useFallback]);

  useEffect(() => {
    if (resetNorthNonce === 0) return;
    if (useFallback) {
      setSvgBearing(0);
      return;
    }
    mapHandleRef.current?.resetNorth(reducedMotion);
  }, [resetNorthNonce, reducedMotion, useFallback]);

  // Re-adjust padding cleanly if locale direction flips RTL <-> LTR
  useEffect(() => {
    const handle = mapHandleRef.current;
    if (!handle) return;
    handle.resize();
  }, [locale]);

  const fallbackBounds: GeoBounds = useMemo(() => {
    if (stage === 'governorate' && activeGovernorateId) {
      const gov = GOVERNORATE_BY_ID.get(activeGovernorateId);
      if (gov) return gov.focusBounds;
    }
    return EGYPT_BOUNDS;
  }, [stage, activeGovernorateId]);

  const fallbackOutlinePoints = useMemo(() => {
    return EGYPT_OUTLINE_RING.map(([lng, lat]) => {
      const { leftPct, topPct } = projectToBoundsPercent(lng, lat, fallbackBounds);
      return `${(leftPct * 10).toFixed(1)},${(topPct * 6).toFixed(1)}`;
    }).join(' ');
  }, [fallbackBounds]);

  const fallbackNilePoints = useMemo(() => {
    return EGYPT_NILE_PATHS.main
      .map(([lng, lat]) => {
        const { leftPct, topPct } = projectToBoundsPercent(lng, lat, fallbackBounds);
        return `${(leftPct * 10).toFixed(1)},${(topPct * 6).toFixed(1)}`;
      })
      .join(' ');
  }, [fallbackBounds]);

  return (
    <div
      className="stage-layer--map"
      role="region"
      aria-label={t.a11y.mapRegionLabel}
      inert={!interactive}
      style={{
        opacity: useFallback ? mapOpacity : Math.max(0.004, mapOpacity),
        visibility: useFallback && mapOpacity <= 0.005 ? 'hidden' : 'visible',
        pointerEvents: interactive ? 'auto' : 'none',
      }}
    >
      {!useFallback ? (
        <div
          ref={containerRef}
          dir="ltr"
          className="spatial-map-container"
          style={{ width: '100%', height: '100%' }}
        />
      ) : stage === 'project' && activeProject ? (
        <MasterPlanSvgFallback
          locale={locale}
          project={activeProject}
          mode={masterPlanMode}
          selectedZoneId={selectedZoneId}
          activeZoneFilter={activeZoneFilter}
          panOffset={svgPan}
          zoomScale={svgZoom}
          bearingOffset={svgBearing}
          onSelectZone={onSelectZone}
        />
      ) : (
        <div
          className="svg-egypt-map-fallback"
          style={{ position: 'relative', width: '100%', height: '100%', background: '#12262e' }}
        >
          <svg
            viewBox="0 0 1000 600"
            preserveAspectRatio="none"
            style={{ width: '100%', height: '100%', display: 'block' }}
          >
            <rect width="1000" height="600" fill="#12262e" />
            <polygon
              points={fallbackOutlinePoints}
              fill="#252019"
              stroke="#cf9d4f"
              strokeWidth="2"
            />
            <polyline
              points={fallbackNilePoints}
              fill="none"
              stroke="#2b6e7d"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </svg>

          {/* Fallback Active Governorate Markers */}
          {ACTIVE_GOVERNORATES.map((gov) => {
            if (stage === 'governorate' && activeGovernorateId === gov.id) return null;
            const pos = projectToBoundsPercent(gov.center.lng, gov.center.lat, fallbackBounds);
            const label = localize(gov.shortName, locale);
            return (
              <button
                key={gov.id}
                id={`gov-marker-${gov.id}`}
                type="button"
                className={
                  gov.isFlagship
                    ? 'map-gov-marker map-gov-marker--flagship'
                    : 'map-gov-marker'
                }
                aria-label={`${t.a11y.governoratePinAria} ${label} (${gov.projectCount})`}
                onClick={() => onSelectGovernorate(gov.id)}
                style={{
                  position: 'absolute',
                  left: `${pos.leftPct.toFixed(2)}%`,
                  top: `${pos.topPct.toFixed(2)}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {label} · {gov.projectCount}
              </button>
            );
          })}

          {/* Fallback Contextual Non-Active Governorate Markers */}
          {stage === 'egypt'
            ? CONTEXTUAL_GOVERNORATES.filter((g) => FALLBACK_CONTEXTUAL_IDS.has(g.id)).map(
                (cGov) => {
                  const pos = projectToBoundsPercent(
                    cGov.center.lng,
                    cGov.center.lat,
                    fallbackBounds,
                  );
                  const label = localize(cGov.name, locale);
                  return (
                    <button
                      key={cGov.id}
                      id={`gov-marker-${cGov.id}`}
                      type="button"
                      className="map-gov-marker map-gov-marker--contextual"
                      aria-label={label}
                      onClick={() => onSelectContextualGovernorate(cGov.id)}
                      style={{
                        position: 'absolute',
                        left: `${pos.leftPct.toFixed(2)}%`,
                        top: `${pos.topPct.toFixed(2)}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      {label}
                    </button>
                  );
                },
              )
            : null}

          {/* Fallback 22 Project Beacons */}
          {PROJECTS.map((project, idx) => {
            const isVisible = visibleProjectIds.has(project.id);
            const pos = projectToBoundsPercent(
              project.coordinates.lng,
              project.coordinates.lat,
              fallbackBounds,
            );
            const jitterX = (idx % 3 - 1) * 3;
            const jitterY = ((idx >> 1) % 3 - 1) * 3;
            const isHighlighted = highlightedProjectId === project.id;
            const projName = localize(project.name, locale);

            return (
              <button
                key={project.id}
                id={`map-pin-${project.id}`}
                type="button"
                hidden={!isVisible}
                data-project-id={project.id}
                data-highlighted={isHighlighted ? 'true' : 'false'}
                data-active="false"
                data-filtered-out={isVisible ? 'false' : 'true'}
                aria-hidden={!isVisible}
                aria-label={`${t.a11y.projectPinAria} ${projName}`}
                title={projName}
                className={
                  isHighlighted ? 'map-project-pin map-project-pin--active' : 'map-project-pin'
                }
                onClick={() => onSelectProject(project.id)}
                onMouseEnter={() => onHoverProject(project.id)}
                onMouseLeave={() => onHoverProject(null)}
                style={{
                  display: isVisible ? 'inline-flex' : 'none',
                  position: 'absolute',
                  left: `calc(${pos.leftPct.toFixed(2)}% + ${jitterX}px)`,
                  top: `calc(${pos.topPct.toFixed(2)}% + ${jitterY}px)`,
                  transform: 'translate(-50%, -100%)',
                }}
              >
                {stage === 'governorate' || isHighlighted ? projName : '●'}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
