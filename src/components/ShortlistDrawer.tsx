import { useRef } from 'react';
import { ArrowUpRight, MessageSquare, Trash2, X } from 'lucide-react';
import { GOVERNORATE_BY_ID, PROJECT_BY_ID } from '../data';
import {
  formatMetricNumber,
  getTranslations,
  localize,
} from '../i18n/translations';
import type { Locale, RealEstateProject } from '../types/portfolio';
import { useDialogFocusTrap } from '../utils/useDialogFocusTrap';

export interface ShortlistDrawerProps {
  locale: Locale;
  open: boolean;
  shortlistProjectIds: readonly string[];
  onClose: () => void;
  onRemoveProject: (projectId: string) => void;
  onClearAll: () => void;
  onOpenProject: (projectId: string) => void;
  onConsultShortlist: () => void;
}

export function ShortlistDrawer({
  locale,
  open,
  shortlistProjectIds,
  onClose,
  onRemoveProject,
  onClearAll,
  onOpenProject,
  onConsultShortlist,
}: ShortlistDrawerProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  useDialogFocusTrap(dialogRef, open);

  if (!open) return null;

  const t = getTranslations(locale);
  const projects: RealEstateProject[] = shortlistProjectIds
    .map((id) => PROJECT_BY_ID.get(id))
    .filter((p): p is RealEstateProject => Boolean(p));

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        id="shortlist-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortlist-dialog-title"
        className="modal-dialog modal-dialog--wide surface-plaster anim-panel-reveal"
      >
        <div className="modal-header">
          <div className="shortlist-header-title">
            <h2 id="shortlist-dialog-title">{t.shortlist.drawerTitle}</h2>
            <span className="badge badge--brass tabular-nums">
              {projects.length} / 3
            </span>
          </div>

          <div className="shortlist-header-actions">
            {projects.length > 0 ? (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={onClearAll}
              >
                {t.shortlist.clearAll}
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn--ghost btn--sm btn--icon"
              onClick={onClose}
              aria-label={t.a11y.closeDialog}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="empty-state">
            <strong>{t.shortlist.emptyTitle}</strong>
            <p>{t.shortlist.emptyBody}</p>
          </div>
        ) : (
          <>
            <div className="shortlist-grid">
              {projects.map((project) => {
                const projName = localize(project.name, locale);
                const gov = GOVERNORATE_BY_ID.get(project.governorateId);
                return (
                  <article
                    key={project.id}
                    data-project-id={project.id}
                    className="shortlist-card"
                  >
                    <div className="shortlist-card__top">
                      <span className="badge badge--neutral">
                        {gov ? localize(gov.shortName, locale) : project.governorateId}
                      </span>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm btn--icon"
                        aria-label={`${t.shortlist.removeAria} ${projName}`}
                        onClick={() => onRemoveProject(project.id)}
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </div>

                    <button
                      type="button"
                      className="shortlist-card__title-btn"
                      onClick={() => onOpenProject(project.id)}
                    >
                      <span>{projName}</span>
                      <ArrowUpRight size={15} aria-hidden="true" />
                    </button>

                    <dl className="shortlist-card__metrics">
                      <div>
                        <dt>{t.shortlist.compareDeveloper}</dt>
                        <dd>{localize(project.developer, locale)}</dd>
                      </div>
                      <div>
                        <dt>{t.shortlist.compareArea}</dt>
                        <dd className="tabular-nums">
                          {formatMetricNumber(project.areaFeddans, locale)}{' '}
                          {t.governorateDrawer.feddansUnit}
                        </dd>
                      </div>
                      <div>
                        <dt>{t.shortlist.compareGreen}</dt>
                        <dd className="tabular-nums">{project.greenWaterPercent}%</dd>
                      </div>
                      <div>
                        <dt>{t.shortlist.compareStatus}</dt>
                        <dd>{t.deliveryStatuses[project.status]}</dd>
                      </div>
                      <div>
                        <dt>{t.shortlist.comparePrice}</dt>
                        <dd className="price-value">
                          {localize(project.conciseSummary.indicativePrice, locale)}
                        </dd>
                      </div>
                    </dl>
                  </article>
                );
              })}
            </div>

            <button
              id="shortlist-consult-btn"
              type="button"
              className="btn btn--primary"
              onClick={onConsultShortlist}
            >
              <MessageSquare size={16} aria-hidden="true" />
              <span>{t.shortlist.consultShortlistCta}</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
