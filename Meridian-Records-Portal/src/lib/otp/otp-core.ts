// Pure OTP rules (SPEC 8.1). No server-only import, so it is unit-tested.
// The code itself is never stored or logged: only HMAC-SHA256(secret, otpId:code).
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 5 * 60 * 1000;
export const RESEND_COOLDOWN_MS = 60 * 1000;
export const ISSUE_WINDOW_MS = 15 * 60 * 1000;
export const MAX_CODES_PER_WINDOW = 3;
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_MS = 15 * 60 * 1000;

export const OTP_RE = /^\d{6}$/;

export function generateOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(OTP_LENGTH, '0');
}

export function hashOtp(secret: string, otpId: string, code: string): string {
  return createHmac('sha256', secret).update(`${otpId}:${code}`).digest('hex');
}

/** Constant-time comparison of a typed code against the stored hash. */
export function verifyOtpHash(secret: string, otpId: string, code: string, storedHash: string): boolean {
  if (!OTP_RE.test(code) || !/^[0-9a-f]{64}$/.test(storedHash)) return false;
  const a = Buffer.from(hashOtp(secret, otpId, code), 'hex');
  const b = Buffer.from(storedHash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

export function isExpired(expiresAt: string | Date, now: number = Date.now()): boolean {
  return new Date(expiresAt).getTime() <= now;
}

export type IssueDecision = { ok: true } | { ok: false; reason: 'cooldown' | 'too_many'; retryAfterMs: number };

/**
 * May a new code be issued, given when the recent codes were created?
 * 60 s after the last code, and at most 3 codes in 15 minutes.
 */
export function canIssueCode(recentCreatedAt: (string | Date)[], now: number = Date.now()): IssueDecision {
  const times = recentCreatedAt.map((t) => new Date(t).getTime()).filter((t) => now - t < ISSUE_WINDOW_MS).sort((x, y) => y - x);
  if (times.length > 0 && now - times[0] < RESEND_COOLDOWN_MS) {
    return { ok: false, reason: 'cooldown', retryAfterMs: RESEND_COOLDOWN_MS - (now - times[0]) };
  }
  if (times.length >= MAX_CODES_PER_WINDOW) {
    const oldest = times[times.length - 1];
    return { ok: false, reason: 'too_many', retryAfterMs: ISSUE_WINDOW_MS - (now - oldest) };
  }
  return { ok: true };
}

/** Lock after the 5th wrong attempt within the window. */
export function shouldLock(failedAttemptsInWindow: number): boolean {
  return failedAttemptsInWindow >= MAX_FAILED_ATTEMPTS;
}

export function isLocked(lockedUntil: string | Date | null | undefined, now: number = Date.now()): boolean {
  return !!lockedUntil && new Date(lockedUntil).getTime() > now;
}

/** Pseudonymous IP fingerprint for rate limits (never the raw IP). */
export function hashIp(secret: string, ip: string): string {
  return createHmac('sha256', secret).update(`ip:${ip}`).digest('hex').slice(0, 32);
}
