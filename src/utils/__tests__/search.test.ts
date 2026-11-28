import { describe, expect, it } from 'vitest';
import { ACTIVE_GOVERNORATES, PROJECTS } from '../../data';
import type { FilterState } from '../../types/portfolio';
import { filterProjects, normalizeArabic, searchCatalog } from '../search';

const EMPTY_FILTERS: FilterState = {
  query: '',
  governorateId: null,
  unitCategory: null,
  status: null,
  developer: null,
};

describe('Arabic Normalization, Multi-Facet Filtering & Catalog Search', () => {
  it('normalizes Alef variants, Teh Marbuta, Alef Maksura, Hamza seats, tashkeel, tatweel, and Arabic-Indic digits', () => {
    const alexVariants = ['إسكندرية', 'أسكندرية', 'آسكندريه', 'اسكندرية', 'إِسْكَنْدَرِيَّة'];
    const expectedAlex = normalizeArabic('اسكندريه');
    for (const variant of alexVariants) {
      expect(normalizeArabic(variant)).toBe(expectedAlex);
    }

    expect(normalizeArabic('الإسكندرية')).toBe(normalizeArabic('الاسكندرية'));
    expect(normalizeArabic('صوارى')).toBe(normalizeArabic('صواري'));
    expect(normalizeArabic('صــــواري')).toBe(normalizeArabic('صواري'));
    expect(normalizeArabic('٦ أكتوبر')).toBe('6 اكتوبر');
    expect(normalizeArabic('مُؤَسَّسَةُ الرَّئِيس')).toBe('موسسه الرييس');
    expect(normalizeArabic('  PALM   Hills  Alex  ')).toBe('palm hills alex');
  });

  it('returns featured suggestions on empty search query and ranked results on bilingual queries', () => {
    const emptyRes = searchCatalog('   ', PROJECTS, ACTIVE_GOVERNORATES);
    expect(emptyRes.isEmptyQuery).toBe(true);
    expect(emptyRes.governorates).toHaveLength(6);
    expect(emptyRes.projects.length).toBeGreaterThan(0);
    expect(emptyRes.projects.length).toBeLessThanOrEqual(6);

    // Sawary Arabic Alef Maksura & English ranking #1
    const arSawary = searchCatalog('صوارى', PROJECTS, ACTIVE_GOVERNORATES);
    expect(arSawary.isEmptyQuery).toBe(false);
    expect(arSawary.projects[0]?.id).toBe('sawary');

    const enSawary = searchCatalog('SAWARY', PROJECTS, ACTIVE_GOVERNORATES);
    expect(enSawary.projects[0]?.id).toBe('sawary');

    // Alexandria normalized Arabic matches governorate + all 8 Alexandria projects
    const alexSearch = searchCatalog('اسكندرية', PROJECTS, ACTIVE_GOVERNORATES);
    expect(alexSearch.governorates.some((g) => g.id === 'alexandria')).toBe(true);
    const alexProjects = alexSearch.projects.filter((p) => p.governorateId === 'alexandria');
    expect(alexProjects).toHaveLength(8);

    // Multi-token AND match across name & location
    const multiToken = searchCatalog('palm alex', PROJECTS, ACTIVE_GOVERNORATES);
    expect(multiToken.projects.map((p) => p.id)).toContain('palm-hills-alex');
    expect(multiToken.projects.map((p) => p.id)).not.toContain('hacienda-waters');

    // Unmatched query
    const none = searchCatalog('atlantis-mars-999', PROJECTS, ACTIVE_GOVERNORATES);
    expect(none.governorates).toHaveLength(0);
    expect(none.projects).toHaveLength(0);
  });

  it('filters projects non-mutatively by governorate, unitCategory, status, developer, and query including EC-05 zero-match', () => {
    const snapshot = [...PROJECTS];

    // No filters -> all 22
    const all = filterProjects(PROJECTS, EMPTY_FILTERS);
    expect(all).toHaveLength(22);

    // Alexandria only -> 8
    const alex = filterProjects(PROJECTS, { ...EMPTY_FILTERS, governorateId: 'alexandria' });
    expect(alex).toHaveLength(8);

    // Developer filter (Orascom Development: O West, El Gouna, Makadi Heights)
    const orascom = filterProjects(PROJECTS, {
      ...EMPTY_FILTERS,
      developer: 'Orascom Development',
    });
    expect(orascom.map((p) => p.id).sort()).toEqual(['el-gouna', 'makadi-heights', 'o-west']);

    // Category + status combined
    const alexReadyApts = filterProjects(PROJECTS, {
      ...EMPTY_FILTERS,
      governorateId: 'alexandria',
      unitCategory: 'apartment',
      status: 'ready_to_move',
    });
    expect(alexReadyApts.map((p) => p.id).sort()).toEqual([
      'antoniadis-alex',
      'san-stefano',
      'valore-smouha',
    ]);

    // EC-05 Canonical Zero-Match: Suez + commercial + new_launch => []
    const ec05 = filterProjects(PROJECTS, {
      ...EMPTY_FILTERS,
      governorateId: 'suez',
      unitCategory: 'commercial',
      status: 'new_launch',
    });
    expect(ec05).toEqual([]);

    // Normalized Arabic query combined with governorate facet
    const alexSawaryQuery = filterProjects(PROJECTS, {
      ...EMPTY_FILTERS,
      governorateId: 'alexandria',
      query: 'صوارى',
    });
    expect(alexSawaryQuery.map((p) => p.id)).toEqual(['sawary']);

    // Input array untouched
    expect(PROJECTS).toEqual(snapshot);
  });
});
