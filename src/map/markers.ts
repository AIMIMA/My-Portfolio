import { Marker } from 'maplibre-gl';
import type { Map as MapLibreMap } from 'maplibre-gl';
import {
  ACTIVE_GOVERNORATES,
  CONTEXTUAL_GOVERNORATES,
  PROJECTS,
} from '../data';
import { getTranslations, localize } from '../i18n/translations';
import type { MasterPlanZoneFeatureProperties } from '../types/geo';
import type {
  ActiveGovernorateId,
  ContextualGovernorateId,
  Locale,
  RealEstateProject,
  StageId,
  ZoneKind,
} from '../types/portfolio';
import { masterPlanToGeoJSON } from '../utils/mercator';

const FEATURED_CONTEXTUAL_GOV_IDS: ReadonlySet<ContextualGovernorateId> = new Set([
  'aswan',
  'luxor',
  'port-said',
  'south-sinai',
  'assiut',
  'new-valley',
]);

export interface MarkerSyncState {
  locale: Locale;
  stage: StageId;
  activeGovernorateId: ActiveGovernorateId | null;
  activeProject: RealEstateProject | null;
  highlightedProjectId: string | null;
  visibleProjectIds: ReadonlySet<string>;
  selectedZoneId: string | null;
  activeZoneFilter: ZoneKind | null;
}

export interface MarkerCallbacks {
  onSelectGovernorate: (govId: ActiveGovernorateId) => void;
  onSelectContextualGovernorate: (govId: ContextualGovernorateId) => void;
  onSelectProject: (projectId: string) => void;
  onHoverProject: (projectId: string | null) => void;
  onSelectZone: (zoneId: string) => void;
}

export interface MapMarkerManager {
  sync: (state: MarkerSyncState) => void;
  destroy: () => void;
}

