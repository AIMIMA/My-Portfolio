import { describe, expect, it } from 'vitest';
import {
  buildWhatsAppUrl,
  generateReferenceId,
  normalizeDigits,
  validateConsultationForm,
  validatePhone,
} from '../validation';

describe('Phone Validation, Consultation Form Validation, WhatsApp URL & Reference ID', () => {
  it('converts Arabic-Indic and Extended Arabic-Indic digits to ASCII', () => {
    expect(normalizeDigits('٠١٠١٢٣٤٥٦٧٨')).toBe('01012345678');
    expect(normalizeDigits('۰۱۲۳۴۵۶۷۸۹')).toBe('0123456789');
  });

  it('accepts valid Egyptian mobile variants (010/011/012/015, +20, 0020, 20, formatted, Arabic-Indic) and international E.164', () => {
    const validCases: Array<[string, string]> = [
      ['01012345678', '+201012345678'],
      ['01198765432', '+201198765432'],
      ['01280249440', '+201280249440'],
      ['01555551234', '+201555551234'],
      ['+20 101 234 5678', '+201012345678'],
      ['00201280249440', '+201280249440'],
      ['201112345678', '+201112345678'],
      ['+20 (015) 1234-5678', '+201512345678'],
      ['٠١٠١٢٣٤٥٦٧٨', '+201012345678'],
      ['+971 50 123 4567', '+971501234567'],
      ['00966501234567', '+966501234567'],
      ['+44 7911 123456', '+447911123456'],
      ['\u200E+20 128 024 9440', '+201280249440'],
      ['\u202A01280249440\u202C', '+201280249440'],
      ['\u061C+20 128 024 9440\u061C', '+201280249440'],
      ['\u061C\u200B01280249440\uFEFF', '+201280249440'],
    ];

    for (const [input, expected] of validCases) {
      const res = validatePhone(input);
      expect(res.valid, `Expected valid for "${input}"`).toBe(true);
      expect(res.normalized).toBe(expected);
      expect(res.errorKey).toBeUndefined();
    }
  });

  it('strictly rejects empty, short, malformed, and invalid Egyptian prefixes (+2019... / 019...) before international fallback', () => {
    expect(validatePhone('')).toEqual({
      valid: false,
      normalized: '',
      errorKey: 'phoneRequired',
    });
    expect(validatePhone('   ')).toEqual({
      valid: false,
      normalized: '',
      errorKey: 'phoneRequired',
    });

    // Critical tie-breaker EC-09 guard: Egyptian country code + invalid prefix MUST fail with phoneInvalidEgyptianPrefix
    for (const invalidEgypt of [
      '01912345678',
      '+201912345678',
      '00201912345678',
      '201912345678',
      '+2001312345678',
      '01412345678',
      '\u061C+20 191 234 5678\u061C',
    ]) {
      const res = validatePhone(invalidEgypt);
      expect(res.valid, `Expected rejection for "${invalidEgypt}"`).toBe(false);
      expect(res.errorKey).toBe('phoneInvalidEgyptianPrefix');
    }

    for (const invalidFormat of [
      '12345',
      '+201012345',
      '+01234567890',
      '001234',
      'abc01012345678',
      '010+12345678',
    ]) {
      const res = validatePhone(invalidFormat);
      expect(res.valid, `Expected format rejection for "${invalidFormat}"`).toBe(false);
      expect(res.errorKey).toBe('phoneInvalidFormat');
    }
  });

  it('validates consultation form using frozen ContactMethod and ConsultationPurpose unions', () => {
    const invalid = validateConsultationForm({
      fullName: 'A',
      phone: '01912345678',
      preferredMethod: '',
      purpose: '',
    });
    expect(invalid.valid).toBe(false);
    expect(invalid.errors).toEqual({
      fullName: 'nameTooShort',
      phone: 'phoneInvalidEgyptianPrefix',
      preferredMethod: 'methodRequired',
      purpose: 'purposeRequired',
    });

    const valid = validateConsultationForm({
      fullName: 'أحمد محمود',
      phone: '01012345678',
      preferredMethod: 'whatsapp',
      purpose: 'investment',
      notes: 'مهتم بمشروع صواري',
    });
    expect(valid.valid).toBe(true);
    expect(valid.phoneNormalized).toBe('+201012345678');
    expect(valid.errors).toEqual({});

    const comparisonPhone = validateConsultationForm({
      fullName: 'Sara Ali',
      phone: '+971501234567',
      preferredMethod: 'phone',
      purpose: 'comparison',
    });
    expect(comparisonPhone.valid).toBe(true);
    expect(comparisonPhone.phoneNormalized).toBe('+971501234567');

    // Invisible bidi / zero-width-only names must fail validation cleanly
    const bidiOnlyName = validateConsultationForm({
      fullName: '\u200E\u200F',
      phone: '01280249440',
      preferredMethod: 'whatsapp',
      purpose: 'investment',
    });
    expect(bidiOnlyName.valid).toBe(false);
    expect(bidiOnlyName.errors.fullName).toBe('nameRequired');

    const almAndZwspName = validateConsultationForm({
      fullName: '\u061C\u200B\uFEFF',
      phone: '01280249440',
      preferredMethod: 'whatsapp',
      purpose: 'investment',
    });
    expect(almAndZwspName.valid).toBe(false);
    expect(almAndZwspName.errors.fullName).toBe('nameRequired');

    const singleCharWithBidi = validateConsultationForm({
      fullName: '\u200EA\u200F',
      phone: '01280249440',
      preferredMethod: 'whatsapp',
      purpose: 'investment',
    });
    expect(singleCharWithBidi.valid).toBe(false);
    expect(singleCharWithBidi.errors.fullName).toBe('nameTooShort');
  });

  it('builds properly UTF-8 encoded WhatsApp URLs', () => {
    const msg = 'مرحباً أ/ عبدالله، أرغب في استشارة عن صواري الإسكندرية';
    const url = buildWhatsAppUrl('+20 128 024 9440', msg);
    expect(url.startsWith('https://wa.me/201280249440?text=')).toBe(true);
    const decoded = decodeURIComponent(url.split('?text=')[1] ?? '');
    expect(decoded).toBe(msg);

    expect(buildWhatsAppUrl('+201280249440', '   ')).toBe('https://wa.me/201280249440');

    const localUrl = buildWhatsAppUrl('01280249440', msg);
    expect(localUrl.startsWith('https://wa.me/201280249440?text=')).toBe(true);
    expect(decodeURIComponent(localUrl.split('?text=')[1] ?? '')).toBe(msg);
  });

  it('generates REQ-YYYY-XXXX reference IDs with deterministic seed support', () => {
    const fixedDate = new Date('2026-11-23T12:00:00Z');
    const refA = generateReferenceId(fixedDate, 42);
    const refB = generateReferenceId(fixedDate, 42);
    const refC = generateReferenceId(fixedDate, 99);

    expect(refA).toMatch(/^REQ-2026-[A-HJ-NP-Z2-9]{4}$/);
    expect(refA).toBe(refB);
    expect(refA).not.toBe(refC);

    const randomRef = generateReferenceId(fixedDate);
    expect(randomRef).toMatch(/^REQ-2026-[A-HJ-NP-Z2-9]{4}$/);

    // Anti-period-32 regression: 500 consecutive seeds must yield >= 495 unique IDs
    const seen500 = new Set<string>();
    for (let s = 0; s < 500; s++) {
      const id = generateReferenceId(fixedDate, s);
      expect(id).toMatch(/^REQ-2026-[A-HJ-NP-Z2-9]{4}$/);
      expect(generateReferenceId(fixedDate, s)).toBe(id);
      seen500.add(id);
    }
    expect(seen500.size).toBeGreaterThanOrEqual(495);

    // Consecutive seeds separated by 32 must NOT collapse to identical outputs
    let period32Matches = 0;
    for (let s = 0; s < 64; s++) {
      if (generateReferenceId(fixedDate, s) === generateReferenceId(fixedDate, s + 32)) {
        period32Matches++;
      }
    }
    expect(period32Matches).toBe(0);

    // Broad distribution across 10,000 seeds (near-zero birthday collisions in 32^4 space)
    const seen10k = new Set<string>();
    for (let s = 0; s < 10_000; s++) {
      seen10k.add(generateReferenceId(fixedDate, s));
    }
    expect(seen10k.size).toBeGreaterThanOrEqual(9_900);
  });
});
