import { describe, expect, it } from 'vitest';
import {
  ISSUE_WINDOW_MS,
  MAX_FAILED_ATTEMPTS,
  OTP_RE,
  RESEND_COOLDOWN_MS,
  canIssueCode,
  generateOtpCode,
  hashIp,
  hashOtp,
  isExpired,
  isLocked,
  shouldLock,
  verifyOtpHash,
} from '@/lib/otp/otp-core';

const SECRET = 'a'.repeat(64);
const OTP_ID = '6f1c1c1e-1111-4222-8333-944444444444';

describe('OTP generation and hashing', () => {
  it('generates 6-digit codes, including leading zeros', () => {
    const codes = Array.from({ length: 2000 }, generateOtpCode);
    expect(codes.every((c) => OTP_RE.test(c))).toBe(true);
    expect(new Set(codes).size).toBeGreaterThan(1900);
  });

  it('stores only an HMAC bound to the OTP id', () => {
    const h = hashOtp(SECRET, OTP_ID, '123456');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).not.toContain('123456');
    expect(hashOtp(SECRET, 'other-id', '123456')).not.toBe(h);
    expect(hashOtp('b'.repeat(64), OTP_ID, '123456')).not.toBe(h);
  });

  it('verifies the right code and rejects wrong or malformed ones', () => {
    const h = hashOtp(SECRET, OTP_ID, '004217');
    expect(verifyOtpHash(SECRET, OTP_ID, '004217', h)).toBe(true);
    expect(verifyOtpHash(SECRET, OTP_ID, '004218', h)).toBe(false);
    expect(verifyOtpHash(SECRET, OTP_ID, '4217', h)).toBe(false);
    expect(verifyOtpHash(SECRET, OTP_ID, '004217', 'not-a-hash')).toBe(false);
    expect(verifyOtpHash(SECRET, 'another-id', '004217', h)).toBe(false);
  });
});

describe('OTP rules', () => {
  const now = 1_800_000_000_000;

  it('expires after its expiry time', () => {
    expect(isExpired(new Date(now + 1000), now)).toBe(false);
    expect(isExpired(new Date(now), now)).toBe(true);
  });

  it('allows a resend only 60 seconds after the last code', () => {
    expect(canIssueCode([], now)).toEqual({ ok: true });
    const r = canIssueCode([new Date(now - 20_000)], now);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('cooldown');
      expect(r.retryAfterMs).toBe(RESEND_COOLDOWN_MS - 20_000);
    }
    expect(canIssueCode([new Date(now - RESEND_COOLDOWN_MS)], now)).toEqual({ ok: true });
  });

  it('allows at most 3 codes in 15 minutes', () => {
    const three = [now - 5 * 60_000, now - 3 * 60_000, now - 2 * 60_000].map((t) => new Date(t));
    const r = canIssueCode(three, now);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('too_many');
    // codes older than the window do not count
    const old = [now - ISSUE_WINDOW_MS - 1, now - ISSUE_WINDOW_MS - 2, now - 2 * 60_000].map((t) => new Date(t));
    expect(canIssueCode(old, now)).toEqual({ ok: true });
  });

  it('locks on the 5th wrong attempt and unlocks after the lock time', () => {
    expect(shouldLock(MAX_FAILED_ATTEMPTS - 1)).toBe(false);
    expect(shouldLock(MAX_FAILED_ATTEMPTS)).toBe(true);
    expect(isLocked(new Date(now + 60_000), now)).toBe(true);
    expect(isLocked(new Date(now - 1), now)).toBe(false);
    expect(isLocked(null, now)).toBe(false);
  });

  it('hashes IP addresses (never stores the raw IP)', () => {
    const h = hashIp(SECRET, '203.0.113.7');
    expect(h).toMatch(/^[0-9a-f]{32}$/);
    expect(h).not.toContain('203');
    expect(hashIp(SECRET, '203.0.113.8')).not.toBe(h);
  });
});
