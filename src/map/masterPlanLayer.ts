import type { GeoJSONSource, Map as MapLibreMap, MapMouseEvent } from 'maplibre-gl';
import { ACTIVE_GOVERNORATES } from '../data';
import type { MasterPlanMode, RealEstateProject, ZoneKind } from '../types/portfolio';
import { EGYPT_CENTER, masterPlanToGeoJSON } from '../utils/mercator';
import { registerCadHatchPatterns } from './cadPatterns';

export const MASTERPLAN_SOURCE_ID = 'project-masterplan';

function createShaderWarmupFC() {
  const anchors = [EGYPT_CENTER, ...ACTIVE_GOVERNORATES.map((g) => g.center)];
  const d = 0.00001;
  const features = [];
  let idSeq = 9000;
  for (const pt of anchors) {
    const ring = [
      [pt.lng, pt.lat],
      [pt.lng + d, pt.lat],
      [pt.lng + d, pt.lat + d],
      [pt.lng, pt.lat + d],
      [pt.lng, pt.lat],
    ];
    features.push(
      {
        type: 'Feature' as const,
        id: idSeq++,
        properties: { featureType: 'boundary' },
        geometry: { type: 'Polygon' as const, coordinates: [ring] },
      },
      {
        type: 'Feature' as const,
        id: idSeq++,
        properties: {
          featureType: 'zone',
          zoneId: '__warmup__',
          kind: 'residential-villas',
          fillColor: '#211d18',
          strokeColor: '#211d18',
          patternId: 'hatch-villas',
          visualHeight: 0.1,
        },
        geometry: { type: 'Polygon' as const, coordinates: [ring] },
      },
      {
        type: 'Feature' as const,
        id: idSeq++,
        properties: { featureType: 'road', roadKind: 'boulevard' },
        geometry: {
          type: 'LineString' as const,
          coordinates: [
            [pt.lng, pt.lat],
            [pt.lng + d, pt.lat + d],
          ],
        },
      },
    );
  }
  return {
    type: 'FeatureCollection' as const,
    features,
  };
}

const BASE_LAYER_IDS = [
  'mp-boundary-fill',
  'mp-zone-fill-2d',
  'mp-roads-casing',
  'mp-roads-center',
  'mp-boundary-line',
  'mp-zone-outline-2d',
] as const;

export interface MasterPlanControllerOptions {
  onZoneSelect: (zoneId: string) => void;
  onZoneHover?: (zoneId: string | null) => void;
  isSoftware?: boolean;
}

export interface MasterPlanController {
  attach: (map: MapLibreMap) => void;
  showProject: (project: RealEstateProject, mode: MasterPlanMode) => void;
  clear: () => void;
  setMode: (mode: MasterPlanMode) => void;
  setSelectedZone: (zoneId: string | null) => void;
  setActiveZoneFilter: (kind: ZoneKind | null) => void;
  destroy: () => void;
}

