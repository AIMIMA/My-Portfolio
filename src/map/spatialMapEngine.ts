import { Map as MapLibreMap, setWorkerUrl } from 'maplibre-gl';
import type { PaddingOptions } from 'maplibre-gl';
import maplibreWorkerCode from 'maplibre-gl/dist/maplibre-gl-worker.mjs?raw';
import { probeWebGLDetails } from '../engine/heroMaquette';
import type {
  Governorate,
  MapTileMode,
  MasterPlanMode,
  RealEstateProject,
  ZoneKind,
} from '../types/portfolio';
import { EGYPT_BOUNDS, EGYPT_CENTER } from '../utils/mercator';
import {
  applyGovernorateFocusStyle,
  createOfflineEgyptStyle,
  probeAndEnhanceOnlineStyle,
} from './mapStyle';
import { createMapMarkerManager } from './markers';
import type { MarkerCallbacks, MarkerSyncState } from './markers';
import { createMasterPlanController } from './masterPlanLayer';

let cachedMapLibreWorkerUrl: string | null = null;

function ensureMapLibreWorkerUrl(): void {
  if (cachedMapLibreWorkerUrl !== null) return;
  if (typeof Blob !== 'undefined' && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
    const blob = new Blob([maplibreWorkerCode], { type: 'text/javascript' });
    cachedMapLibreWorkerUrl = URL.createObjectURL(blob);
    setWorkerUrl(cachedMapLibreWorkerUrl);
  }
}

export interface ViewportCameraMetrics {
  lat: number;
  lng: number;
  zoom: number;
  bearing: number;
  pitch: number;
}

export interface SpatialMapEngineOptions extends MarkerCallbacks {
  onMapReady: () => void;
  onWebGLFallback: () => void;
  onTileModeChange: (mode: MapTileMode) => void;
  onCameraMovingChange: (moving: boolean) => void;
  onViewportMetricsChange: (metrics: ViewportCameraMetrics) => void;
}

export interface SpatialMapHandle {
  getMap: () => MapLibreMap | null;
  syncMarkers: (state: MarkerSyncState) => void;
  flyToEgyptOverview: (instant?: boolean) => void;
  flyToGovernorate: (gov: Governorate, instant?: boolean) => void;
  flyToProject: (project: RealEstateProject, mode: MasterPlanMode, instant?: boolean) => void;
  setMasterPlanMode: (project: RealEstateProject, mode: MasterPlanMode, instant?: boolean) => void;
  setSelectedZone: (zoneId: string | null) => void;
  setActiveZoneFilter: (kind: ZoneKind | null) => void;
  resetMasterPlanView: (project: RealEstateProject, mode: MasterPlanMode, instant?: boolean) => void;
  resetNorth: (instant?: boolean) => void;
  resize: () => void;
  destroy: () => void;
}

function getStagePadding(kind: 'egypt' | 'governorate' | 'project'): PaddingOptions {
  if (typeof window === 'undefined') {
    return { top: 72, bottom: 72, left: 72, right: 72 };
  }
  const w = window.innerWidth;
  const isMobile = w <= 767;
  const isRtl = document.documentElement.dir !== 'ltr';

  if (kind === 'egypt') {
    if (isMobile) {
      return { top: 74, bottom: 220, left: 24, right: 24 };
    }
    return { top: 80, bottom: 180, left: 64, right: 64 };
  }

  if (kind === 'governorate') {
    if (isMobile) {
      return { top: 112, bottom: 320, left: 28, right: 28 };
    }
    return isRtl
      ? { top: 84, bottom: 150, left: 64, right: 424 }
      : { top: 84, bottom: 150, left: 424, right: 64 };
  }

  // Project Master Plan stage (side inspector + inline-end controls/legend)
  if (isMobile) {
    return { top: 96, bottom: 320, left: 24, right: 24 };
  }
  return isRtl
    ? { top: 88, bottom: 96, left: 160, right: 410 }
    : { top: 88, bottom: 96, left: 410, right: 160 };
}

