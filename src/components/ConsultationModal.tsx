import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { CheckCircle2, MessageCircle, X } from 'lucide-react';
import {
  CONSULTANT_PROFILE,
  GOVERNORATE_BY_ID,
  PROJECT_BY_ID,
} from '../data';
import { getTranslations, localize } from '../i18n/translations';
import type {
  ConsultationContext,
  ConsultationErrorKey,
  ConsultationPurpose,
  ConsultationSubmission,
  ContactMethod,
  Locale,
} from '../types/portfolio';
import { useDialogFocusTrap } from '../utils/useDialogFocusTrap';
import {
  buildWhatsAppUrl,
  generateReferenceId,
  validateConsultationForm,
} from '../utils/validation';

const CONSULT_STORAGE_KEY = 'aimima_portfolio_consultations';

const CONTACT_METHODS: readonly ContactMethod[] = ['whatsapp', 'phone', 'email'];
const PURPOSES: readonly ConsultationPurpose[] = [
  'investment',
  'residence',
  'vacation_home',
  'commercial',
  'comparison',
];

export interface ConsultationModalProps {
  locale: Locale;
  open: boolean;
  context: ConsultationContext;
  onClose: () => void;
}

function persistSubmission(entry: ConsultationSubmission): void {
  try {
    const raw = window.localStorage.getItem(CONSULT_STORAGE_KEY);
    const existing: ConsultationSubmission[] = raw ? (JSON.parse(raw) as ConsultationSubmission[]) : [];
    const list = Array.isArray(existing) ? existing : [];
    list.push(entry);
    window.localStorage.setItem(CONSULT_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Non-fatal in storage-restricted contexts
  }
}

export function ConsultationModal({
  locale,
  open,
  context,
  onClose,
}: ConsultationModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const submitLockRef = useRef<boolean>(false);
  const submittedAtMsRef = useRef<number>(0);
  const backdropMouseDownRef = useRef<boolean>(false);

  const [fullName, setFullName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [preferredMethod, setPreferredMethod] = useState<ContactMethod>('whatsapp');
  const [purpose, setPurpose] = useState<ConsultationPurpose>('investment');
  const [notes, setNotes] = useState<string>('');
  const [errors, setErrors] = useState<
    Partial<Record<'fullName' | 'phone' | 'preferredMethod' | 'purpose', ConsultationErrorKey>>
  >({});
  const [submission, setSubmission] = useState<ConsultationSubmission | null>(null);

  useDialogFocusTrap(dialogRef, open);

  // Reset receipt & errors only when modal freshly opens (NOT on mid-modal locale flip!)
  useEffect(() => {
    if (open) {
      submitLockRef.current = false;
      submittedAtMsRef.current = 0;
      backdropMouseDownRef.current = false;
      setSubmission(null);
      setErrors({});
      if (context.shortlistProjectIds.length >= 2) {
        setPurpose('comparison');
      }
    }
  }, [open, context.shortlistProjectIds.length]);

  if (!open) return null;

  const t = getTranslations(locale);

  const activeGov = context.governorateId
    ? GOVERNORATE_BY_ID.get(context.governorateId) ?? null
    : null;
  const activeProject = context.projectId
    ? PROJECT_BY_ID.get(context.projectId) ?? null
    : null;
  const activeZone =
    activeProject && context.zoneId
      ? activeProject.masterPlan.zones.find((z) => z.id === context.zoneId) ?? null
      : null;
  const shortlistProjects = context.shortlistProjectIds
    .map((id) => PROJECT_BY_ID.get(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const buildBriefText = (refId: string, clientName: string): string => {
    const lines: string[] = [t.consultation.waGreeting];
    if (clientName.trim()) {
      lines.push(`${t.consultation.nameLabel}: ${clientName.trim()}`);
    }
    if (activeProject) {
      lines.push(`${t.consultation.waProjectLabel}: ${localize(activeProject.name, locale)}`);
    }
    if (activeGov) {
      lines.push(`${t.consultation.waGovLabel}: ${localize(activeGov.name, locale)}`);
    }
    if (activeZone) {
      lines.push(
        `${t.consultation.waZoneLabel}: ${activeZone.code} · ${localize(activeZone.name, locale)}`,
      );
    }
    if (shortlistProjects.length > 0) {
      const names = shortlistProjects.map((p) => localize(p.name, locale)).join('، ');
      lines.push(`${t.consultation.waShortlistLabel}: ${names}`);
    }
    lines.push(`${t.consultation.waPurposeLabel}: ${t.consultation.purposeOptions[purpose]}`);
    lines.push(`${t.consultation.waRefLabel}: ${refId}`);
    if (notes.trim()) {
      lines.push(notes.trim());
    }
    return lines.join('\n');
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (submitLockRef.current || submission !== null) return;

    const validation = validateConsultationForm({
      fullName,
      phone,
      preferredMethod,
      purpose,
      notes,
    });

    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    submitLockRef.current = true;
    submittedAtMsRef.current = Date.now();
    setErrors({});

    const refId = generateReferenceId();
    const record: ConsultationSubmission = {
      referenceId: refId,
      submittedAt: new Date().toISOString(),
      locale,
      fullName: fullName.trim(),
      phoneRaw: phone.trim(),
      phoneNormalized: validation.phoneNormalized,
      preferredMethod,
      purpose,
      notes: notes.trim(),
      context: {
        governorateId: context.governorateId,
        projectId: context.projectId,
        zoneId: context.zoneId,
        shortlistProjectIds: [...context.shortlistProjectIds],
      },
    };

    persistSubmission(record);
    setSubmission(record);
  };

  const receiptWaHref = submission
    ? buildWhatsAppUrl(
        CONSULTANT_PROFILE.contact.whatsappE164,
        buildBriefText(submission.referenceId, submission.fullName),
      )
    : '';

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        backdropMouseDownRef.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (
          e.target === e.currentTarget &&
          backdropMouseDownRef.current &&
          Date.now() - submittedAtMsRef.current > 450
        ) {
          onClose();
        }
        backdropMouseDownRef.current = false;
      }}
    >
      <div
        ref={dialogRef}
        id="consult-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="consult-dialog-title"
        className="modal-dialog surface-plaster anim-panel-reveal"
      >
        <div className="modal-header">
          <div>
            <h2 id="consult-dialog-title">{t.consultation.modalTitle}</h2>
            <p className="form-hint">{t.consultation.modalSubtitle}</p>
          </div>

          <button
            id="consult-close-btn"
            type="button"
            className="btn btn--ghost btn--sm btn--icon"
            onClick={onClose}
            aria-label={t.consultation.closeLabel}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {/* Context Banner */}
        <div className="consult-context-box">
          <span className="eyebrow">{t.consultation.contextHeading}</span>
          <div className="consult-context-tags">
            {activeGov ? (
              <span className="badge badge--neutral">
                {t.consultation.contextGovernorate}: {localize(activeGov.name, locale)}
              </span>
            ) : null}
            {activeProject ? (
              <span className="badge badge--brass">
                {t.consultation.contextProject}: {localize(activeProject.name, locale)}
              </span>
            ) : null}
            {activeZone ? (
              <span className="badge badge--mediterranean">
                {t.consultation.contextZone}: {activeZone.code} ·{' '}
                {localize(activeZone.name, locale)}
              </span>
            ) : null}
            {shortlistProjects.map((sp) => (
              <span key={sp.id} className="badge badge--neutral">
                {localize(sp.name, locale)}
              </span>
            ))}
            {!activeGov && !activeProject && shortlistProjects.length === 0 ? (
              <span className="badge badge--neutral">
                {t.consultation.contextGeneral}
              </span>
            ) : null}
          </div>
        </div>

        {submission ? (
          <div id="consult-confirmation" className="receipt-card" role="status">
            <div className="receipt-header">
              <CheckCircle2 size={22} className="receipt-icon" aria-hidden="true" />
              <div>
                <h3>{t.consultation.receiptTitle}</h3>
                <p className="form-hint">{t.consultation.receiptSubtitle}</p>
              </div>
            </div>

            <div className="receipt-ref-row">
              <span>{t.consultation.referenceIdLabel}:</span>
              <strong id="consult-reference-id" className="tabular-nums">
                {submission.referenceId}
              </strong>
            </div>

            <p className="form-hint">{t.consultation.savedNotice}</p>

            <a
              id="consult-whatsapp-link"
              href={receiptWaHref}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--primary"
            >
              <MessageCircle size={16} aria-hidden="true" />
              <span>{t.consultation.sendWhatsAppCta}</span>
            </a>
          </div>
        ) : (
          <form id="consult-form" className="consult-form" onSubmit={handleSubmit} noValidate>
            <div className="form-field">
              <label htmlFor="consult-name" className="form-label">
                {t.consultation.nameLabel}
              </label>
              <input
                id="consult-name"
                type="text"
                className="form-input"
                value={fullName}
                placeholder={t.consultation.namePlaceholder}
                aria-invalid={errors.fullName ? 'true' : 'false'}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (errors.fullName) {
                    setErrors((prev) => ({ ...prev, fullName: undefined }));
                  }
                }}
              />
              {errors.fullName ? (
                <span className="form-error" role="alert">
                  {t.consultation.errors[errors.fullName]}
                </span>
              ) : null}
            </div>

            <div className="form-field">
              <label htmlFor="consult-phone" className="form-label">
                {t.consultation.phoneLabel}
              </label>
              <input
                id="consult-phone"
                type="tel"
                dir="ltr"
                className="form-input"
                value={phone}
                placeholder={t.consultation.phonePlaceholder}
                aria-invalid={errors.phone ? 'true' : 'false'}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (errors.phone) {
                    setErrors((prev) => ({ ...prev, phone: undefined }));
                  }
                }}
              />
              <span className="form-hint">{t.consultation.phoneHint}</span>
              {errors.phone ? (
                <span className="form-error" role="alert">
                  {t.consultation.errors[errors.phone]}
                </span>
              ) : null}
            </div>

            <div className="consult-form-row">
              <div className="form-field">
                <label htmlFor="consult-method" className="form-label">
                  {t.consultation.methodLabel}
                </label>
                <select
                  id="consult-method"
                  className="form-select"
                  value={preferredMethod}
                  aria-invalid={errors.preferredMethod ? 'true' : 'false'}
                  onChange={(e) => setPreferredMethod(e.target.value as ContactMethod)}
                >
                  {CONTACT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {t.consultation.methodOptions[m]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="consult-purpose" className="form-label">
                  {t.consultation.purposeLabel}
                </label>
                <select
                  id="consult-purpose"
                  className="form-select"
                  value={purpose}
                  aria-invalid={errors.purpose ? 'true' : 'false'}
                  onChange={(e) => setPurpose(e.target.value as ConsultationPurpose)}
                >
                  {PURPOSES.map((p) => (
                    <option key={p} value={p}>
                      {t.consultation.purposeOptions[p]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="consult-notes" className="form-label">
                {t.consultation.notesLabel}
              </label>
              <textarea
                id="consult-notes"
                className="form-textarea"
                value={notes}
                placeholder={t.consultation.notesPlaceholder}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <button
              id="consult-submit-btn"
              type="submit"
              className="btn btn--primary"
            >
              {t.consultation.submitCta}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
