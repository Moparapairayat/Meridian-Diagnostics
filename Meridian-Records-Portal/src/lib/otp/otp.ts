import 'server-only';
import { randomUUID } from 'node:crypto';
import { logAdminEvent } from '@/lib/audit-admin';
import { maskPhone } from '@/lib/format';
import { normaliseLang, type Lang } from '@/lib/i18n';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  ISSUE_WINDOW_MS,
  LOCK_MS,
  OTP_TTL_MS,
  canIssueCode,
  generateOtpCode,
  hashOtp,
  isLocked,
  shouldLock,
  verifyOtpHash,
} from './otp-core';
import { DemoSmsSender } from './senders/demo-sms';
import { EmailOtpSender } from './senders/email';
import type { OtpChannel, OtpSender } from './senders/types';

// OTP service for the patient portal (SPEC 8.1). Uses the admin client, so it
// enforces every rule itself and writes the audit rows explicitly.

function otpSecret(): string {
  const s = process.env.OTP_SECRET;
  if (!s || s.length < 32) throw new Error('OTP_SECRET is not configured.');
  return s;
}

export interface RequestOtpInput {
  patientCode: string;
  phone: string;
  channel: OtpChannel;
  ipHash: string | null;
}

export interface RequestOtpOutcome {
  /** null when the Patient ID and phone do not match (never revealed to the page). */
  patientId: string | null;
  /** Always shown as "sent to": the typed phone, masked. */
  destination: string;
  /** Demo mode only, and only when a code was actually issued. */
  demoCode?: string;
  /** Email was chosen but unavailable, so Demo SMS was used. */
  fellBack?: boolean;
  /** Only reported for resends on the code screen. */
  rateLimited?: boolean;
  /** Seconds until another code may be requested. */
  retryAfterSeconds?: number;
}

const senders: Record<OtpChannel, OtpSender> = {
  sms_demo: new DemoSmsSender(),
  email: new EmailOtpSender(),
};

async function findPatient(patientCode: string, phone: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from('patients')
    .select('id, phone, email, email_opt_in, language')
    .eq('patient_code', patientCode)
    .eq('phone', phone)
    .maybeSingle();
  return data;
}

async function lockedUntil(patientId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin.from('portal_locks').select('locked_until').eq('patient_id', patientId).maybeSingle();
  return data && isLocked(data.locked_until) ? data.locked_until : null;
}

/** Issue a code for an identified patient (used by the first request and by resend). */
export async function issueCode(patientId: string, channel: OtpChannel, ipHash: string | null): Promise<RequestOtpOutcome> {
  const admin = createAdminClient();
  const { data: patient } = await admin
    .from('patients')
    .select('id, phone, email, email_opt_in, language')
    .eq('id', patientId)
    .maybeSingle();
  if (!patient) return { patientId: null, destination: '' };
  const destination = maskPhone(patient.phone);

  if (await lockedUntil(patient.id)) return { patientId: patient.id, destination };

  const since = new Date(Date.now() - ISSUE_WINDOW_MS).toISOString();
  const { data: recent } = await admin.from('portal_otps').select('created_at').eq('patient_id', patient.id).gte('created_at', since);
  const decision = canIssueCode((recent ?? []).map((r) => r.created_at));
  if (!decision.ok) {
    return { patientId: patient.id, destination, rateLimited: true, retryAfterSeconds: Math.ceil(decision.retryAfterMs / 1000) };
  }

  // If Email is chosen but there is no email with opt-in, use SMS (demo).
  const emailPossible = channel === 'email' && !!patient.email && patient.email_opt_in;
  let used: OtpChannel = emailPossible ? 'email' : 'sms_demo';
  const lang: Lang = normaliseLang(patient.language);

  const otpId = randomUUID();
  const code = generateOtpCode();
  const { error } = await admin.from('portal_otps').insert({
    id: otpId,
    patient_id: patient.id,
    channel: used,
    code_hash: hashOtp(otpSecret(), otpId, code),
    expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
    ip_hash: ipHash,
  });
  if (error) {
    console.warn('otp: insert failed', error.code);
    return { patientId: patient.id, destination };
  }

  let result = await senders[used].send(used === 'email' ? patient.email! : patient.phone, code, lang);
  let fellBack = false;
  if (!result.delivered && used === 'email') {
    // Email is switched on in Phase 7; until then the demo SMS carries the code.
    used = 'sms_demo';
    fellBack = true;
    await admin.from('portal_otps').update({ channel: 'sms_demo' }).eq('id', otpId);
    result = await senders.sms_demo.send(patient.phone, code, lang);
  }

  // Every send is recorded, masked, without the code (SPEC 9).
  await admin.from('notifications').insert({
    type: 'otp_code',
    channel: used,
    recipient_masked: destination,
    patient_id: patient.id,
    status: result.delivered ? 'sent' : 'failed',
    provider_message_id: result.providerMessageId ?? null,
    error: result.delivered ? null : 'not delivered',
  });

  return { patientId: patient.id, destination, demoCode: result.displayCode, fellBack };
}

