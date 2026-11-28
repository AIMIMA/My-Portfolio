import { ArrowLeft, Bookmark, RotateCcw } from 'lucide-react';
import {
  formatMetricNumber,
  getTranslations,
  localize,
} from '../i18n/translations';
import type {
  Governorate,
  Locale,
  RealEstateProject,
} from '../types/portfolio';

export interface ProjectListDrawerProps {
  locale: Locale;
  governorate: Governorate;
  projects: readonly RealEstateProject[];
  highlightedProjectId: string | null;
  shortlistIds: ReadonlySet<string>;
  onBackToEgypt: () => void;
  onSelectProject: (projectId: string) => void;
  onHoverProject: (projectId: string | null) => void;
  onToggleShortlist: (projectId: string) => void;
  onResetFilters: () => void;
}

export function ProjectListDrawer({
  locale,
  governorate,
  projects,
  highlightedProjectId,
  shortlistIds,
  onBackToEgypt,
  onSelectProject,
  onHoverProject,
  onToggleShortlist,
  onResetFilters,
}: ProjectListDrawerProps) {
  const t = getTranslations(locale);
  const govName = localize(governorate.name, locale);

  return (
    <aside
      id="governorate-drawer"
      className="side-drawer surface-plaster anim-panel-reveal"
      aria-label={govName}
    >
      <div className="drawer-header">
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={onBackToEgypt}
        >
          <ArrowLeft size={15} className="icon-directional" aria-hidden="true" />
          <span>{t.governorateDrawer.backToEgypt}</span>
        </button>

        <div className="drawer-title-block">
          <div className="drawer-title-row">
            <h2>{govName}</h2>
            <span className="badge badge--brass tabular-nums">
              {projects.length}
            </span>
          </div>
          <p className="drawer-subtitle">{localize(governorate.tagline, locale)}</p>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="empty-state">
          <strong>0 · {t.egyptDock.emptyTitle}</strong>
          <p>{t.egyptDock.emptyBody}</p>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={onResetFilters}
          >
            <RotateCcw size={14} aria-hidden="true" />
            <span>{t.egyptDock.resetFilters}</span>
          </button>
        </div>
      ) : (
        <div className="drawer-project-list">
          {projects.map((project) => {
            const isHighlighted = highlightedProjectId === project.id;
            const isShortlisted = shortlistIds.has(project.id);
            const projName = localize(project.name, locale);

            return (
              <div
                key={project.id}
                id={`project-card-${project.id}`}
                role="button"
                tabIndex={0}
                data-project-id={project.id}
                data-highlighted={isHighlighted ? 'true' : 'false'}
                data-active="false"
                className={
                  isHighlighted
                    ? 'project-row project-row--highlighted'
                    : 'project-row'
                }
                onClick={() => onSelectProject(project.id)}
                onMouseEnter={() => onHoverProject(project.id)}
                onMouseLeave={() => onHoverProject(null)}
                onFocus={() => onHoverProject(project.id)}
                onBlur={() => onHoverProject(null)}
                onKeyDown={(e) => {
                  if (e.target !== e.currentTarget) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectProject(project.id);
                  }
                }}
              >
                <div className="project-row__top">
                  <span className="badge badge--neutral">
                    {t.deliveryStatuses[project.status]}
                  </span>
                  <button
                    id={`shortlist-toggle-${project.id}`}
                    type="button"
                    className={
                      isShortlisted
                        ? 'btn btn--primary btn--sm project-row__shortlist-btn'
                        : 'btn btn--ghost btn--sm project-row__shortlist-btn'
                    }
                    aria-label={
                      isShortlisted
                        ? `${t.governorateDrawer.removeFromShortlist} ${projName}`
                        : `${t.governorateDrawer.addToShortlist} ${projName}`
                    }
                    aria-pressed={isShortlisted}
                    data-active={isShortlisted ? 'true' : 'false'}
                    data-shortlisted={isShortlisted ? 'true' : 'false'}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleShortlist(project.id);
                    }}
                  >
                    <Bookmark size={14} aria-hidden="true" />
                  </button>
                </div>

                <h3 className="project-row__title">{projName}</h3>

                <p className="project-row__developer">
                  {localize(project.developer, locale)} ·{' '}
                  {localize(project.district, locale)}
                </p>

                <div className="project-row__metrics tabular-nums">
                  <span>
                    {formatMetricNumber(project.areaFeddans, locale)}{' '}
                    {t.governorateDrawer.feddansUnit}
                  </span>
                  <span>·</span>
                  <span>
                    {project.greenWaterPercent}% {t.governorateDrawer.greenWaterShort}
                  </span>
                  <span>·</span>
                  <span className="price-value">
                    {localize(project.conciseSummary.indicativePrice, locale)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}
