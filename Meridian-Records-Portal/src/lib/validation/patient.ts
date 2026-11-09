// Zod schemas for patient registration and orders (pure, unit-tested).
import { z } from 'zod';

/** Bangladeshi mobile, stored as 11 digits (SPEC 6). */
export const PHONE_RE = /^01[3-9]\d{8}$/;
/** Latin letters, spaces and . ' - only: the English PDF font cannot encode Bengali. */
export const NAME_RE = /^[A-Za-z .'-]+$/;
export const TEST_CODE_RE = /^[A-Z0-9]{2,12}$/;

/** Accepts "+880 1712-345678", "8801712345678", "01712 345678" -> "01712345678". */
export function normalisePhone(raw: string): string {
  let digits = raw.replace(/[\s\-().]/g, '');
  if (digits.startsWith('+880')) digits = `0${digits.slice(4)}`;
  else if (digits.startsWith('880') && digits.length === 13) digits = `0${digits.slice(3)}`;
  return digits;
}

export function normaliseName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

export const phoneSchema = z.string().transform(normalisePhone).pipe(z.string().regex(PHONE_RE));
export const nameSchema = z.string().transform(normaliseName).pipe(z.string().min(2).max(80).regex(NAME_RE));
export const testCodesSchema = z.array(z.string().regex(TEST_CODE_RE)).min(1).max(20);

export const registerSchema = z
  .object({
    fullName: nameSchema,
    // Not z.coerce: that would turn an empty field into 0 years.
    ageYears: z
      .string()
      .trim()
      .regex(/^\d{1,3}$/)
      .transform(Number)
      .pipe(z.number().int().min(0).max(120)),
    sex: z.enum(['female', 'male', 'other']),
    phone: phoneSchema,
    email: z
      .string()
      .trim()
      .max(254)
      .transform((v) => (v === '' ? null : v.toLowerCase()))
      .pipe(z.email().nullable()),
    preferredChannel: z.enum(['sms_demo', 'email']),
    language: z.enum(['bn', 'en']),
    emailOptIn: z.boolean(),
    consent: z.literal(true),
    tests: testCodesSchema,
  })
  .superRefine((v, ctx) => {
    if (v.emailOptIn && !v.email) {
      ctx.addIssue({ code: 'custom', path: ['email'], message: 'email_required_for_opt_in' });
    }
    if (v.preferredChannel === 'email' && (!v.email || !v.emailOptIn)) {
      ctx.addIssue({ code: 'custom', path: ['preferredChannel'], message: 'email_channel_needs_opt_in' });
    }
  });

export type RegisterInput = z.input<typeof registerSchema>;
export type RegisterField = keyof RegisterInput;

/** Plain-language messages per field (errors are described in text, SPEC 14). */
export const FIELD_MESSAGES: Record<RegisterField, string> = {
  fullName: 'Enter the full name in English letters (2–80 characters). Spaces, dots, apostrophes and hyphens are allowed.',
  ageYears: 'Enter the age in whole years, from 0 to 120.',
  sex: 'Choose female, male or other.',
  phone: 'Enter a Bangladeshi mobile number with 11 digits, for example 01712345678.',
  email: 'Enter a valid email address, or leave it empty. An email is needed for email notifications.',
  preferredChannel: 'Email can only be the preferred channel when an email address is given and the patient agrees to email notifications.',
  language: 'Choose Bangla or English.',
  emailOptIn: 'Choose whether the patient agrees to email notifications.',
  consent: 'The privacy notice must be shown and the patient must agree before registration.',
  tests: 'Select at least one test.',
};

export const newOrderSchema = z.object({
  patientId: z.uuid(),
  tests: testCodesSchema,
});