export function createMasterPlanController(
  options: MasterPlanControllerOptions,
): MasterPlanController {
  let mapRef: MapLibreMap | null = null;
  let currentProject: RealEstateProject | null = null;
  let lastLoadedProjectId: string | null = null;
  let baseLayersVisible = true;
  let currentMode: MasterPlanMode = '2d';
  let selectedZoneId: string | null = null;
  let hoveredNumericId: number | null = null;
  let activeFilterKind: ZoneKind | null = null;
  let appliedMode: MasterPlanMode | null = null;
  let appliedFilterKind: ZoneKind | null = null;
  let hadDirtyFeatureState = false;
  let zoneIdToNumeric = new Map<string, number>();

  // shortcut: skip per-pixel fill-pattern & SDF line-dasharray shaders on SwiftShader CPU rasterizer; hardware GPUs keep full CAD styling
  const enableHatchPattern = !options.isSoftware;

  const setBaseLayersVisibility = (visible: boolean): void => {
    const map = mapRef;
    if (!map || baseLayersVisible === visible) return;
    baseLayersVisible = visible;
    const vis = visible ? 'visible' : 'none';
    for (const layerId of BASE_LAYER_IDS) {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, 'visibility', vis);
      }
    }
  };

  const syncFeatureStates = (): void => {
    const map = mapRef;
    if (!map || !map.getSource(MASTERPLAN_SOURCE_ID)) return;

    if (selectedZoneId === null && hoveredNumericId === null && !hadDirtyFeatureState) {
      return;
    }
    hadDirtyFeatureState = selectedZoneId !== null || hoveredNumericId !== null;

    for (const [zId, numId] of zoneIdToNumeric.entries()) {
      map.setFeatureState(
        { source: MASTERPLAN_SOURCE_ID, id: numId },
        {
          selected: zId === selectedZoneId,
          hover: numId === hoveredNumericId,
        },
      );
    }
  };

  const syncModeAndFilterPaint = (): void => {
    const map = mapRef;
    if (!map || !map.getLayer('mp-zone-fill-2d')) return;

    if (appliedMode !== currentMode) {
      appliedMode = currentMode;
      const is3d = currentMode === '3d';
      map.setLayoutProperty(
        'mp-zone-extrusion-3d',
        'visibility',
        is3d ? 'visible' : 'none',
      );
      if (enableHatchPattern && map.getLayer('mp-zone-pattern-2d')) {
        map.setLayoutProperty(
          'mp-zone-pattern-2d',
          'visibility',
          is3d ? 'none' : 'visible',
        );
      }
    }

    if (appliedFilterKind !== activeFilterKind) {
      appliedFilterKind = activeFilterKind;
      if (activeFilterKind) {
        map.setPaintProperty('mp-zone-fill-2d', 'fill-opacity', [
          'case',
          ['==', ['get', 'kind'], activeFilterKind],
          0.86,
          0.16,
        ]);
        map.setPaintProperty('mp-zone-extrusion-3d', 'fill-extrusion-opacity', [
          'case',
          ['==', ['get', 'kind'], activeFilterKind],
          0.94,
          0.22,
        ]);
      } else {
        map.setPaintProperty('mp-zone-fill-2d', 'fill-opacity', [
          'case',
          ['boolean', ['feature-state', 'selected'], false],
          0.92,
          ['boolean', ['feature-state', 'hover'], false],
          0.84,
          0.68,
        ]);
        map.setPaintProperty('mp-zone-extrusion-3d', 'fill-extrusion-opacity', 0.9);
      }
    }
  };

  const handleZoneClick = (e: MapMouseEvent & { features?: Array<{ properties?: Record<string, unknown> }> }): void => {
    const feat = e.features?.[0];
    const zId = typeof feat?.properties?.zoneId === 'string' ? feat.properties.zoneId : null;
    if (zId && zId !== '__warmup__') {
      options.onZoneSelect(zId);
    }
  };

  const handleZoneMove = (e: MapMouseEvent & { features?: Array<{ id?: string | number; properties?: Record<string, unknown> }> }): void => {
    const map = mapRef;
    if (!map) return;
    const feat = e.features?.[0];
    const rawZId = typeof feat?.properties?.zoneId === 'string' ? feat.properties.zoneId : null;
    const zId = rawZId && rawZId !== '__warmup__' ? rawZId : null;
    const numId = zId && typeof feat?.id === 'number' ? feat.id : null;
    if (numId !== hoveredNumericId) {
      hoveredNumericId = numId;
      syncFeatureStates();
      options.onZoneHover?.(zId);
    }
    map.getCanvas().style.cursor = zId ? 'pointer' : '';
  };

  const handleZoneLeave = (): void => {
    const map = mapRef;
    if (!map) return;
    if (hoveredNumericId !== null) {
      hoveredNumericId = null;
      syncFeatureStates();
      options.onZoneHover?.(null);
    }
    map.getCanvas().style.cursor = '';
  };

  return {
    attach: (map: MapLibreMap) => {
      mapRef = map;
      baseLayersVisible = true;
      appliedMode = null;
      appliedFilterKind = null;

      if (enableHatchPattern) {
        registerCadHatchPatterns(map);
      }

      map.setLight({
        anchor: 'viewport',
        color: '#ffe3b3',
        intensity: 0.48,
        position: [1.4, 215, 46],
      });

      if (!map.getSource(MASTERPLAN_SOURCE_ID)) {
        map.addSource(MASTERPLAN_SOURCE_ID, {
          type: 'geojson',
          data: createShaderWarmupFC(),
          maxzoom: 16,
        });
      }

      map.addLayer({
        id: 'mp-boundary-fill',
        type: 'fill',
        source: MASTERPLAN_SOURCE_ID,
        filter: ['==', ['get', 'featureType'], 'boundary'],
        paint: {
          'fill-color': '#181512',
          'fill-opacity': 0.88,
        },
      });

      map.addLayer({
        id: 'mp-zone-fill-2d',
        type: 'fill',
        source: MASTERPLAN_SOURCE_ID,
        filter: ['==', ['get', 'featureType'], 'zone'],
        paint: {
          'fill-color': ['get', 'fillColor'],
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            0.92,
            ['boolean', ['feature-state', 'hover'], false],
            0.84,
            0.68,
          ],
        },
      });

      if (enableHatchPattern) {
        map.addLayer({
          id: 'mp-zone-pattern-2d',
          type: 'fill',
          source: MASTERPLAN_SOURCE_ID,
          filter: ['==', ['get', 'featureType'], 'zone'],
          paint: {
            'fill-pattern': ['get', 'patternId'],
            'fill-opacity': 0.25,
          },
        });
      }

      map.addLayer({
        id: 'mp-roads-casing',
        type: 'line',
        source: MASTERPLAN_SOURCE_ID,
        filter: ['==', ['get', 'featureType'], 'road'],
        paint: {
          'line-color': '#23201c',
          'line-width': [
            'match',
            ['get', 'roadKind'],
            'boulevard',
            7,
            'promenade',
            5,
            4,
          ],
          'line-opacity': 0.9,
        },
      });

      map.addLayer({
        id: 'mp-roads-center',
        type: 'line',
        source: MASTERPLAN_SOURCE_ID,
        filter: ['==', ['get', 'featureType'], 'road'],
        paint: {
          'line-color': [
            'match',
            ['get', 'roadKind'],
            'promenade',
            '#cf9d4f',
            '#6c6254',
          ],
          'line-width': [
            'match',
            ['get', 'roadKind'],
            'boulevard',
            2.4,
            1.6,
          ],
          ...(enableHatchPattern ? { 'line-dasharray': [2, 2] as [number, number] } : {}),
          'line-opacity': 0.85,
        },
      });

      map.addLayer({
        id: 'mp-boundary-line',
        type: 'line',
        source: MASTERPLAN_SOURCE_ID,
        filter: ['==', ['get', 'featureType'], 'boundary'],
        paint: {
          'line-color': '#cf9d4f',
          'line-width': 2,
          ...(enableHatchPattern ? { 'line-dasharray': [4, 3] as [number, number] } : {}),
          'line-opacity': 0.85,
        },
      });

      map.addLayer({
        id: 'mp-zone-outline-2d',
        type: 'line',
        source: MASTERPLAN_SOURCE_ID,
        filter: ['==', ['get', 'featureType'], 'zone'],
        paint: {
          'line-color': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            '#f8d99b',
            ['boolean', ['feature-state', 'hover'], false],
            '#ebdcca',
            ['get', 'strokeColor'],
          ],
          'line-width': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            3.2,
            ['boolean', ['feature-state', 'hover'], false],
            2.4,
            1.35,
          ],
          'line-opacity': 0.95,
        },
      });

      map.addLayer({
        id: 'mp-zone-extrusion-3d',
        type: 'fill-extrusion',
        source: MASTERPLAN_SOURCE_ID,
        filter: ['==', ['get', 'featureType'], 'zone'],
        paint: {
          'fill-extrusion-color': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            '#f3cc84',
            ['boolean', ['feature-state', 'hover'], false],
            '#e6d6be',
            ['get', 'fillColor'],
          ],
          'fill-extrusion-height': ['get', 'visualHeight'],
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.9,
        },
      });

      // Hide warmup layers automatically once initial frame compiles all GLSL shaders
      map.once('idle', () => {
        if (!mapRef || currentProject !== null) return;
        setBaseLayersVisibility(false);
        if (map.getLayer('mp-zone-extrusion-3d')) {
          map.setLayoutProperty('mp-zone-extrusion-3d', 'visibility', 'none');
        }
        if (enableHatchPattern && map.getLayer('mp-zone-pattern-2d')) {
          map.setLayoutProperty('mp-zone-pattern-2d', 'visibility', 'none');
        }
        appliedMode = null;
      });

      map.on('click', 'mp-zone-fill-2d', handleZoneClick);
      map.on('click', 'mp-zone-extrusion-3d', handleZoneClick);
      map.on('mousemove', 'mp-zone-fill-2d', handleZoneMove);
      map.on('mousemove', 'mp-zone-extrusion-3d', handleZoneMove);
      map.on('mouseleave', 'mp-zone-fill-2d', handleZoneLeave);
      map.on('mouseleave', 'mp-zone-extrusion-3d', handleZoneLeave);
    },

    showProject: (project: RealEstateProject, mode: MasterPlanMode) => {
      currentProject = project;
      currentMode = mode;
      selectedZoneId = null;
      hoveredNumericId = null;
      activeFilterKind = null;

      zoneIdToNumeric = new Map(
        project.masterPlan.zones.map((z, idx) => [z.id, idx + 1]),
      );

      const map = mapRef;
      if (!map) return;
      const src = map.getSource(MASTERPLAN_SOURCE_ID) as GeoJSONSource | undefined;
      if (!src) return;

      if (lastLoadedProjectId !== project.id) {
        src.setData(masterPlanToGeoJSON(project));
        lastLoadedProjectId = project.id;
      }
      if (hadDirtyFeatureState) {
        map.removeFeatureState({ source: MASTERPLAN_SOURCE_ID });
        hadDirtyFeatureState = false;
      }
      setBaseLayersVisibility(true);
      syncModeAndFilterPaint();
    },

    clear: () => {
      if (currentProject === null) return;
      currentProject = null;
      selectedZoneId = null;
      hoveredNumericId = null;
      activeFilterKind = null;
      zoneIdToNumeric.clear();

      const map = mapRef;
      if (!map) return;
      if (hadDirtyFeatureState) {
        map.removeFeatureState({ source: MASTERPLAN_SOURCE_ID });
        hadDirtyFeatureState = false;
      }
      setBaseLayersVisibility(false);
      if (map.getLayer('mp-zone-extrusion-3d')) {
        map.setLayoutProperty('mp-zone-extrusion-3d', 'visibility', 'none');
      }
      if (enableHatchPattern && map.getLayer('mp-zone-pattern-2d')) {
        map.setLayoutProperty('mp-zone-pattern-2d', 'visibility', 'none');
      }
      appliedMode = null;
      map.getCanvas().style.cursor = '';
    },

    setMode: (mode: MasterPlanMode) => {
      currentMode = mode;
      if (!currentProject) return;
      syncModeAndFilterPaint();
    },

    setSelectedZone: (zoneId: string | null) => {
      selectedZoneId = zoneId;
      syncFeatureStates();
      syncModeAndFilterPaint();
    },

    setActiveZoneFilter: (kind: ZoneKind | null) => {
      activeFilterKind = kind;
      syncModeAndFilterPaint();
    },

    destroy: () => {
      const map = mapRef;
      if (map) {
        map.off('click', 'mp-zone-fill-2d', handleZoneClick);
        map.off('click', 'mp-zone-extrusion-3d', handleZoneClick);
        map.off('mousemove', 'mp-zone-fill-2d', handleZoneMove);
        map.off('mousemove', 'mp-zone-extrusion-3d', handleZoneMove);
        map.off('mouseleave', 'mp-zone-fill-2d', handleZoneLeave);
        map.off('mouseleave', 'mp-zone-extrusion-3d', handleZoneLeave);
      }
      mapRef = null;
      currentProject = null;
      lastLoadedProjectId = null;
      baseLayersVisible = false;
      appliedMode = null;
      appliedFilterKind = null;
      zoneIdToNumeric.clear();
    },
  };
}
