import { ACTIVE_GOVERNORATES } from '../data/governorates';
import type {
  FilterState,
  Governorate,
  RealEstateProject,
} from '../types/portfolio';

export interface SearchCatalogResult {
  isEmptyQuery: boolean;
  governorates: Governorate[];
  projects: RealEstateProject[];
}

const ARABIC_DIACRITICS_AND_TATWEEL_RE = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;

/**
 * Normalizes Arabic and Latin text for forgiving bilingual search:
 * - Converts Arabic-Indic (٠-٩) & Extended Arabic-Indic (۰-۹) digits to ASCII 0-9
 * - Strips Arabic tashkeel/diacritics & tatweel
 * - Normalizes Alef variants [أإآٱ] -> ا, Teh Marbuta ة -> ه, Alef Maksura ى -> ي, ؤ -> و, ئ -> ي
 * - Collapses whitespace, trims, and lowercases
 */
export function normalizeArabic(input: string): string {
  if (!input) return '';

  let out = '';
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    if (code >= 0x0660 && code <= 0x0669) {
      out += String.fromCharCode(code - 0x0660 + 0x30);
    } else if (code >= 0x06f0 && code <= 0x06f9) {
      out += String.fromCharCode(code - 0x06f0 + 0x30);
    } else {
      out += input[i] ?? '';
    }
  }

  return out
    .replace(ARABIC_DIACRITICS_AND_TATWEEL_RE, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function buildGovernorateMap(
  governorates: readonly Governorate[],
): ReadonlyMap<string, Governorate> {
  return new Map(governorates.map((g) => [g.id, g]));
}

function buildProjectHaystack(
  project: RealEstateProject,
  govMap: ReadonlyMap<string, Governorate>,
): string {
  const gov = govMap.get(project.governorateId);
  const parts: string[] = [
    project.id,
    project.name.ar,
    project.name.en,
    project.developer.ar,
    project.developer.en,
    project.district.ar,
    project.district.en,
  ];
  if (gov) {
    parts.push(gov.id, gov.name.ar, gov.name.en, gov.shortName.ar, gov.shortName.en);
  }
  return normalizeArabic(parts.join(' '));
}

function matchesAllTokens(haystack: string, tokens: readonly string[]): boolean {
  for (const token of tokens) {
    if (!haystack.includes(token)) {
      return false;
    }
  }
  return true;
}

/**
 * Non-mutatively filters developments across governorate, unit category,
 * delivery status, developer, and normalized bilingual text query.
 */
export function filterProjects(
  projects: readonly RealEstateProject[],
  filters: FilterState,
  governorates: readonly Governorate[] = ACTIVE_GOVERNORATES,
): RealEstateProject[] {
  const normalizedQuery = normalizeArabic(filters.query);
  const tokens = normalizedQuery ? normalizedQuery.split(' ') : [];
  const normalizedDev = filters.developer ? normalizeArabic(filters.developer) : '';
  const govMap = buildGovernorateMap(governorates);

  return projects.filter((project) => {
    if (filters.governorateId !== null && project.governorateId !== filters.governorateId) {
      return false;
    }
    if (
      filters.unitCategory !== null &&
      !project.unitCategories.includes(filters.unitCategory)
    ) {
      return false;
    }
    if (filters.status !== null && project.status !== filters.status) {
      return false;
    }
    if (normalizedDev) {
      const devEn = normalizeArabic(project.developer.en);
      const devAr = normalizeArabic(project.developer.ar);
      if (devEn !== normalizedDev && devAr !== normalizedDev) {
        return false;
      }
    }
    if (tokens.length > 0) {
      const haystack = buildProjectHaystack(project, govMap);
      if (!matchesAllTokens(haystack, tokens)) {
        return false;
      }
    }
    return true;
  });
}

function scoreProjectMatch(
  project: RealEstateProject,
  normalizedQuery: string,
  tokens: readonly string[],
  govMap: ReadonlyMap<string, Governorate>,
): number {
  const nameAr = normalizeArabic(project.name.ar);
  const nameEn = normalizeArabic(project.name.en);
  const devDistrict = normalizeArabic(
    `${project.developer.ar} ${project.developer.en} ${project.district.ar} ${project.district.en}`,
  );
  const gov = govMap.get(project.governorateId);
  const govText = gov
    ? normalizeArabic(`${gov.name.ar} ${gov.name.en} ${gov.shortName.ar} ${gov.shortName.en}`)
    : '';

  if (nameAr === normalizedQuery || nameEn === normalizedQuery) return 100;
  if (nameAr.startsWith(normalizedQuery) || nameEn.startsWith(normalizedQuery)) return 90;
  if (nameAr.includes(normalizedQuery) || nameEn.includes(normalizedQuery)) return 80;
  if (matchesAllTokens(`${nameAr} ${nameEn}`, tokens)) return 75;
  if (matchesAllTokens(devDistrict, tokens)) return 60;
  if (govText && matchesAllTokens(govText, tokens)) return 40;
  return 20;
}

/**
 * Instant bilingual catalog search across governorates and developments with relevance ranking.
 */
export function searchCatalog(
  query: string,
  projects: readonly RealEstateProject[],
  governorates: readonly Governorate[] = ACTIVE_GOVERNORATES,
): SearchCatalogResult {
  const normalizedQuery = normalizeArabic(query);
  if (!normalizedQuery) {
    return {
      isEmptyQuery: true,
      governorates: [...governorates],
      projects: projects.filter((p) => p.featured).slice(0, 6),
    };
  }

  const tokens = normalizedQuery.split(' ');
  const govMap = buildGovernorateMap(governorates);

  const matchedGovernorates = governorates.filter((gov) => {
    const govHaystack = normalizeArabic(
      `${gov.id} ${gov.name.ar} ${gov.name.en} ${gov.shortName.ar} ${gov.shortName.en} ${gov.tagline.ar} ${gov.tagline.en}`,
    );
    return matchesAllTokens(govHaystack, tokens);
  });

  const matchedProjects = projects
    .filter((project) => matchesAllTokens(buildProjectHaystack(project, govMap), tokens))
    .map((project) => ({
      project,
      score: scoreProjectMatch(project, normalizedQuery, tokens, govMap),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const featuredDelta = (b.project.featured ? 1 : 0) - (a.project.featured ? 1 : 0);
      if (featuredDelta !== 0) return featuredDelta;
      return a.project.name.en.localeCompare(b.project.name.en);
    })
    .map((entry) => entry.project);

  return {
    isEmptyQuery: false,
    governorates: matchedGovernorates,
    projects: matchedProjects,
  };
}
