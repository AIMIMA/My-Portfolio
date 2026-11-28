import { describe, expect, it } from 'vitest';
import { createOfflineEgyptStyle } from '../mapStyle';
import { masterPlanToGeoJSON } from '../../utils/mercator';
import { PROJECT_BY_ID } from '../../data';

describe('offline-first MapLibre style & Master Plan GeoJSON layers', () => {
  it('builds a self-contained v8 StyleSpecification with zero external glyph/sprite URLs', () => {
    const style = createOfflineEgyptStyle();
    expect(style.version).toBe(8);
    expect(style.glyphs).toBeUndefined();
    expect(style.sprite).toBeUndefined();
    expect(Object.keys(style.sources)).toEqual([
      'egypt-land',
      'egypt-governorates',
      'egypt-lake-nasser',
      'egypt-waterways',
      'egypt-highways',
    ]);
    expect(style.layers.length).toBeGreaterThanOrEqual(7);
  });

  it('produces numeric top-level feature IDs and scaled 3D visualHeight for Sawary Master Plan', () => {
    const sawary = PROJECT_BY_ID.get('sawary');
    expect(sawary).toBeDefined();
    if (!sawary) return;

    const fc = masterPlanToGeoJSON(sawary);
    const zoneFeatures = fc.features.filter((f) => f.properties.featureType === 'zone');
    expect(zoneFeatures.length).toBe(sawary.masterPlan.zones.length);
    for (const feat of zoneFeatures) {
      expect(typeof feat.id).toBe('number');
      expect(Number(feat.id)).toBeGreaterThan(0);
    }
  });
});
