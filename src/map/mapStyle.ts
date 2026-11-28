import type { Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';
import {
  EGYPT_GOVERNORATES_GEOJSON,
  EGYPT_HIGHWAYS_GEOJSON,
  EGYPT_LAKE_NASSER_GEOJSON,
  EGYPT_OUTLINE_GEOJSON,
  EGYPT_WATERWAYS_GEOJSON,
} from '../data';
import type { ActiveGovernorateId } from '../types/portfolio';

const OPENFREEMAP_PLANET_URL = 'https://tiles.openfreemap.org/planet';

/**
 * Builds a complete self-contained offline-first MapLibre StyleSpecification
 * with zero external tile, sprite, or glyph network dependencies at boot.
 */
export function createOfflineEgyptStyle(): StyleSpecification {
  return {
    version: 8,
    name: 'Atelier Limestone Egypt Vector',
    sources: {
      'egypt-land': {
        type: 'geojson',
        data: EGYPT_OUTLINE_GEOJSON,
        maxzoom: 8,
      },
      'egypt-governorates': {
        type: 'geojson',
        data: EGYPT_GOVERNORATES_GEOJSON,
        maxzoom: 8,
      },
      'egypt-lake-nasser': {
        type: 'geojson',
        data: EGYPT_LAKE_NASSER_GEOJSON,
        maxzoom: 8,
      },
      'egypt-waterways': {
        type: 'geojson',
        data: EGYPT_WATERWAYS_GEOJSON,
        maxzoom: 8,
      },
      'egypt-highways': {
        type: 'geojson',
        data: EGYPT_HIGHWAYS_GEOJSON,
        maxzoom: 8,
      },
    },
    layers: [
      {
        id: 'sea-background',
        type: 'background',
        paint: {
          'background-color': '#12262e',
        },
      },
      {
        id: 'egypt-land-fill',
        type: 'fill',
        source: 'egypt-land',
        paint: {
          'fill-color': '#211d18',
          'fill-opacity': 1,
        },
      },
      {
        id: 'egypt-gov-fill',
        type: 'fill',
        source: 'egypt-governorates',
        maxzoom: 14,
        paint: {
          'fill-color': [
            'case',
            ['boolean', ['get', 'isFlagship'], false],
            '#362d20',
            ['boolean', ['get', 'active'], false],
            '#2b241b',
            '#1e1a15',
          ],
          'fill-opacity': [
            'case',
            ['boolean', ['get', 'active'], false],
            0.88,
            0.55,
          ],
        },
      },
      {
        id: 'egypt-lake-nasser-fill',
        type: 'fill',
        source: 'egypt-lake-nasser',
        paint: {
          'fill-color': '#1a4a58',
          'fill-opacity': 0.92,
        },
      },
      {
        id: 'egypt-waterways-glow',
        type: 'line',
        source: 'egypt-waterways',
        paint: {
          'line-color': '#2b6e7d',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            5,
            3.5,
            10,
            7,
          ],
          'line-opacity': 0.85,
        },
      },
      {
        id: 'egypt-waterways-filament',
        type: 'line',
        source: 'egypt-waterways',
        paint: {
          'line-color': '#cf9d4f',
          'line-width': 1.2,
          'line-opacity': 0.55,
        },
      },
      {
        id: 'egypt-highways-line',
        type: 'line',
        source: 'egypt-highways',
        paint: {
          'line-color': '#6e5d45',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            5,
            1.1,
            11,
            2.6,
          ],
          'line-dasharray': [3, 2],
          'line-opacity': 0.65,
        },
      },
      {
        id: 'egypt-gov-outline',
        type: 'line',
        source: 'egypt-governorates',
        paint: {
          'line-color': [
            'case',
            ['boolean', ['get', 'isFlagship'], false],
            '#e3b566',
            ['boolean', ['get', 'active'], false],
            '#cf9d4f',
            '#6c6050',
          ],
          'line-width': [
            'case',
            ['boolean', ['get', 'isFlagship'], false],
            2.0,
            ['boolean', ['get', 'active'], false],
            1.35,
            0.65,
          ],
          'line-opacity': [
            'case',
            ['boolean', ['get', 'active'], false],
            0.78,
            0.32,
          ],
        },
      },
      {
        id: 'egypt-coastline-outline',
        type: 'line',
        source: 'egypt-land',
        paint: {
          'line-color': '#d8b477',
          'line-width': 1.4,
          'line-opacity': 0.55,
        },
      },
    ],
  };
}

