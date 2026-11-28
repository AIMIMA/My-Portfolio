import type {
  ConsultationErrorKey,
  ConsultationPurpose,
  ContactMethod,
} from '../types/portfolio';

export interface PhoneValidationResult {
  valid: boolean;
  normalized: string;
  errorKey?: ConsultationErrorKey;
}

export interface ConsultationFormInput {
  fullName: string;
  phone: string;
  preferredMethod: ContactMethod | '';
  purpose: ConsultationPurpose | '';
  notes?: string;
}

export interface ConsultationValidationResult {
  valid: boolean;
  phoneNormalized: string;
  errors: Partial<Record<'fullName' | 'phone' | 'preferredMethod' | 'purpose', ConsultationErrorKey>>;
}

const VALID_METHODS: ReadonlySet<string> = new Set<ContactMethod>([
  'whatsapp',
  'phone',
  'email',
]);

const VALID_PURPOSES: ReadonlySet<string> = new Set<ConsultationPurpose>([
  'investment',
  'residence',
  'vacation_home',
  'commercial',
  'comparison',
]);

const REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Invisible Unicode bidi control marks (incl. U+061C Arabic Letter Mark) and zero-width chars */
const INVISIBLE_BIDI_RE = /[\u061C\u200B\u200E\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;

/**
 * Converts Arabic-Indic (٠-٩) and Extended Arabic-Indic (۰-۹) digits to ASCII 0-9.
 */
export function normalizeDigits(raw: string): string {
  if (!raw) return '';
  let out = '';
  for (let i = 0; i < raw.length; i++) {
    const code = raw.charCodeAt(i);
    if (code >= 0x0660 && code <= 0x0669) {
      out += String.fromCharCode(code - 0x0660 + 0x30);
    } else if (code >= 0x06f0 && code <= 0x06f9) {
      out += String.fromCharCode(code - 0x06f0 + 0x30);
    } else {
      out += raw[i] ?? '';
    }
  }
  return out;
}

/**
 * Validates Egyptian mobile numbers (010/011/012/015 with optional +20/0020/20 prefix)
 * and non-Egyptian E.164 international numbers (+ or 00 followed by 10–15 digits).
 * Strictly guards Egyptian prefixes FIRST so invalid Egyptian numbers like +201912345678
 * are rejected rather than slipping through international fallback.
 */
export function validatePhone(raw: string): PhoneValidationResult {
  const ascii = normalizeDigits(raw).replace(INVISIBLE_BIDI_RE, '').trim();
  if (!ascii) {
    return { valid: false, normalized: '', errorKey: 'phoneRequired' };
  }

  // Only digits, spaces, hyphens, parentheses, dots, and an optional leading '+'
  if (!/^[\d\s\-().+]+$/.test(ascii) || ascii.indexOf('+', 1) !== -1) {
    return { valid: false, normalized: '', errorKey: 'phoneInvalidFormat' };
  }

  const compact = ascii.replace(/[\s\-().]/g, '');

  // 1. Egyptian country-code guard FIRST (+20 / 0020 / 201... / 2001...)
  const hasEgyptCountryCode =
    compact.startsWith('+20') ||
    compact.startsWith('0020') ||
    /^20(?:0?1)\d{9}$/.test(compact);

  if (hasEgyptCountryCode) {
    let sub: string;
    if (compact.startsWith('+20')) {
      sub = compact.slice(3);
    } else if (compact.startsWith('0020')) {
      sub = compact.slice(4);
    } else {
      sub = compact.slice(2);
    }

    if (sub.length === 11 && sub.startsWith('01')) {
      sub = sub.slice(1);
    }

    if (/^1[0125]\d{8}$/.test(sub)) {
      return { valid: true, normalized: `+20${sub}` };
    }
    if (/^1[^0125]\d{8}$/.test(sub)) {
      return {
        valid: false,
        normalized: '',
        errorKey: 'phoneInvalidEgyptianPrefix',
      };
    }
    return { valid: false, normalized: '', errorKey: 'phoneInvalidFormat' };
  }

  // 2. Local Egyptian mobile (01...)
  if (compact.startsWith('01')) {
    if (/^01[0125]\d{8}$/.test(compact)) {
      return { valid: true, normalized: `+20${compact.slice(1)}` };
    }
    if (/^01[^0125]\d{8}$/.test(compact)) {
      return {
        valid: false,
        normalized: '',
        errorKey: 'phoneInvalidEgyptianPrefix',
      };
    }
    return { valid: false, normalized: '', errorKey: 'phoneInvalidFormat' };
  }

  // 3. International E.164 (non-Egypt, 10–15 digits starting with 1-9)
  if (compact.startsWith('+')) {
    const digits = compact.slice(1);
    if (/^[1-9]\d{9,14}$/.test(digits)) {
      return { valid: true, normalized: `+${digits}` };
    }
    return { valid: false, normalized: '', errorKey: 'phoneInvalidFormat' };
  }

  if (compact.startsWith('00')) {
    const digits = compact.slice(2);
    if (/^[1-9]\d{9,14}$/.test(digits)) {
      return { valid: true, normalized: `+${digits}` };
    }
    return { valid: false, normalized: '', errorKey: 'phoneInvalidFormat' };
  }

  return { valid: false, normalized: '', errorKey: 'phoneInvalidFormat' };
}

/**
 * Validates all required Consultation Booking fields against frozen domain unions.
 */
export function validateConsultationForm(
  input: ConsultationFormInput,
): ConsultationValidationResult {
  const errors: ConsultationValidationResult['errors'] = {};

  const trimmedName = input.fullName.replace(INVISIBLE_BIDI_RE, '').trim();
  if (!trimmedName) {
    errors.fullName = 'nameRequired';
  } else if (trimmedName.length < 2) {
    errors.fullName = 'nameTooShort';
  }

  const phoneResult = validatePhone(input.phone);
  if (!phoneResult.valid && phoneResult.errorKey) {
    errors.phone = phoneResult.errorKey;
  }

  if (!input.preferredMethod || !VALID_METHODS.has(input.preferredMethod)) {
    errors.preferredMethod = 'methodRequired';
  }

  if (!input.purpose || !VALID_PURPOSES.has(input.purpose)) {
    errors.purpose = 'purposeRequired';
  }

  const valid = Object.keys(errors).length === 0;
  return {
    valid,
    phoneNormalized: phoneResult.valid ? phoneResult.normalized : '',
    errors,
  };
}

/**
 * Builds a properly UTF-8 encoded WhatsApp click-to-chat URL.
 */
export function buildWhatsAppUrl(phoneOrE164: string, message: string): string {
  const checked = validatePhone(phoneOrE164);
  const digits = (checked.valid ? checked.normalized : normalizeDigits(phoneOrE164)).replace(/\D/g, '');
  const trimmed = message.trim();
  if (!trimmed) {
    return `https://wa.me/${digits}`;
  }
  return `https://wa.me/${digits}?text=${encodeURIComponent(trimmed)}`;
}

/**
 * Generates an unambiguous consultation reference ID (`REQ-YYYY-XXXX`).
 * Accepts an optional deterministic numeric seed for repeatable unit testing.
 */
export function generateReferenceId(date: Date = new Date(), seed?: number): string {
  const year = date.getUTCFullYear();
  const base = REF_ALPHABET.length; // 32
  let code = '';

  if (typeof seed === 'number' && Number.isFinite(seed)) {
    // SplitMix32 full-avalanche deterministic 32-bit PRNG (avoids power-of-2 LCG low-bit period collapse)
    let state = (Math.trunc(seed) ^ 0x9e3779b9) >>> 0;
    for (let i = 0; i < 4; i++) {
      state = (state + 0x9e3779b9) >>> 0;
      let z = state;
      z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
      z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
      z = (z ^ (z >>> 16)) >>> 0;
      const idx = (z >>> 27) % base;
      code += REF_ALPHABET[idx] ?? 'A';
    }
  } else {
    for (let i = 0; i < 4; i++) {
      const idx = Math.floor(Math.random() * base) % base;
      code += REF_ALPHABET[idx] ?? 'A';
    }
  }

  return `REQ-${year}-${code}`;
}
