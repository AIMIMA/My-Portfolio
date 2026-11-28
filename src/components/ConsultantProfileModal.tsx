import { useRef, useState } from 'react';
import {
  Award,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  Phone,
  X,
} from 'lucide-react';
import { CONSULTANT_PROFILE, GOVERNORATE_BY_ID } from '../data';
import { getTranslations, localize } from '../i18n/translations';
import type { Locale } from '../types/portfolio';
import { useDialogFocusTrap } from '../utils/useDialogFocusTrap';
import { resolvePublicAssetUrl } from '../utils/urlSync';
import { buildWhatsAppUrl } from '../utils/validation';

export interface ConsultantProfileModalProps {
  locale: Locale;
  open: boolean;
  onClose: () => void;
  onBookConsultation: () => void;
}

export function ConsultantProfileModal({
  locale,
  open,
  onClose,
  onBookConsultation,
}: ConsultantProfileModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const [photoError, setPhotoError] = useState<boolean>(false);

  useDialogFocusTrap(dialogRef, open);

  if (!open) return null;

  const t = getTranslations(locale);
  const consultantName = localize(CONSULTANT_PROFILE.name, locale);
  const consultantTitle = localize(CONSULTANT_PROFILE.title, locale);

  const whatsappHref = buildWhatsAppUrl(
    CONSULTANT_PROFILE.contact.whatsappE164,
    `${t.consultation.waGreeting} ${t.consultation.contextGeneral}`,
  );
  const telHref = `tel:${CONSULTANT_PROFILE.contact.whatsappE164}`;
  const mailHref = `mailto:${CONSULTANT_PROFILE.contact.email}`;

  const resolvedPhotoUrl = resolvePublicAssetUrl(CONSULTANT_PROFILE.profilePhotoUrl);
  const showImg = Boolean(resolvedPhotoUrl) && !photoError;

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        id="consultant-profile-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-dialog-title"
        className="modal-dialog surface-plaster anim-panel-reveal"
      >
        <div className="modal-header">
          <div className="profile-identity-row">
            <div className="consultant-portrait">
              {showImg ? (
                <img
                  src={resolvedPhotoUrl ?? undefined}
                  alt={localize(CONSULTANT_PROFILE.profilePhotoAlt, locale)}
                  className="consultant-portrait__img"
                  style={{
                    objectPosition:
                      CONSULTANT_PROFILE.portraitFallback?.profileObjectPosition ??
                      '50% 20%',
                  }}
                  onError={() => setPhotoError(true)}
                />
              ) : (
                <div className="consultant-portrait__fallback" aria-hidden="true">
                  {CONSULTANT_PROFILE.monogram}
                </div>
              )}
            </div>

            <div className="profile-identity-copy">
              <span className="badge badge--brass">
                {t.profile.independentAdvisoryBadge}
              </span>
              <h2 id="profile-dialog-title" className="profile-name">
                {consultantName}
              </h2>
              <p className="hero-role">{consultantTitle}</p>
              <p className="profile-location">
                <MapPin size={13} aria-hidden="true" />
                <span>{localize(CONSULTANT_PROFILE.location, locale)}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn btn--ghost btn--sm btn--icon"
            onClick={onClose}
            aria-label={t.profile.closeLabel}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="profile-section">
          <h3 className="eyebrow">{t.profile.aboutHeading}</h3>
          <p className="profile-bio">{localize(CONSULTANT_PROFILE.bio, locale)}</p>
        </div>

        <div className="profile-section">
          <h3 className="eyebrow">{t.profile.credentialsHeading}</h3>
          <ul className="profile-credentials-list">
            {CONSULTANT_PROFILE.credentials.map((cred, idx) => (
              <li key={idx}>
                <Award size={14} className="profile-cred-icon" aria-hidden="true" />
                <span>{localize(cred, locale)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="profile-section">
          <h3 className="eyebrow">{t.profile.coveredGovsHeading}</h3>
          <div className="profile-tags">
            {CONSULTANT_PROFILE.coveredGovernorateIds.map((govId) => {
              const gov = GOVERNORATE_BY_ID.get(govId);
              if (!gov) return null;
              return (
                <span key={govId} className="badge badge--neutral">
                  {localize(gov.name, locale)}
                </span>
              );
            })}
          </div>
        </div>

        <div className="profile-section">
          <h3 className="eyebrow">{t.profile.partnersHeading}</h3>
          <div className="profile-tags">
            {CONSULTANT_PROFILE.partnerDevelopers.slice(0, 8).map((dev) => (
              <span key={dev.en} className="badge badge--neutral">
                {localize(dev, locale)}
              </span>
            ))}
          </div>
        </div>

        <div className="profile-section">
          <h3 className="eyebrow">{t.profile.contactHeading}</h3>
          <div className="profile-contact-grid">
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--secondary"
            >
              <MessageCircle size={15} aria-hidden="true" />
              <span>{t.profile.whatsappCta}</span>
            </a>

            <a href={telHref} className="btn btn--secondary">
              <Phone size={15} aria-hidden="true" />
              <span className="tabular-nums">
                {CONSULTANT_PROFILE.contact.phoneDisplay}
              </span>
            </a>

            <a href={mailHref} className="btn btn--secondary">
              <Mail size={15} aria-hidden="true" />
              <span>{t.profile.emailCta}</span>
            </a>
          </div>
        </div>

        <button
          type="button"
          className="btn btn--primary"
          onClick={onBookConsultation}
        >
          <MessageSquare size={16} aria-hidden="true" />
          <span>{t.profile.bookConsultationCta}</span>
        </button>
      </div>
    </div>
  );
}
