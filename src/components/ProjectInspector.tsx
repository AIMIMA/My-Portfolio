import {
  ArrowLeft,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  MessageSquare,
  X,
} from 'lucide-react';
import { CONSULTANT_PROFILE, GOVERNORATE_BY_ID } from '../data';
import {
  formatMetricNumber,
  getTranslations,
  localize,
} from '../i18n/translations';
import type {
  Locale,
  MasterPlanZone,
  RealEstateProject,
} from '../types/portfolio';
import { buildWhatsAppUrl } from '../utils/validation';

export interface ProjectInspectorProps {
  locale: Locale;
  project: RealEstateProject;
  selectedZone: MasterPlanZone | null;
  isShortlisted: boolean;
  onBackToGovernorate: () => void;
  onPrevProject: () => void;
  onNextProject: () => void;
  onToggleShortlist: (projectId: string) => void;
  onOpenConsultation: () => void;
  onInquireZone: (zoneId: string) => void;
  onCloseZone: () => void;
}

export function ProjectInspector({
  locale,
  project,
  selectedZone,
  isShortlisted,
  onBackToGovernorate,
  onPrevProject,
  onNextProject,
  onToggleShortlist,
  onOpenConsultation,
  onInquireZone,
  onCloseZone,
}: ProjectInspectorProps) {
  const t = getTranslations(locale);
  const gov = GOVERNORATE_BY_ID.get(project.governorateId);
  const projectName = localize(project.name, locale);
  const govName = gov ? localize(gov.name, locale) : '';

  const waMessage =
    locale === 'ar'
      ? `${t.consultation.waGreeting} ${projectName} (${govName})`
      : `${t.consultation.waGreeting} ${projectName} (${govName})`;

  const whatsappHref = buildWhatsAppUrl(
    CONSULTANT_PROFILE.contact.whatsappE164,
    waMessage,
  );

  const highlights = project.conciseSummary.highlights.slice(0, 4);

  return (
    <>
      <aside
        id="project-inspector"
        className="side-drawer side-drawer--inspector surface-plaster anim-panel-reveal"
        aria-label={projectName}
      >
        <div className="inspector-topbar">
          <button
            id="project-back-btn"
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={onBackToGovernorate}
          >
            <ArrowLeft size={15} className="icon-directional" aria-hidden="true" />
            <span>{t.projectInspector.backToGovernorate}</span>
          </button>

          <div className="inspector-sibling-nav">
            <button
              id="project-prev-btn"
              type="button"
              className="btn btn--ghost btn--sm btn--icon"
              onClick={onPrevProject}
              aria-label={t.projectInspector.prevProject}
              title={t.projectInspector.prevProject}
            >
              <ChevronLeft size={16} className="icon-directional" aria-hidden="true" />
            </button>
            <button
              id="project-next-btn"
              type="button"
              className="btn btn--ghost btn--sm btn--icon"
              onClick={onNextProject}
              aria-label={t.projectInspector.nextProject}
              title={t.projectInspector.nextProject}
            >
              <ChevronRight size={16} className="icon-directional" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="inspector-body">
          <div className="inspector-header">
            <div className="inspector-badges">
              <span className="badge badge--brass">
                {t.deliveryStatuses[project.status]}
              </span>
              {gov ? (
                <span className="badge badge--neutral">{govName}</span>
              ) : null}
            </div>

            <div className="inspector-title-row">
              <h2 className="inspector-title">{projectName}</h2>
              <button
                id={`shortlist-toggle-${project.id}`}
                type="button"
                className={
                  isShortlisted ? 'btn btn--primary btn--sm' : 'btn btn--secondary btn--sm'
                }
                aria-pressed={isShortlisted}
                data-active={isShortlisted ? 'true' : 'false'}
                data-shortlisted={isShortlisted ? 'true' : 'false'}
                onClick={() => onToggleShortlist(project.id)}
              >
                <Bookmark size={14} aria-hidden="true" />
                <span>
                  {isShortlisted
                    ? t.projectInspector.inShortlist
                    : t.projectInspector.addToShortlist}
                </span>
              </button>
            </div>

            <p className="inspector-submeta">
              <strong>{localize(project.developer, locale)}</strong> ·{' '}
              <span>{localize(project.district, locale)}</span>
            </p>
          </div>

          <dl className="inspector-metrics-grid">
            <div className="inspector-metric">
              <dt>{t.projectInspector.totalAreaLabel}</dt>
              <dd className="tabular-nums">
                {formatMetricNumber(project.areaFeddans, locale)}{' '}
                {t.governorateDrawer.feddansUnit}
              </dd>
            </div>
            <div className="inspector-metric">
              <dt>{t.projectInspector.greenWaterLabel}</dt>
              <dd className="tabular-nums">{project.greenWaterPercent}%</dd>
            </div>
            <div className="inspector-metric">
              <dt>{t.projectInspector.areaRangeLabel}</dt>
              <dd className="tabular-nums">
                {localize(project.conciseSummary.areaRangeSqm, locale)}
              </dd>
            </div>
            <div className="inspector-metric">
              <dt>{t.projectInspector.deliveryWindowLabel}</dt>
              <dd>{localize(project.conciseSummary.deliveryWindow, locale)}</dd>
            </div>
          </dl>

          <div className="inspector-pricing-box">
            <div className="inspector-pricing-row">
              <span className="inspector-pricing-label">
                {t.projectInspector.indicativePriceLabel}
              </span>
              <strong className="price-value">
                {localize(project.conciseSummary.indicativePrice, locale)}
              </strong>
            </div>
            <p className="inspector-payment">
              {t.projectInspector.paymentHorizonLabel}:{' '}
              {localize(project.conciseSummary.paymentHorizon, locale)}
            </p>
            <p className="inspector-disclaimer">
              {t.projectInspector.indicativePriceDisclaimer}
            </p>
          </div>

          <div className="inspector-categories">
            {project.unitCategories.map((cat) => (
              <span key={cat} className="badge badge--neutral">
                {t.unitCategories[cat]}
              </span>
            ))}
          </div>

          <div className="inspector-highlights">
            <h3 className="eyebrow">{t.projectInspector.highlightsTitle}</h3>
            <ul className="inspector-highlights-list">
              {highlights.map((item, idx) => (
                <li key={idx}>{localize(item, locale)}</li>
              ))}
            </ul>
          </div>

          <div className="inspector-cta-stack">
            <button
              id="consult-open-btn"
              type="button"
              className="btn btn--primary inspector-cta-full"
              onClick={onOpenConsultation}
            >
              <MessageSquare size={16} aria-hidden="true" />
              <span>{t.projectInspector.bookConsultationCta}</span>
            </button>

            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--secondary inspector-cta-full"
            >
              <MessageCircle size={16} aria-hidden="true" />
              <span>{t.projectInspector.whatsappCta}</span>
            </a>
          </div>
        </div>
      </aside>

      {selectedZone ? (
        <section
          id="masterplan-zone-panel"
          className="mp-zone-popover mp-zone-floating surface-plaster anim-panel-reveal"
          aria-label={t.masterPlan.zoneInspectorTitle}
        >
          <div className="mp-zone-popover__header">
            <div>
              <span className="eyebrow">
                {selectedZone.code} · {t.zoneKinds[selectedZone.kind]}
              </span>
              <h3 className="mp-zone-popover__title">
                {localize(selectedZone.name, locale)}
              </h3>
            </div>
            <button
              type="button"
              className="btn btn--ghost btn--sm btn--icon"
              onClick={onCloseZone}
              aria-label={t.masterPlan.closeZoneInspector}
            >
              <X size={15} aria-hidden="true" />
            </button>
          </div>

          <p className="mp-zone-popover__summary">
            {localize(selectedZone.summary, locale)}
          </p>

          <div className="mp-zone-popover__meta">
            {selectedZone.footprintRatio ? (
              <span>
                {t.masterPlan.zoneFootprintLabel}:{' '}
                <strong className="tabular-nums">{selectedZone.footprintRatio}</strong>
              </span>
            ) : null}
            {selectedZone.unitMix ? (
              <span>
                {t.masterPlan.zoneUnitMixLabel}:{' '}
                <strong>{localize(selectedZone.unitMix, locale)}</strong>
              </span>
            ) : null}
          </div>

          <button
            id="masterplan-zone-inquire-btn"
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => onInquireZone(selectedZone.id)}
          >
            <MessageSquare size={14} aria-hidden="true" />
            <span>{t.masterPlan.inquireZoneCta}</span>
          </button>
        </section>
      ) : null}
    </>
  );
}
