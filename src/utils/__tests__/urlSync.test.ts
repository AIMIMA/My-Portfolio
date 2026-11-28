import { describe, expect, it } from 'vitest';
import { ACTIVE_GOVERNORATE_ID_SET, PROJECT_TO_GOV_MAP } from '../../data';
import type { PartialAppState } from '../../types/portfolio';
import { parseUrlState, serializeUrlState } from '../urlSync';

describe('URL Deep-Linking Parser, Sanitizer & Round-Trip Serializer', () => {
  it('safely sanitizes EC-12 malformed URL without throwing', () => {
    const parsed = parseUrlState(
      '?stage=project&gov=mars&project=nonexistent&lang=fr',
      ACTIVE_GOVERNORATE_ID_SET,
      PROJECT_TO_GOV_MAP,
    );

    expect(parsed).toEqual({
      locale: 'ar',
      stage: 'egypt',
      governorateId: null,
      projectId: null,
      masterPlanMode: '2d',
      diveProgress: 1,
      wasSanitized: true,
      langSpecified: false,
    });
  });

  it('reconciles mismatched governorate against true project parent governorate', () => {
    const parsed = parseUrlState(
      '?gov=cairo&project=sawary',
      ACTIVE_GOVERNORATE_ID_SET,
      PROJECT_TO_GOV_MAP,
    );

    expect(parsed.stage).toBe('project');
    expect(parsed.governorateId).toBe('alexandria');
    expect(parsed.projectId).toBe('sawary');
    expect(parsed.diveProgress).toBe(1);
    expect(parsed.wasSanitized).toBe(true);
  });

  it('falls back to valid governorate when project ID is invalid', () => {
    const parsed = parseUrlState(
      '?gov=alexandria&project=does-not-exist',
      ACTIVE_GOVERNORATE_ID_SET,
      PROJECT_TO_GOV_MAP,
    );

    expect(parsed.stage).toBe('governorate');
    expect(parsed.governorateId).toBe('alexandria');
    expect(parsed.projectId).toBeNull();
    expect(parsed.masterPlanMode).toBe('2d');
    expect(parsed.wasSanitized).toBe(true);
  });

  it('preserves clean valid deep links with wasSanitized = false', () => {
    const parsed = parseUrlState(
      '?gov=alexandria&project=san-stefano&lang=en',
      ACTIVE_GOVERNORATE_ID_SET,
      PROJECT_TO_GOV_MAP,
    );

    expect(parsed).toEqual({
      locale: 'en',
      stage: 'project',
      governorateId: 'alexandria',
      projectId: 'san-stefano',
      masterPlanMode: '2d',
      diveProgress: 1,
      wasSanitized: false,
      langSpecified: true,
    });

    const parsed3d = parseUrlState(
      '?lang=ar&stage=project&gov=red-sea&project=el-gouna&view=3d',
      ACTIVE_GOVERNORATE_ID_SET,
      PROJECT_TO_GOV_MAP,
    );
    expect(parsed3d.masterPlanMode).toBe('3d');
    expect(parsed3d.wasSanitized).toBe(false);
    expect(parsed3d.langSpecified).toBe(true);
  });

  it('sanitizes invalid view mode and unknown stage safely', () => {
    const badView = parseUrlState(
      '?gov=alexandria&project=sawary&view=isometric',
      ACTIVE_GOVERNORATE_ID_SET,
      PROJECT_TO_GOV_MAP,
    );
    expect(badView.masterPlanMode).toBe('2d');
    expect(badView.wasSanitized).toBe(true);

    const badStage = parseUrlState(
      '?stage=warp',
      ACTIVE_GOVERNORATE_ID_SET,
      PROJECT_TO_GOV_MAP,
    );
    expect(badStage.stage).toBe('hero');
    expect(badStage.diveProgress).toBe(0);
    expect(badStage.wasSanitized).toBe(true);
  });

  it('handles leading path/origin prefixes, hash fragments, and normalizes view=3d on non-project stages', () => {
    const pathGov = parseUrlState(
      '/?gov=alexandria',
      ACTIVE_GOVERNORATE_ID_SET,
      PROJECT_TO_GOV_MAP,
    );
    expect(pathGov.stage).toBe('governorate');
    expect(pathGov.governorateId).toBe('alexandria');
    expect(pathGov.wasSanitized).toBe(false);

    const pathEgypt = parseUrlState(
      '/?stage=egypt',
      ACTIVE_GOVERNORATE_ID_SET,
      PROJECT_TO_GOV_MAP,
    );
    expect(pathEgypt.stage).toBe('egypt');
    expect(pathEgypt.diveProgress).toBe(1);
    expect(pathEgypt.wasSanitized).toBe(false);

    const withHash = parseUrlState(
      '?gov=alexandria#top',
      ACTIVE_GOVERNORATE_ID_SET,
      PROJECT_TO_GOV_MAP,
    );
    expect(withHash.stage).toBe('governorate');
    expect(withHash.governorateId).toBe('alexandria');
    expect(withHash.wasSanitized).toBe(false);

    const nonProject3d = parseUrlState(
      '?stage=egypt&view=3d',
      ACTIVE_GOVERNORATE_ID_SET,
      PROJECT_TO_GOV_MAP,
    );
    expect(nonProject3d.stage).toBe('egypt');
    expect(nonProject3d.masterPlanMode).toBe('2d');
    expect(nonProject3d.wasSanitized).toBe(true);
  });

  it('satisfies exact parseUrlState(serializeUrlState(state)) round-trip across all canonical stages', () => {
    const canonicalStates: PartialAppState[] = [
      {
        locale: 'ar',
        stage: 'hero',
        governorateId: null,
        projectId: null,
        masterPlanMode: '2d',
      },
      {
        locale: 'en',
        stage: 'hero',
        governorateId: null,
        projectId: null,
        masterPlanMode: '2d',
      },
      {
        locale: 'ar',
        stage: 'egypt',
        governorateId: null,
        projectId: null,
        masterPlanMode: '2d',
      },
      {
        locale: 'en',
        stage: 'governorate',
        governorateId: 'alexandria',
        projectId: null,
        masterPlanMode: '2d',
      },
      {
        locale: 'ar',
        stage: 'project',
        governorateId: 'alexandria',
        projectId: 'sawary',
        masterPlanMode: '2d',
      },
      {
        locale: 'en',
        stage: 'project',
        governorateId: 'matrouh',
        projectId: 'marassi',
        masterPlanMode: '3d',
      },
    ];

    expect(serializeUrlState(canonicalStates[0]!)).toBe('');
    expect(serializeUrlState(canonicalStates[1]!)).toBe('?lang=en');

    for (const state of canonicalStates) {
      const qs = serializeUrlState(state);
      const parsed = parseUrlState(qs, ACTIVE_GOVERNORATE_ID_SET, PROJECT_TO_GOV_MAP);
      expect({
        locale: parsed.locale,
        stage: parsed.stage,
        governorateId: parsed.governorateId,
        projectId: parsed.projectId,
        masterPlanMode: parsed.masterPlanMode,
      }).toEqual(state);
      expect(parsed.wasSanitized).toBe(false);
    }
  });

  it('resolves public asset URLs identically at root "/" and under subpath bases like "/My-Portfolio/"', async () => {
    const { resolvePublicAssetUrl } = await import('../urlSync');
    expect(resolvePublicAssetUrl('/assets/consultant/hero-leaning.png', '/')).toBe(
      '/assets/consultant/hero-leaning.png',
    );
    expect(resolvePublicAssetUrl('/assets/consultant/hero-leaning.png', '/My-Portfolio/')).toBe(
      '/My-Portfolio/assets/consultant/hero-leaning.png',
    );
    expect(resolvePublicAssetUrl('https://cdn.example.com/photo.webp', '/My-Portfolio/')).toBe(
      'https://cdn.example.com/photo.webp',
    );
    expect(resolvePublicAssetUrl(null, '/My-Portfolio/')).toBeNull();
  });
});
