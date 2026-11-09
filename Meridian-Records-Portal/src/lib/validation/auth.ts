// Zod schemas for staff auth forms (pure, unit-tested).
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(200),
  next: z.string().max(200).optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.email().max(254),
});

/** Matches the Supabase project rule: 10+ chars with lower, upper and a digit. */
export const newPasswordSchema = z
  .object({
    password: z
      .string()
      .min(10)
      .max(72)
      .regex(/[a-z]/)
      .regex(/[A-Z]/)
      .regex(/[0-9]/),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'] });

export const PASSWORD_RULE_TEXT = 'At least 10 characters, with upper and lower case letters and a number.';
