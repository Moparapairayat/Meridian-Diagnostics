'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { LANG_COOKIE } from '@/lib/i18n';
import { OTP_RE, hashIp } from '@/lib/otp/otp-core';
import { issueCode, requestOtp, verifyOtp } from '@/lib/otp/otp';
import { clearPendingChallenge, createPortalSession, getPendingChallenge, setPendingChallenge } from '@/lib/portal/session';
import { phoneSchema } from '@/lib/validation/patient';

export interface PortalState {
  step: 'request' | 'code';
  /** i18n key of an error or note to show. */
  messageKey?: 'portal.invalidInput' | 'portal.wrongCode' | 'portal.locked' | 'portal.tooMany' | 'portal.expired' | 'portal.newCodeSent';
  destination?: string;
  demoCode?: string;
  fellBack?: boolean;
  /** Epoch ms when "send a new code" becomes available. */
  resendAt?: number;
  attempt: number;
}

const requestSchema = z.object({
  patientCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^MD-\d{4}-\d{5,}$/),
  phone: phoneSchema,
  channel: z.enum(['sms_demo', 'email']),
});

async function clientIpHash(): Promise<string | null> {
  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || '';
  const secret = process.env.OTP_SECRET;
  return ip && secret ? hashIp(secret, ip) : null;
}

/** Step 1: Patient ID + mobile + channel. Same answer whether or not they match. */
export async function requestCode(prev: PortalState, formData: FormData): Promise<PortalState> {
  const attempt = prev.attempt + 1;
  const parsed = requestSchema.safeParse({
    patientCode: formData.get('patientCode'),
    phone: formData.get('phone'),
    channel: formData.get('channel'),
  });
  if (!parsed.success) return { step: 'request', messageKey: 'portal.invalidInput', attempt };

  const outcome = await requestOtp({ ...parsed.data, ipHash: await clientIpHash() });
  await setPendingChallenge({ patientId: outcome.patientId, destination: outcome.destination, channel: parsed.data.channel });

  return {
    step: 'code',
    destination: outcome.destination,
    demoCode: outcome.demoCode,
    fellBack: outcome.demoCode ? outcome.fellBack : undefined,
    resendAt: Date.now() + 60_000,
    attempt,
  };
}

/** Step 2: the 6-digit code. Success starts the 15-minute portal session. */
export async function submitCode(prev: PortalState, formData: FormData): Promise<PortalState> {
  const attempt = prev.attempt + 1;
  const pending = await getPendingChallenge();
  if (!pending) return { step: 'request', messageKey: 'portal.expired', attempt };

  const code = String(formData.get('code') ?? '').replace(/\s/g, '');
  const keep = { step: 'code' as const, destination: pending.destination, resendAt: prev.resendAt, attempt };
  if (!OTP_RE.test(code)) return { ...keep, messageKey: 'portal.wrongCode' };

  const outcome = await verifyOtp(pending.patientId, code);
  if (!outcome.ok) return { ...keep, messageKey: outcome.locked ? 'portal.locked' : 'portal.wrongCode' };

  await createPortalSession(pending.patientId!);
  // Show the portal in the patient's registered language unless they chose one.
  const store = await cookies();
  if (!store.get(LANG_COOKIE)) {
    store.set(LANG_COOKIE, outcome.language, { path: '/', sameSite: 'lax', secure: true, maxAge: 60 * 60 * 24 * 365 });
  }
  await clearPendingChallenge();
  redirect('/portal/reports');
}

/** "Send a new code": 60 s after the last one, at most 3 in 15 minutes. */
export async function resendCode(prev: PortalState): Promise<PortalState> {
  const attempt = prev.attempt + 1;
  const pending = await getPendingChallenge();
  if (!pending) return { step: 'request', messageKey: 'portal.expired', attempt };

  if (!pending.patientId) {
    // Unmatched details: behave like a normal resend, without issuing anything.
    return { step: 'code', destination: pending.destination, messageKey: 'portal.newCodeSent', resendAt: Date.now() + 60_000, attempt };
  }

  const outcome = await issueCode(pending.patientId, pending.channel, await clientIpHash());
  if (outcome.rateLimited) {
    return {
      step: 'code',
      destination: pending.destination,
      messageKey: 'portal.tooMany',
      resendAt: Date.now() + (outcome.retryAfterSeconds ?? 60) * 1000,
      attempt,
    };
  }
  return {
    step: 'code',
    destination: pending.destination,
    demoCode: outcome.demoCode,
    fellBack: outcome.demoCode ? outcome.fellBack : undefined,
    messageKey: 'portal.newCodeSent',
    resendAt: Date.now() + 60_000,
    attempt,
  };
}

/** Single entry point for the portal form (intent = request | code | resend). */
export async function portalAction(prev: PortalState, formData: FormData): Promise<PortalState> {
  switch (formData.get('intent')) {
    case 'code':
      return submitCode(prev, formData);
    case 'resend':
      return resendCode(prev);
    case 'restart':
      await clearPendingChallenge();
      return { step: 'request', attempt: prev.attempt + 1 };
    default:
      return requestCode(prev, formData);
  }
}
