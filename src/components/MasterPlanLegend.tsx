import { useMemo } from 'react';
import { ZONE_KIND_META } from '../data';
import { getTranslations } from '../i18n/translations';
import type { Locale, RealEstateProject, ZoneKind } from '../types/portfolio';

export interface MasterPlanLegendProps {
  locale: Locale;
  project: RealEstateProject;
  activeZoneFilter: ZoneKind | null;
  onToggleZoneFilter: (kind: ZoneKind) => void;
}

export function MasterPlanLegend({
  locale,
  project,
  activeZoneFilter,
  onToggleZoneFilter,
}: MasterPlanLegendProps) {
  const t = getTranslations(locale);

  const presentKinds = useMemo(() => {
    const seen = new Set<ZoneKind>();
    const ordered: ZoneKind[] = [];
    for (const z of project.masterPlan.zones) {
      if (!seen.has(z.kind)) {
        seen.add(z.kind);
        ordered.push(z.kind);
      }
    }
    return ordered;
  }, [project]);

  return (
    <aside
      id="masterplan-legend"
      className="mp-legend-dock mp-legend surface-plaster"
      aria-label={t.masterPlan.legendTitle}
    >
      <div className="mp-legend__header">
        <span className="eyebrow">{t.masterPlan.legendTitle}</span>
      </div>

      <div className="mp-legend__list">
        {presentKinds.map((kind) => {
          const meta = ZONE_KIND_META[kind];
          const isActive = activeZoneFilter === kind;
          return (
            <button
              key={kind}
              id={`masterplan-legend-item-${kind}`}
              type="button"
              className={
                isActive ? 'mp-legend-item mp-legend-item--active' : 'mp-legend-item'
              }
              aria-pressed={isActive}
              data-active={isActive ? 'true' : 'false'}
              onClick={() => onToggleZoneFilter(kind)}
            >
              <span
                className="mp-zone-swatch"
                style={{ backgroundColor: meta.fillColor }}
                aria-hidden="true"
              />
              <span>{t.zoneKinds[kind]}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
