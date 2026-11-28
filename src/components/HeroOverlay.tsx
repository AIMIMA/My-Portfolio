import { Compass, MessageSquare, User } from 'lucide-react';
import { CONSULTANT_PROFILE } from '../data';
import { getTranslations, localize } from '../i18n/translations';
import type { Locale, WebGLStatus } from '../types/portfolio';

export interface HeroOverlayProps {
  locale: Locale;
  visible: boolean;
  opacity: number;
  webglStatus: WebGLStatus;
  onExploreMap: () => void;
  onOpenConsultation: () => void;
  onOpenProfile: () => void;
}

export function HeroOverlay({
  locale,
  visible,
  opacity,
  webglStatus,
  onExploreMap,
  onOpenConsultation,
  onOpenProfile,
}: HeroOverlayProps) {
  if (!visible || opacity <= 0.01) {
    return null;
  }

  const t = getTranslations(locale);

  return (
    <section
      id="hero-editorial-card"
      className="hero-overlay surface-plaster"
      aria-label={t.a11y.heroRegionLabel}
      style={{
        opacity,
        transform: `translateY(${Math.round((1 - opacity) * -14)}px)`,
        pointerEvents: opacity > 0.25 ? 'auto' : 'none',
      }}
    >
      <div className="foundation-index">
        <span className="foundation-index__rule" aria-hidden="true" />
        <span className="eyebrow">{t.hero.indexLabel}</span>
      </div>

      <div className="hero-identity-block">
        <h1 className="hero-title">{localize(CONSULTANT_PROFILE.name, locale)}</h1>
        <p className="hero-role">{localize(CONSULTANT_PROFILE.title, locale)}</p>
      </div>

      <p className="hero-tagline">{localize(CONSULTANT_PROFILE.tagline, locale)}</p>

      <dl className="stat-strip">
        {CONSULTANT_PROFILE.stats.map((stat) => (
          <div key={stat.label.en} className="stat-item">
            <dt className="stat-label">{localize(stat.label, locale)}</dt>
            <dd className="stat-value tabular-nums">{stat.value}</dd>
          </div>
        ))}
      </dl>

      <div className="hero-cta-group">
        <button
          id="hero-explore-btn"
          type="button"
          className="btn btn--primary"
          onClick={onExploreMap}
        >
          <Compass size={16} aria-hidden="true" />
          <span>{t.hero.exploreMapCta}</span>
        </button>

        <button
          id="hero-consult-btn"
          type="button"
          className="btn btn--secondary"
          onClick={onOpenConsultation}
        >
          <MessageSquare size={16} aria-hidden="true" />
          <span>{t.hero.bookConsultationCta}</span>
        </button>

        <button
          id="hero-about-btn"
          type="button"
          className="btn btn--ghost"
          onClick={onOpenProfile}
        >
          <User size={16} aria-hidden="true" />
          <span>{t.hero.aboutConsultantCta}</span>
        </button>
      </div>

      <div className="hero-scroll-cue">
        <span className="hero-scroll-cue__title">{t.hero.scrollCue}</span>
        <span className="hero-scroll-cue__sub">
          {webglStatus === 'fallback' ? t.hero.webglFallbackNote : t.hero.scrollCueSub}
        </span>
      </div>
    </section>
  );
}
