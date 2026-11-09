import { describe, expect, it } from 'vitest';
import { IDLE_TIMEOUT_MS, isIdleExpired } from '@/lib/auth/idle';
import { NAV_BY_ROLE, STAFF_ROLES, isStaffRole, navFor, safeNextPath } from '@/lib/auth/roles';
import { loginSchema, newPasswordSchema } from '@/lib/validation/auth';
import { PRIVACY } from '@/lib/i18n/privacy';

describe('safeNextPath', () => {
  it('accepts staff paths', () => {
    expect(safeNextPath('/staff')).toBe('/staff');
    expect(safeNextPath('/staff/search?q=1')).toBe('/staff/search?q=1');
  });

  it('blocks open redirects and other areas', () => {
    for (const bad of ['//evil.example', 'https://evil.example', '/\\evil.example', '/staffx', '/portal', '', ' /staff', '/staff\n']) {
      expect(safeNextPath(bad)).toBe('/staff');
    }
    expect(safeNextPath(undefined)).toBe('/staff');
    expect(safeNextPath(42)).toBe('/staff');
  });

  it('honours extra allowed prefixes', () => {
    expect(safeNextPath('/reset-password', '/staff', ['/staff', '/reset-password'])).toBe('/reset-password');
    expect(safeNextPath('/reset-password')).toBe('/staff');
  });
});

describe('role navigation', () => {
  it('knows exactly the five roles', () => {
    expect(STAFF_ROLES).toHaveLength(5);
    expect(isStaffRole('manager')).toBe(true);
    expect(isStaffRole('patient')).toBe(false);
  });

  it('gives every role search and the Knowledge Hub', () => {
    for (const role of STAFF_ROLES) {
      const hrefs = navFor(role).map((n) => n.href);
      expect(hrefs).toContain('/staff/search');
      expect(hrefs).toContain('/staff/knowledge');
    }
  });

  it('shows each role only its own screens (SPEC 11)', () => {
    const hrefs = (role: (typeof STAFF_ROLES)[number]) => NAV_BY_ROLE[role].map((n) => n.href);
    expect(hrefs('receptionist')).toContain('/staff/register');
    expect(hrefs('receptionist')).not.toContain('/staff/review');
    expect(hrefs('sample_collector')).toContain('/staff/collection');
    expect(hrefs('lab_technician')).toContain('/staff/lab');
    expect(hrefs('pathologist')).toContain('/staff/review');
    expect(hrefs('manager')).toEqual(expect.arrayContaining(['/staff/audit', '/staff/dashboard']));
    for (const role of STAFF_ROLES.filter((r) => r !== 'manager')) {
      expect(hrefs(role)).not.toContain('/staff/audit');
    }
  });
});

describe('idle timeout', () => {
  const now = 1_800_000_000_000;
  it('is active within 15 minutes', () => {
    expect(isIdleExpired(String(now - IDLE_TIMEOUT_MS + 1000), now)).toBe(false);
  });
  it('expires at 15 minutes, or when missing or tampered', () => {
    expect(isIdleExpired(String(now - IDLE_TIMEOUT_MS), now)).toBe(true);
    expect(isIdleExpired(undefined, now)).toBe(true);
    expect(isIdleExpired('abc', now)).toBe(true);
    expect(isIdleExpired(String(now + 10 * 60_000), now)).toBe(true);
  });
});

describe('auth validation', () => {
  it('requires a valid email and password to log in', () => {
    expect(loginSchema.safeParse({ email: 'a@b.co', password: 'x' }).success).toBe(true);
    expect(loginSchema.safeParse({ email: 'not-an-email', password: 'x' }).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'a@b.co', password: '' }).success).toBe(false);
  });

  it('enforces the password rule and confirmation', () => {
    expect(newPasswordSchema.safeParse({ password: 'Goodpass123', confirm: 'Goodpass123' }).success).toBe(true);
    expect(newPasswordSchema.safeParse({ password: 'short1A', confirm: 'short1A' }).success).toBe(false);
    expect(newPasswordSchema.safeParse({ password: 'alllowercase1', confirm: 'alllowercase1' }).success).toBe(false);
    expect(newPasswordSchema.safeParse({ password: 'Goodpass123', confirm: 'Goodpass124' }).success).toBe(false);
  });
});

describe('privacy notice', () => {
  it('has the same sections in English and Bangla and states it is a demo', () => {
    expect(PRIVACY.bn.sections).toHaveLength(PRIVACY.en.sections.length);
    expect(PRIVACY.en.demoNotice).toMatch(/demo with synthetic data/i);
  });
});