export function createMapMarkerManager(
  map: MapLibreMap,
  callbacks: MarkerCallbacks,
): MapMarkerManager {
  const govMarkers = new Map<string, { marker: Marker; el: HTMLButtonElement; active: boolean }>();
  const projectMarkers = new Map<string, { marker: Marker; el: HTMLButtonElement; project: RealEstateProject }>();
  let zoneMarkers: Array<{ marker: Marker; el: HTMLButtonElement; zoneId: string; kind: ZoneKind; code: string; nameAr: string; nameEn: string }> = [];
  let mountedZoneProjectId: string | null = null;

  const GOV_ANCHOR_CONFIG: Record<
    ActiveGovernorateId,
    { anchor: 'center' | 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'; offset: [number, number] }
  > = {
    alexandria: { anchor: 'bottom-left', offset: [6, -10] },
    matrouh: { anchor: 'bottom-right', offset: [-6, -8] },
    cairo: { anchor: 'bottom-left', offset: [8, -6] },
    giza: { anchor: 'top-right', offset: [-8, 6] },
    suez: { anchor: 'top-left', offset: [10, 8] },
    'red-sea': { anchor: 'center', offset: [0, 0] },
  };

  // 1. Active Governorate Markers
  for (const gov of ACTIVE_GOVERNORATES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = `gov-marker-${gov.id}`;
    btn.className = gov.isFlagship
      ? 'map-gov-marker map-gov-marker--flagship'
      : 'map-gov-marker';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      callbacks.onSelectGovernorate(gov.id);
    });

    const cfg = GOV_ANCHOR_CONFIG[gov.id];
    const marker = new Marker({
      element: btn,
      anchor: cfg.anchor,
      offset: cfg.offset,
    })
      .setLngLat([gov.center.lng, gov.center.lat])
      .addTo(map);

    govMarkers.set(gov.id, { marker, el: btn, active: true });
  }

  // 2. Contextual Non-Active Governorate Markers (for EC-04 polite toast)
  for (const cGov of CONTEXTUAL_GOVERNORATES) {
    if (!FEATURED_CONTEXTUAL_GOV_IDS.has(cGov.id)) continue;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = `gov-marker-${cGov.id}`;
    btn.className = 'map-gov-marker map-gov-marker--contextual';
    btn.dataset.activeGov = 'false';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      callbacks.onSelectContextualGovernorate(cGov.id);
    });

    const marker = new Marker({ element: btn, anchor: 'center' })
      .setLngLat([cGov.center.lng, cGov.center.lat])
      .addTo(map);

    govMarkers.set(cGov.id, { marker, el: btn, active: false });
  }

  // 3. Real-Coordinate Project Beacons (all 22 verified developments)
  for (const project of PROJECTS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = `map-pin-${project.id}`;
    btn.className = 'map-project-pin';
    btn.dataset.projectId = project.id;
    btn.dataset.highlighted = 'false';
    btn.dataset.active = 'false';
    btn.dataset.filteredOut = 'false';

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      callbacks.onSelectProject(project.id);
    });
    btn.addEventListener('mouseenter', () => {
      callbacks.onHoverProject(project.id);
    });
    btn.addEventListener('mouseleave', () => {
      callbacks.onHoverProject(null);
    });
    btn.addEventListener('focus', () => {
      callbacks.onHoverProject(project.id);
    });
    btn.addEventListener('blur', () => {
      callbacks.onHoverProject(null);
    });

    const marker = new Marker({ element: btn, anchor: 'bottom' })
      .setLngLat([project.coordinates.lng, project.coordinates.lat])
      .addTo(map);

    projectMarkers.set(project.id, { marker, el: btn, project });
  }

  const clearZoneMarkers = (): void => {
    for (const zm of zoneMarkers) {
      zm.marker.remove();
    }
    zoneMarkers = [];
    mountedZoneProjectId = null;
  };

  const mountZoneMarkersForProject = (project: RealEstateProject): void => {
    clearZoneMarkers();
    const fc = masterPlanToGeoJSON(project);
    for (const feat of fc.features) {
      if (feat.properties.featureType !== 'zone') continue;
      const props = feat.properties as MasterPlanZoneFeatureProperties;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.id = `masterplan-zone-btn-${props.zoneId}`;
      btn.className = 'mp-zone-marker-btn';
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        callbacks.onSelectZone(props.zoneId);
      });

      const marker = new Marker({ element: btn, anchor: 'center' })
        .setLngLat([props.centroidLng, props.centroidLat])
        .addTo(map);

      zoneMarkers.push({
        marker,
        el: btn,
        zoneId: props.zoneId,
        kind: props.kind,
        code: props.code,
        nameAr: props.nameAr,
        nameEn: props.nameEn,
      });
    }
    mountedZoneProjectId = project.id;
  };

  return {
    sync: (state: MarkerSyncState) => {
      const t = getTranslations(state.locale);
      const textDir = state.locale === 'ar' ? 'rtl' : 'ltr';
      const isProjectStage = state.stage === 'project';
      const isGovStage = state.stage === 'governorate';

      // Sync governorate markers
      for (const gov of ACTIVE_GOVERNORATES) {
        const entry = govMarkers.get(gov.id);
        if (!entry) continue;
        const hide = isProjectStage || (isGovStage && state.activeGovernorateId === gov.id);
        entry.el.dir = textDir;
        entry.el.hidden = hide;
        entry.el.style.display = hide ? 'none' : 'inline-flex';
        entry.el.setAttribute('aria-hidden', hide ? 'true' : 'false');
        const label = localize(gov.shortName, state.locale);
        entry.el.setAttribute('aria-label', `${t.a11y.governoratePinAria} ${label} (${gov.projectCount})`);
        entry.el.textContent = `${label} · ${gov.projectCount}`;
      }

      for (const cGov of CONTEXTUAL_GOVERNORATES) {
        const entry = govMarkers.get(cGov.id);
        if (!entry) continue;
        const hide = state.stage !== 'egypt';
        entry.el.dir = textDir;
        entry.el.hidden = hide;
        entry.el.style.display = hide ? 'none' : 'inline-flex';
        entry.el.setAttribute('aria-hidden', hide ? 'true' : 'false');
        const label = localize(cGov.name, state.locale);
        entry.el.setAttribute('aria-label', label);
        entry.el.textContent = label;
      }

      // Sync 22 project beacons
      for (const [projectId, entry] of projectMarkers.entries()) {
        const { el, project } = entry;
        const isVisibleInFilter = state.visibleProjectIds.has(projectId);
        const hide = isProjectStage || !isVisibleInFilter;

        el.dir = textDir;
        el.hidden = hide;
        el.style.display = hide ? 'none' : 'inline-flex';
        el.setAttribute('aria-hidden', hide ? 'true' : 'false');
        el.setAttribute('data-filtered-out', isVisibleInFilter ? 'false' : 'true');

        const isHighlighted = !isProjectStage && state.highlightedProjectId === projectId;
        const isActive = isProjectStage && state.activeProject?.id === projectId;
        const isDimmed =
          isGovStage &&
          state.activeGovernorateId !== null &&
          project.governorateId !== state.activeGovernorateId;

        el.setAttribute('data-highlighted', isHighlighted ? 'true' : 'false');
        el.setAttribute('data-active', isActive ? 'true' : 'false');

        el.classList.add('map-project-pin');
        el.classList.toggle('map-project-pin--active', isHighlighted || isActive);
        el.classList.toggle('map-project-pin--dimmed', isDimmed);
        el.style.zIndex = isHighlighted ? '45' : isDimmed ? '12' : '25';

        const projName = localize(project.name, state.locale);
        el.title = projName;
        el.setAttribute('aria-label', `${t.a11y.projectPinAria} ${projName}`);
        el.textContent = isGovStage || isHighlighted ? projName : '●';
      }

      // Sync georeferenced Master Plan zone markers
      if (isProjectStage && state.activeProject) {
        if (mountedZoneProjectId !== state.activeProject.id) {
          mountZoneMarkersForProject(state.activeProject);
        }
        for (const zm of zoneMarkers) {
          const zName = state.locale === 'ar' ? zm.nameAr : zm.nameEn;
          const isSelected = state.selectedZoneId === zm.zoneId;
          const isDimmedByLegend =
            state.activeZoneFilter !== null && state.activeZoneFilter !== zm.kind;

          zm.el.dir = textDir;
          zm.el.textContent = `${zm.code} · ${zName}`;
          zm.el.setAttribute('aria-label', `${zm.code} · ${zName}`);
          zm.el.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
          zm.el.setAttribute('data-active', isSelected ? 'true' : 'false');
          zm.el.classList.add('mp-zone-marker-btn');
          zm.el.classList.toggle('mp-zone-marker-btn--active', isSelected);
          zm.el.style.opacity = isDimmedByLegend ? '0.45' : '1';
        }
      } else if (mountedZoneProjectId !== null) {
        clearZoneMarkers();
      }
    },

    destroy: () => {
      clearZoneMarkers();
      for (const { marker } of govMarkers.values()) marker.remove();
      for (const { marker } of projectMarkers.values()) marker.remove();
      govMarkers.clear();
      projectMarkers.clear();
    },
  };
}
