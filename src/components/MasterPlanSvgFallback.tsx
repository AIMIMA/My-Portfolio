import { ZONE_KIND_META } from '../data';
import { getTranslations, localize } from '../i18n/translations';
import type {
  Locale,
  MasterPlanMode,
  PlanPoint,
  RealEstateProject,
  ZoneKind,
} from '../types/portfolio';

export interface MasterPlanSvgFallbackProps {
  locale: Locale;
  project: RealEstateProject;
  mode: MasterPlanMode;
  selectedZoneId: string | null;
  activeZoneFilter: ZoneKind | null;
  panOffset: { x: number; y: number };
  zoomScale: number;
  bearingOffset: number;
  onSelectZone: (zoneId: string) => void;
}

function planToSvg(pt: PlanPoint): [number, number] {
  // Maps [0..100, 0..100] into [140..660, 70..530]
  return [140 + pt[0] * 5.2, 70 + pt[1] * 4.6];
}

function polygonCentroid(points: readonly PlanPoint[]): [number, number] {
  if (points.length === 0) return [400, 300];
  let sumX = 0;
  let sumY = 0;
  for (const pt of points) {
    const [sx, sy] = planToSvg(pt);
    sumX += sx;
    sumY += sy;
  }
  return [sumX / points.length, sumY / points.length];
}

export function MasterPlanSvgFallback({
  locale,
  project,
  mode,
  selectedZoneId,
  activeZoneFilter,
  panOffset,
  zoomScale,
  bearingOffset,
  onSelectZone,
}: MasterPlanSvgFallbackProps) {
  const t = getTranslations(locale);
  const is3d = mode === '3d';
  const tiltScaleY = is3d ? 0.76 : 1;
  const totalRotation = (is3d ? -16 : 0) + bearingOffset;

  return (
    <div
      className="mp-svg-fallback-stage"
      role="region"
      aria-label={t.a11y.masterPlanRegionLabel}
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}
    >
      <svg
        viewBox="0 0 800 600"
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: '100%', display: 'block', background: '#132026' }}
      >
        <g
          transform={`translate(${(400 + panOffset.x).toFixed(1)} ${(300 + panOffset.y).toFixed(1)}) scale(${zoomScale.toFixed(3)} ${(zoomScale * tiltScaleY).toFixed(3)}) rotate(${totalRotation.toFixed(1)}) translate(-400 -300)`}
        >
          {/* Architectural Site Boundary */}
          <rect
            x="148"
            y="78"
            width="504"
            height="444"
            rx="6"
            fill="#1a1714"
            stroke="#cf9d4f"
            strokeWidth="2"
            strokeDasharray="8 6"
          />

          {/* Internal Boulevards & Promenades */}
          {project.masterPlan.roads.map((road) => {
            const pts = road.points
              .map((p) => {
                const [sx, sy] = planToSvg(p);
                return `${sx.toFixed(1)},${sy.toFixed(1)}`;
              })
              .join(' ');
            return (
              <polyline
                key={road.id}
                points={pts}
                fill="none"
                stroke={road.kind === 'promenade' ? '#cf9d4f' : '#4a4339'}
                strokeWidth={road.kind === 'boulevard' ? 7 : 4}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.85"
              />
            );
          })}

          {/* Architectural Land-Use Parcels (2D CAD / 2.5D Extruded Massing) */}
          {project.masterPlan.zones.map((zone) => {
            const meta = ZONE_KIND_META[zone.kind];
            const isSelected = selectedZoneId === zone.id;
            const isDimmed = activeZoneFilter !== null && activeZoneFilter !== zone.kind;
            const liftPx = is3d ? Math.min(48, Math.max(4, zone.extrusionHeight * 0.7)) : 0;

            const basePoints = zone.polygon
              .map((p) => {
                const [sx, sy] = planToSvg(p);
                return `${sx.toFixed(1)},${sy.toFixed(1)}`;
              })
              .join(' ');

            const roofPoints = zone.polygon
              .map((p) => {
                const [sx, sy] = planToSvg(p);
                return `${sx.toFixed(1)},${(sy - liftPx).toFixed(1)}`;
              })
              .join(' ');

            return (
              <g
                key={zone.id}
                opacity={isDimmed ? 0.25 : 0.94}
                style={{ cursor: 'pointer' }}
                onClick={() => onSelectZone(zone.id)}
              >
                {is3d ? (
                  <polygon
                    points={basePoints}
                    fill="#12100d"
                    stroke={meta.strokeColor}
                    strokeWidth="1.2"
                    opacity="0.7"
                  />
                ) : null}
                <polygon
                  points={roofPoints}
                  fill={isSelected ? '#e8c27a' : meta.fillColor}
                  stroke={isSelected ? '#fff2d6' : meta.strokeColor}
                  strokeWidth={isSelected ? 3 : 1.5}
                />
              </g>
            );
          })}
        </g>
      </svg>

      {/* Accessible Interactive Zone Buttons Synced with Parcel Centroids */}
      <div
        className="mp-svg-zone-overlay"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      >
        {project.masterPlan.zones.map((zone) => {
          const [cx, cy] = polygonCentroid(zone.polygon);
          const leftPct = (cx / 800) * 100;
          const topPct = (cy / 600) * 100;
          const zName = localize(zone.name, locale);
          const isSelected = selectedZoneId === zone.id;
          const isDimmed = activeZoneFilter !== null && activeZoneFilter !== zone.kind;

          return (
            <button
              key={zone.id}
              id={`masterplan-zone-btn-${zone.id}`}
              type="button"
              className={
                isSelected
                  ? 'mp-zone-marker-btn mp-zone-marker-btn--active'
                  : 'mp-zone-marker-btn'
              }
              aria-label={`${zone.code} · ${zName}`}
              aria-pressed={isSelected}
              data-active={isSelected ? 'true' : 'false'}
              onClick={() => onSelectZone(zone.id)}
              style={{
                position: 'absolute',
                left: `${leftPct.toFixed(1)}%`,
                top: `${topPct.toFixed(1)}%`,
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'auto',
                opacity: isDimmed ? 0.45 : 1,
              }}
            >
              {zone.code} · {zName}
            </button>
          );
        })}
      </div>
    </div>
  );
}
