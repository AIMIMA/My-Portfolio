import type {
  ActiveGovernorateId,
  Locale,
  MasterPlanMode,
  PartialAppState,
  StageId,
} from '../types/portfolio';

export interface ParsedUrlState extends PartialAppState {
  diveProgress: 0 | 1;
  wasSanitized: boolean;
  langSpecified: boolean;
}

const VALID_STAGES: ReadonlySet<string> = new Set<StageId>([
  'hero',
  'transition',
  'egypt',
  'governorate',
  'project',
]);

/**
 * Parses and safely sanitizes URL query parameters (`?lang=&stage=&gov=&project=&view=`).
 * Guarantees zero exceptions on arbitrary or malformed URLs (EC-12).
 */
export function parseUrlState(
  search: string,
  validGovIds: ReadonlySet<string>,
  validProjectIds: ReadonlyMap<string, string>,
): ParsedUrlState {
  let params: URLSearchParams;
  try {
    const withoutHash = search.split('#')[0] ?? '';
    let queryPart = withoutHash;
    if (/^(?:\/|https?:\/\/)/i.test(withoutHash)) {
      const qIdx = withoutHash.indexOf('?');
      queryPart = qIdx === -1 ? '' : withoutHash.slice(qIdx + 1);
    }
    params = new URLSearchParams(queryPart);
  } catch {
    return {
      locale: 'ar',
      stage: 'hero',
      governorateId: null,
      projectId: null,
      masterPlanMode: '2d',
      diveProgress: 0,
      wasSanitized: true,
      langSpecified: false,
    };
  }

  let wasSanitized = false;

  // 1. Locale resolution
  const rawLang = params.get('lang')?.trim().toLowerCase() ?? '';
  let locale: Locale = 'ar';
  let langSpecified = false;
  if (rawLang === 'ar' || rawLang === 'en') {
    locale = rawLang;
    langSpecified = true;
  } else if (rawLang !== '') {
    wasSanitized = true;
  }

  // 2. Master plan view mode resolution
  const rawView = params.get('view')?.trim().toLowerCase() ?? '';
  let masterPlanMode: MasterPlanMode = '2d';
  if (rawView === '3d' || rawView === '2d') {
    masterPlanMode = rawView;
  } else if (rawView !== '') {
    wasSanitized = true;
  }

  // 3. Spatial state resolution (project -> governorate -> stage)
  const rawStage = params.get('stage')?.trim().toLowerCase() ?? '';
  const rawGov = params.get('gov')?.trim().toLowerCase() ?? '';
  const rawProject = params.get('project')?.trim().toLowerCase() ?? '';

  const isGovValid = rawGov !== '' && validGovIds.has(rawGov);
  const projectParentGov = rawProject !== '' ? validProjectIds.get(rawProject) : undefined;
  const isProjectValid = projectParentGov !== undefined && validGovIds.has(projectParentGov);

  if (rawStage !== '' && !VALID_STAGES.has(rawStage)) {
    wasSanitized = true;
  }

  // Case A: Valid project takes highest spatial precedence
  if (isProjectValid) {
    if (rawGov !== '' && rawGov !== projectParentGov) {
      wasSanitized = true;
    }
    if (rawStage !== '' && rawStage !== 'project') {
      wasSanitized = true;
    }
    return {
      locale,
      stage: 'project',
      governorateId: projectParentGov as ActiveGovernorateId,
      projectId: rawProject,
      masterPlanMode,
      diveProgress: 1,
      wasSanitized,
      langSpecified,
    };
  }

  // Case B: Invalid project was provided
  if (rawProject !== '') {
    wasSanitized = true;
    if (isGovValid) {
      return {
        locale,
        stage: 'governorate',
        governorateId: rawGov as ActiveGovernorateId,
        projectId: null,
        masterPlanMode: '2d',
        diveProgress: 1,
        wasSanitized: true,
        langSpecified,
      };
    }
    return {
      locale,
      stage: 'egypt',
      governorateId: null,
      projectId: null,
      masterPlanMode: '2d',
      diveProgress: 1,
      wasSanitized: true,
      langSpecified,
    };
  }

  // Non-project stages normalize masterPlanMode to '2d'
  const viewDroppedOnNonProject = masterPlanMode === '3d';
  if (viewDroppedOnNonProject) {
    wasSanitized = true;
  }

  // Case C: No project, valid governorate
  if (isGovValid) {
    if (rawStage !== '' && rawStage !== 'governorate') {
      wasSanitized = true;
    }
    return {
      locale,
      stage: 'governorate',
      governorateId: rawGov as ActiveGovernorateId,
      projectId: null,
      masterPlanMode: '2d',
      diveProgress: 1,
      wasSanitized,
      langSpecified,
    };
  }

  // Case D: No project, invalid governorate
  if (rawGov !== '') {
    return {
      locale,
      stage: 'egypt',
      governorateId: null,
      projectId: null,
      masterPlanMode: '2d',
      diveProgress: 1,
      wasSanitized: true,
      langSpecified,
    };
  }

  // Case E: Neither project nor governorate provided
  if (rawStage === 'egypt') {
    return {
      locale,
      stage: 'egypt',
      governorateId: null,
      projectId: null,
      masterPlanMode: '2d',
      diveProgress: 1,
      wasSanitized,
      langSpecified,
    };
  }

  if (rawStage === 'governorate' || rawStage === 'project') {
    return {
      locale,
      stage: 'egypt',
      governorateId: null,
      projectId: null,
      masterPlanMode: '2d',
      diveProgress: 1,
      wasSanitized: true,
      langSpecified,
    };
  }

  if (rawStage === 'transition') {
    return {
      locale,
      stage: 'hero',
      governorateId: null,
      projectId: null,
      masterPlanMode: '2d',
      diveProgress: 0,
      wasSanitized: true,
      langSpecified,
    };
  }

  return {
    locale,
    stage: 'hero',
    governorateId: null,
    projectId: null,
    masterPlanMode: '2d',
    diveProgress: 0,
    wasSanitized,
    langSpecified,
  };
}

/**
 * Serializes canonical application state into a minimal clean query string
 * (`''` for default Arabic hero root, or `'?lang=...&stage=...'`).
 */
export function serializeUrlState(state: PartialAppState): string {
  const { locale, stage, governorateId, projectId, masterPlanMode } = state;

  if (stage === 'hero' || stage === 'transition') {
    return locale === 'ar' ? '' : `?lang=${locale}`;
  }

  const params = new URLSearchParams();
  params.set('lang', locale);

  if (stage === 'project' && projectId && governorateId) {
    params.set('stage', 'project');
    params.set('gov', governorateId);
    params.set('project', projectId);
    params.set('view', masterPlanMode);
    return `?${params.toString()}`;
  }

  if (stage === 'governorate' && governorateId) {
    params.set('stage', 'governorate');
    params.set('gov', governorateId);
    return `?${params.toString()}`;
  }

  params.set('stage', 'egypt');
  return `?${params.toString()}`;
}

/**
 * Resolves a root-relative public asset path (`/assets/...`) against Vite's `BASE_URL`
 * so deployments at `/` and subpath hosts (e.g., `/My-Portfolio/` on GitHub Pages) both work.
 */
export function resolvePublicAssetUrl(
  url: string | null | undefined,
  baseUrl: string = import.meta.env.BASE_URL,
): string | null {
  if (!url) return null;
  if (!url.startsWith('/') || url.startsWith('//')) return url;
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${normalizedBase}${url}`;
}

