import type { Map as MapLibreMap } from 'maplibre-gl';
import { ZONE_KIND_META } from '../data';
import type { ZoneKind } from '../types/portfolio';

const PATTERN_SIZE = 16;

function buildRgbaPattern(
  drawPixel: (x: number, y: number) => boolean,
  alpha = 72,
): { width: number; height: number; data: Uint8Array } {
  const data = new Uint8Array(PATTERN_SIZE * PATTERN_SIZE * 4);
  for (let y = 0; y < PATTERN_SIZE; y++) {
    for (let x = 0; x < PATTERN_SIZE; x++) {
      const idx = (y * PATTERN_SIZE + x) * 4;
      if (drawPixel(x, y)) {
        data[idx] = 245;
        data[idx + 1] = 232;
        data[idx + 2] = 208;
        data[idx + 3] = alpha;
      }
    }
  }
  return { width: PATTERN_SIZE, height: PATTERN_SIZE, data };
}

const KIND_DRAWERS: Record<ZoneKind, (x: number, y: number) => boolean> = {
  residential_villas: (x, y) => (x + y) % 8 === 0,
  residential_apartments: (x, y) => (x - y + 16) % 6 === 0,
  waterfront_lagoon: (x, y) => y % 6 === 0 && x % 4 !== 0,
  commercial_promenade: (x, y) => x % 8 === 0 || y % 8 === 0,
  clubhouse_hospitality: (x, y) => (x + y) % 8 === 0 || (x - y + 16) % 8 === 0,
  green_park_spine: (x, y) => x % 5 === 1 && y % 5 === 1,
  main_gate_access: (_x, y) => y % 4 === 0,
  education_medical: (x, _y) => x % 6 === 0,
};

/**
 * Registers procedural architectural CAD hatch patterns onto a MapLibre instance
 * with zero external sprite image fetches.
 */
export function registerCadHatchPatterns(map: MapLibreMap): void {
  const kinds = Object.keys(ZONE_KIND_META) as ZoneKind[];
  for (const kind of kinds) {
    const patternId = ZONE_KIND_META[kind].patternId;
    if (!map.hasImage(patternId)) {
      const img = buildRgbaPattern(KIND_DRAWERS[kind]);
      map.addImage(patternId, img);
    }
  }
}