const lastFocusedGovByMap = new WeakMap<MapLibreMap, ActiveGovernorateId | null>();

/**
 * Updates governorate polygon highlight & outsider dimming when focusing a corridor.
 */
export function applyGovernorateFocusStyle(
  map: MapLibreMap,
  focusedGovId: ActiveGovernorateId | null,
): void {
  if (!map.getLayer('egypt-gov-fill') || !map.getLayer('egypt-gov-outline')) return;
  if (lastFocusedGovByMap.has(map) && lastFocusedGovByMap.get(map) === focusedGovId) {
    return;
  }
  lastFocusedGovByMap.set(map, focusedGovId);

  if (!focusedGovId) {
    map.setPaintProperty('egypt-gov-fill', 'fill-opacity', [
      'case',
      ['boolean', ['get', 'active'], false],
      0.88,
      0.55,
    ]);
    map.setPaintProperty('egypt-gov-outline', 'line-width', [
      'case',
      ['boolean', ['get', 'isFlagship'], false],
      2.0,
      ['boolean', ['get', 'active'], false],
      1.35,
      0.65,
    ]);
    return;
  }

  map.setPaintProperty('egypt-gov-fill', 'fill-opacity', [
    'case',
    ['==', ['get', 'id'], focusedGovId],
    0.95,
    0.32,
  ]);
  map.setPaintProperty('egypt-gov-outline', 'line-width', [
    'case',
    ['==', ['get', 'id'], focusedGovId],
    2.8,
    0.7,
  ]);
}

/**
 * Silently probes OpenFreeMap vector TileJSON when online and injects dark architectural
 * street & building context underneath the portfolio layers without console noise offline.
 */
export async function probeAndEnhanceOnlineStyle(
  map: MapLibreMap,
  isDisposed: () => boolean,
  onEnhanced: () => void,
): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return;
  }

  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), 2200);

  try {
    const res = await fetch(OPENFREEMAP_PLANET_URL, {
      method: 'GET',
      signal: controller.signal,
    });
    if (!res.ok || isDisposed()) return;

    const tileJson = (await res.json()) as { tiles?: unknown };
    if (
      isDisposed() ||
      !Array.isArray(tileJson.tiles) ||
      tileJson.tiles.length === 0 ||
      typeof tileJson.tiles[0] !== 'string'
    ) {
      return;
    }

    if (map.getSource('openfreemap')) return;

    map.addSource('openfreemap', {
      type: 'vector',
      tiles: tileJson.tiles as string[],
      maxzoom: 14,
    });

    const beforeLayer = map.getLayer('egypt-gov-outline') ? 'egypt-gov-outline' : undefined;

    map.addLayer(
      {
        id: 'ofm-water',
        type: 'fill',
        source: 'openfreemap',
        'source-layer': 'water',
        paint: {
          'fill-color': '#153440',
          'fill-opacity': 0.85,
        },
      },
      beforeLayer,
    );

    map.addLayer(
      {
        id: 'ofm-roads',
        type: 'line',
        source: 'openfreemap',
        'source-layer': 'transportation',
        minzoom: 9,
        paint: {
          'line-color': '#494136',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            9,
            0.6,
            15,
            2.5,
          ],
          'line-opacity': 0.6,
        },
      },
      beforeLayer,
    );

    map.addLayer(
      {
        id: 'ofm-buildings',
        type: 'fill',
        source: 'openfreemap',
        'source-layer': 'building',
        minzoom: 13,
        paint: {
          'fill-color': '#2b2620',
          'fill-opacity': 0.5,
        },
      },
      beforeLayer,
    );

    onEnhanced();
  } catch {
    // Silent offline-first fallback: keep bundled vector style with zero console errors
  } finally {
    globalThis.clearTimeout(timer);
  }
}