export function createSpatialMapEngine(
  container: HTMLElement,
  options: SpatialMapEngineOptions,
): SpatialMapHandle | null {
  const probe = probeWebGLDetails();
  if (!probe.supported) {
    options.onWebGLFallback();
    return null;
  }

  const flightScale = probe.isSoftware ? 0.55 : 1;

  let map: MapLibreMap;
  try {
    ensureMapLibreWorkerUrl();
    map = new MapLibreMap({
      container,
      style: createOfflineEgyptStyle(),
      center: [EGYPT_CENTER.lng, EGYPT_CENTER.lat],
      zoom: 5.35,
      pitch: 0,
      bearing: 0,
      maxPitch: 60,
      minZoom: 4.2,
      maxZoom: 19,
      pixelRatio: probe.isSoftware ? 1 : Math.min(window.devicePixelRatio || 1, 2),
      attributionControl: false,
      renderWorldCopies: false,
      dragRotate: true,
      touchZoomRotate: true,
      fadeDuration: probe.isSoftware ? 0 : 180,
      canvasContextAttributes: {
        antialias: !probe.isSoftware,
        preserveDrawingBuffer: false,
        failIfMajorPerformanceCaveat: false,
      },
    });
  } catch {
    options.onWebGLFallback();
    return null;
  }

  let disposed = false;
  let styleReady = false;
  let pendingReadyTask: (() => void) | null = null;
  let flightToken = 0;
  let settleTimer: number | null = null;

  const masterPlan = createMasterPlanController({
    onZoneSelect: options.onSelectZone,
    isSoftware: probe.isSoftware,
  });

  const markerManager = createMapMarkerManager(map, {
    onSelectGovernorate: options.onSelectGovernorate,
    onSelectContextualGovernorate: options.onSelectContextualGovernorate,
    onSelectProject: options.onSelectProject,
    onHoverProject: options.onHoverProject,
    onSelectZone: options.onSelectZone,
  });

  const emitMetrics = (): void => {
    if (disposed) return;
    const c = map.getCenter();
    options.onViewportMetricsChange({
      lat: c.lat,
      lng: c.lng,
      zoom: map.getZoom(),
      bearing: map.getBearing(),
      pitch: map.getPitch(),
    });
  };

  const clearSettleTimer = (): void => {
    if (settleTimer !== null) {
      window.clearTimeout(settleTimer);
      settleTimer = null;
    }
  };

  const beginFlight = (baseDurationMs: number): { token: number; duration: number } => {
    const duration = Math.max(180, Math.round(baseDurationMs * flightScale));
    flightToken += 1;
    const token = flightToken;
    clearSettleTimer();
    options.onCameraMovingChange(true);

    settleTimer = window.setTimeout(() => {
      if (!disposed && token === flightToken) {
        settleTimer = null;
        options.onCameraMovingChange(false);
        emitMetrics();
      }
    }, duration + 120);

    return { token, duration };
  };

  const finishInstantMove = (): void => {
    flightToken += 1;
    clearSettleTimer();
    options.onCameraMovingChange(false);
    emitMetrics();
  };

  map.on('zoomend', () => {
    emitMetrics();
  });

  map.on('rotateend', () => {
    emitMetrics();
  });

  map.on('moveend', () => {
    if (disposed) return;
    clearSettleTimer();
    options.onCameraMovingChange(false);
    emitMetrics();
  });

  map.on('error', (evt) => {
    const msg = evt?.error?.message ?? '';
    if (/webgl|gpu|context/i.test(msg)) {
      options.onWebGLFallback();
    }
  });

  const canvas = map.getCanvas();
  const onContextLost = (e: Event): void => {
    e.preventDefault();
    options.onWebGLFallback();
  };
  canvas.addEventListener('webglcontextlost', onContextLost, false);
  window.addEventListener('pagehide', destroyEngine);
  window.addEventListener('beforeunload', destroyEngine);

  map.on('load', () => {
    if (disposed) return;
    styleReady = true;
    masterPlan.attach(map);
    options.onTileModeChange('offline-vector');
    options.onMapReady();
    emitMetrics();

    if (pendingReadyTask) {
      const fn = pendingReadyTask;
      pendingReadyTask = null;
      fn();
    }

    void probeAndEnhanceOnlineStyle(
      map,
      () => disposed,
      () => {
        if (!disposed) {
          options.onTileModeChange('online-enhanced');
        }
      },
    );
  });

  const runWhenReady = (task: () => void): void => {
    if (styleReady) {
      task();
    } else {
      pendingReadyTask = task;
    }
  };

  return {
    getMap: () => (disposed ? null : map),

    syncMarkers: (state: MarkerSyncState) => {
      if (disposed) return;
      markerManager.sync(state);
    },

    flyToEgyptOverview: (instant = false) => {
      runWhenReady(() => {
        if (disposed) return;
        masterPlan.clear();
        applyGovernorateFocusStyle(map, null);
        const padding = getStagePadding('egypt');
        if (instant) {
          map.stop();
          map.fitBounds(EGYPT_BOUNDS, {
            padding,
            pitch: 0,
            bearing: 0,
            animate: false,
          });
          finishInstantMove();
        } else {
          const { duration } = beginFlight(480);
          map.fitBounds(EGYPT_BOUNDS, {
            padding,
            pitch: 0,
            bearing: 0,
            duration,
            essential: true,
          });
        }
      });
    },

    flyToGovernorate: (gov: Governorate, instant = false) => {
      runWhenReady(() => {
        if (disposed) return;
        masterPlan.clear();
        applyGovernorateFocusStyle(map, gov.id);
        const padding = getStagePadding('governorate');
        if (instant) {
          map.stop();
          map.fitBounds(gov.focusBounds, {
            padding,
            maxZoom: Math.max(gov.zoom, 11.5),
            pitch: Math.min(45, gov.pitch),
            bearing: gov.bearing,
            animate: false,
          });
          finishInstantMove();
        } else {
          const { duration } = beginFlight(520);
          map.fitBounds(gov.focusBounds, {
            padding,
            maxZoom: Math.max(gov.zoom, 11.5),
            pitch: Math.min(45, gov.pitch),
            bearing: gov.bearing,
            duration,
            essential: true,
          });
        }
      });
    },

    flyToProject: (project: RealEstateProject, mode: MasterPlanMode, instant = false) => {
      runWhenReady(() => {
        if (disposed) return;
        applyGovernorateFocusStyle(map, project.governorateId);
        masterPlan.showProject(project, mode);
        const padding = getStagePadding('project');
        const targetPitch = mode === '3d' ? 54 : 0;
        const targetBearing =
          mode === '3d'
            ? project.masterPlan.northAngleDeg - 22
            : project.masterPlan.northAngleDeg;

        if (instant) {
          map.stop();
          map.jumpTo({
            center: [project.coordinates.lng, project.coordinates.lat],
            zoom: project.masterPlan.masterPlanZoom,
            pitch: targetPitch,
            bearing: targetBearing,
            padding,
          });
          finishInstantMove();
        } else {
          const { duration } = beginFlight(540);
          map.flyTo({
            center: [project.coordinates.lng, project.coordinates.lat],
            zoom: project.masterPlan.masterPlanZoom,
            pitch: targetPitch,
            bearing: targetBearing,
            padding,
            duration,
            curve: 1.32,
            essential: true,
          });
        }
      });
    },

    setMasterPlanMode: (project: RealEstateProject, mode: MasterPlanMode, instant = false) => {
      runWhenReady(() => {
        if (disposed) return;
        masterPlan.setMode(mode);
        const targetPitch = mode === '3d' ? 54 : 0;
        const targetBearing =
          mode === '3d'
            ? project.masterPlan.northAngleDeg - 22
            : project.masterPlan.northAngleDeg;
        const padding = getStagePadding('project');

        if (instant) {
          map.stop();
          map.jumpTo({
            center: [project.coordinates.lng, project.coordinates.lat],
            zoom: project.masterPlan.masterPlanZoom,
            pitch: targetPitch,
            bearing: targetBearing,
            padding,
          });
          finishInstantMove();
        } else {
          const { duration } = beginFlight(360);
          map.easeTo({
            pitch: targetPitch,
            bearing: targetBearing,
            padding,
            duration,
            essential: true,
          });
        }
      });
    },

    setSelectedZone: (zoneId: string | null) => {
      if (disposed) return;
      masterPlan.setSelectedZone(zoneId);
    },

    setActiveZoneFilter: (kind: ZoneKind | null) => {
      if (disposed) return;
      masterPlan.setActiveZoneFilter(kind);
    },

    resetMasterPlanView: (project: RealEstateProject, mode: MasterPlanMode, instant = false) => {
      runWhenReady(() => {
        if (disposed) return;
        const targetPitch = mode === '3d' ? 54 : 0;
        const targetBearing =
          mode === '3d'
            ? project.masterPlan.northAngleDeg - 22
            : project.masterPlan.northAngleDeg;
        const padding = getStagePadding('project');

        if (instant) {
          map.stop();
          map.jumpTo({
            center: [project.coordinates.lng, project.coordinates.lat],
            zoom: project.masterPlan.masterPlanZoom,
            pitch: targetPitch,
            bearing: targetBearing,
            padding,
          });
          finishInstantMove();
        } else {
          const { duration } = beginFlight(340);
          map.easeTo({
            center: [project.coordinates.lng, project.coordinates.lat],
            zoom: project.masterPlan.masterPlanZoom,
            pitch: targetPitch,
            bearing: targetBearing,
            padding,
            duration,
            essential: true,
          });
        }
      });
    },

    resetNorth: (instant = false) => {
      runWhenReady(() => {
        if (disposed) return;
        if (instant) {
          map.stop();
          map.jumpTo({ bearing: 0 });
          finishInstantMove();
        } else {
          const { duration } = beginFlight(280);
          map.easeTo({ bearing: 0, duration, essential: true });
        }
      });
    },

    resize: () => {
      if (!disposed) {
        map.resize();
      }
    },

    destroy: () => {
      destroyEngine();
    },
  };

  function destroyEngine(): void {
    if (disposed) return;
    disposed = true;
    clearSettleTimer();
    window.removeEventListener('pagehide', destroyEngine);
    window.removeEventListener('beforeunload', destroyEngine);
    canvas.removeEventListener('webglcontextlost', onContextLost, false);
    markerManager.destroy();
    masterPlan.destroy();
    try {
      map.remove();
    } catch {
      // Ignore teardown errors during abrupt page close
    }
  }
}
