import { Bookmark, ChevronRight, Globe, MessageSquare, User } from 'lucide-react';
import { CONSULTANT_PROFILE } from '../data';
import { getTranslations, localize } from '../i18n/translations';
import type {
  Governorate,
  Locale,
  RealEstateProject,
  StageId,
} from '../types/portfolio';

export interface TopNavBarProps {
  locale: Locale;
  stage: StageId;
  activeGovernorate: Governorate | null;
  activeProject: RealEstateProject | null;
  shortlistCount: number;
  onSelectHero: () => void;
  onSelectEgypt: () => void;
  onSelectGovernorate: (govId: Governorate['id']) => void;
  onToggleLocale: () => void;
  onOpenProfile: () => void;
  onOpenShortlist: () => void;
  onOpenConsultation: () => void;
}

export function TopNavBar({
  locale,
  stage,
  activeGovernorate,
  activeProject,
  shortlistCount,
  onSelectHero,
  onSelectEgypt,
  onSelectGovernorate,
  onToggleLocale,
  onOpenProfile,
  onOpenShortlist,
  onOpenConsultation,
}: TopNavBarProps) {
  const t = getTranslations(locale);
  const showEgyptCrumb =
    stage === 'egypt' || stage === 'governorate' || stage === 'project';
  const showGovCrumb =
    (stage === 'governorate' || stage === 'project') && activeGovernorate !== null;
  const showProjectCrumb = stage === 'project' && activeProject !== null;

  return (
    <header className="top-nav">
      <div className="top-nav__brand">
        <span className="eyebrow tabular-nums top-nav__monogram">
          {CONSULTANT_PROFILE.monogram}
        </span>
        <span className="top-nav__brand-name">
          {localize(CONSULTANT_PROFILE.name, locale)}
        </span>
      </div>

      <div className="top-nav__center">
        <nav
          className="breadcrumb-nav"
          aria-label={t.nav.breadcrumbs.navAria}
        >
          <button
            id="breadcrumb-hero"
            type="button"
            className="breadcrumb-item"
            aria-current={stage === 'hero' || stage === 'transition' ? 'page' : undefined}
            onClick={onSelectHero}
          >
            {t.nav.breadcrumbs.hero}
          </button>

          {showEgyptCrumb ? (
            <>
              <ChevronRight
                size={13}
                className="breadcrumb-sep icon-directional"
                aria-hidden="true"
              />
              <button
                id="breadcrumb-egypt"
                type="button"
                className="breadcrumb-item"
                aria-current={stage === 'egypt' ? 'page' : undefined}
                onClick={onSelectEgypt}
              >
                {t.nav.breadcrumbs.egypt}
              </button>
            </>
          ) : null}

          {showGovCrumb && activeGovernorate ? (
            <>
              <ChevronRight
                size={13}
                className="breadcrumb-sep icon-directional"
                aria-hidden="true"
              />
              <button
                id="breadcrumb-governorate"
                type="button"
                className="breadcrumb-item"
                aria-current={stage === 'governorate' ? 'page' : undefined}
                onClick={() => onSelectGovernorate(activeGovernorate.id)}
              >
                {localize(activeGovernorate.name, locale)}
              </button>
            </>
          ) : null}

          {showProjectCrumb && activeProject ? (
            <>
              <ChevronRight
                size={13}
                className="breadcrumb-sep icon-directional"
                aria-hidden="true"
              />
              <span
                id="breadcrumb-project"
                className="breadcrumb-item"
                aria-current="page"
              >
                {localize(activeProject.name, locale)}
              </span>
            </>
          ) : null}
        </nav>
      </div>

      <div className="top-nav__actions">
        {stage !== 'project' ? (
          <button
            id="consult-open-btn"
            type="button"
            className="btn btn--primary btn--sm top-nav__consult-btn"
            onClick={onOpenConsultation}
            aria-label={t.nav.bookConsultation}
          >
            <MessageSquare size={14} aria-hidden="true" />
            <span className="top-nav__action-label">{t.nav.bookConsultation}</span>
          </button>
        ) : null}

        <button
          id="shortlist-open-btn"
          type="button"
          className="btn btn--secondary btn--sm"
          onClick={onOpenShortlist}
          aria-label={`${t.nav.shortlistCountAria} (${shortlistCount})`}
        >
          <Bookmark size={14} aria-hidden="true" />
          <span className="top-nav__action-label">{t.nav.openShortlist}</span>
          <span className="count-badge tabular-nums">{shortlistCount}</span>
        </button>

        <button
          id="profile-open-btn"
          type="button"
          className="btn btn--secondary btn--sm"
          onClick={onOpenProfile}
          aria-label={t.nav.openProfile}
        >
          <User size={14} aria-hidden="true" />
          <span className="top-nav__action-label">{t.nav.openProfile}</span>
        </button>

        <button
          id="lang-toggle-btn"
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={onToggleLocale}
          aria-label={t.nav.langToggleAria}
        >
          <Globe size={14} aria-hidden="true" />
          <span>{t.nav.langToggleLabel}</span>
        </button>
      </div>
    </header>
  );
}