/**
 * First request from /portal. The outcome is the same shape whether or not
 * the details match; only demo mode reveals a code on screen.
 */
export async function requestOtp(input: RequestOtpInput): Promise<RequestOtpOutcome> {
  const patient = await findPatient(input.patientCode, input.phone);
  if (!patient) return { patientId: null, destination: maskPhone(input.phone) };
  const outcome = await issueCode(patient.id, input.channel, input.ipHash);
  // Never report rate limits on the first screen (it would reveal a match).
  return { ...outcome, rateLimited: undefined, retryAfterSeconds: undefined };
}

export type VerifyOutcome = { ok: true; language: Lang } | { ok: false; locked: boolean };

export async function verifyOtp(patientId: string | null, code: string): Promise<VerifyOutcome> {
  if (!patientId) return { ok: false, locked: false };
  const admin = createAdminClient();
  if (await lockedUntil(patientId)) return { ok: false, locked: true };

  const since = new Date(Date.now() - ISSUE_WINDOW_MS).toISOString();
  const { data: recent } = await admin
    .from('portal_otps')
    .select('id, code_hash, expires_at, used_at, attempts, created_at')
    .eq('patient_id', patientId)
    .gte('created_at', since)
    .order('created_at', { ascending: false });
  const otps = recent ?? [];
  const active = otps.find((o) => !o.used_at && new Date(o.expires_at).getTime() > Date.now());

  if (active && verifyOtpHash(otpSecret(), active.id, code, active.code_hash)) {
    // Single use: only the first request to set used_at wins.
    const { data: claimed } = await admin
      .from('portal_otps')
      .update({ used_at: new Date().toISOString() })
      .eq('id', active.id)
      .is('used_at', null)
      .select('id');
    if (claimed?.length) {
      const { data: patient } = await admin.from('patients').select('language').eq('id', patientId).single();
      await logAdminEvent(admin, 'patient', 'portal_login', 'patients', patientId, { channel: 'otp' });
      // TODO(phase 7): send `portal_login_alert` after the response (email + opt-in only).
      return { ok: true, language: normaliseLang(patient?.language) };
    }
  }

  // Wrong, expired or reused code: count it against the latest code in the window.
  const target = active ?? otps[0];
  if (target) await admin.from('portal_otps').update({ attempts: target.attempts + 1 }).eq('id', target.id);
  const failed = otps.reduce((n, o) => n + o.attempts, 0) + (target ? 1 : 0);
  await logAdminEvent(admin, 'patient', 'portal_otp_failed', 'patients', patientId, { attempts: failed });

  if (shouldLock(failed)) {
    await admin.from('portal_locks').upsert({ patient_id: patientId, locked_until: new Date(Date.now() + LOCK_MS).toISOString() });
    await logAdminEvent(admin, 'patient', 'portal_locked', 'patients', patientId, { minutes: LOCK_MS / 60000 });
    // TODO(phase 7): email the manager(s) `otp_lockout_alert` (masked patient code + time).
    return { ok: false, locked: true };
  }
  return { ok: false, locked: false };
}
