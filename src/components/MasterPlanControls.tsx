import { Compass, RotateCcw } from 'lucide-react';
import { getTranslations } from '../i18n/translations';
import type { Locale, MasterPlanMode } from '../types/portfolio';
import { computeScaleBarMeters } from '../utils/mercator';

export interface MasterPlanControlsProps {
  locale: Locale;
  mode: MasterPlanMode;
  lat: number;
  zoom: number;
  bearing: number;
  onChangeMode: (mode: MasterPlanMode) => void;
  onResetView: () => void;
  onResetNorth: () => void;
}

export function MasterPlanControls({
  locale,
  mode,
  lat,
  zoom,
  bearing,
  onChangeMode,
  onResetView,
  onResetNorth,
}: MasterPlanControlsProps) {
  const t = getTranslations(locale);
  const scaleMetrics = computeScaleBarMeters(lat, zoom, 110);

  return (
    <div id="masterplan-controls" className="mp-controls-dock">
      <div className="mp-controls surface-plaster">
        <div
          className="mp-mode-toggle"
          role="group"
          aria-label={t.masterPlan.modeToggleAria}
        >
          <button
            id="masterplan-mode-2d"
            type="button"
            className={
              mode === '2d' ? 'btn btn--primary btn--sm' : 'btn btn--ghost btn--sm'
            }
            aria-pressed={mode === '2d'}
            data-active={mode === '2d' ? 'true' : 'false'}
            onClick={() => onChangeMode('2d')}
          >
            {t.masterPlan.mode2d}
          </button>

          <button
            id="masterplan-mode-3d"
            type="button"
            className={
              mode === '3d' ? 'btn btn--primary btn--sm' : 'btn btn--ghost btn--sm'
            }
            aria-pressed={mode === '3d'}
            data-active={mode === '3d' ? 'true' : 'false'}
            onClick={() => onChangeMode('3d')}
          >
            {t.masterPlan.mode3d}
          </button>
        </div>

        <div className="mp-controls__row">
          <button
            id="masterplan-reset-view-btn"
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={onResetView}
            title={t.masterPlan.resetView}
          >
            <RotateCcw size={14} aria-hidden="true" />
            <span>{t.masterPlan.resetView}</span>
          </button>

          <button
            id="masterplan-north-arrow"
            type="button"
            className="mp-compass"
            onClick={onResetNorth}
            aria-label={t.masterPlan.resetNorth}
            title={t.masterPlan.resetNorth}
          >
            <span
              className="mp-compass__needle"
              style={{ transform: `rotate(${(-bearing).toFixed(1)}deg)` }}
            >
              <Compass size={16} aria-hidden="true" />
              <span className="mp-compass__label">{t.masterPlan.northSymbol}</span>
            </span>
          </button>
        </div>
      </div>

      <div id="masterplan-scale-bar" className="mp-scale-bar tabular-nums">
        <span className="scale-bar-label">
          {locale === 'ar' ? scaleMetrics.labelAr : scaleMetrics.labelEn}
        </span>
        <div
          className="mp-scale-bar__track"
          style={{ width: `${Math.max(28, Math.round(scaleMetrics.widthPx))}px` }}
        />
      </div>
    </div>
  );
}
