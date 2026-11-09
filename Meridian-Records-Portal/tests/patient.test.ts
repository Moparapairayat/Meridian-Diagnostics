import { describe, expect, it } from 'vitest';
import { ORDER_NO_RE, PATIENT_CODE_RE, formatBdt, initials, maskEmail, maskPhone } from '@/lib/format';
import { canTransition } from '@/lib/orders';
import { classifyQuery, escapeLike } from '@/lib/search';
import { PHONE_RE, nameSchema, normalisePhone, phoneSchema, registerSchema } from '@/lib/validation/patient';

describe('phone validation', () => {
  it('accepts Bangladeshi mobiles in common formats', () => {
    for (const raw of ['01712345678', '+8801712345678', '8801712345678', '01712-345678', '017 1234 5678']) {
      expect(phoneSchema.parse(raw)).toBe('01712345678');
    }
  });
  it('rejects invalid numbers', () => {
    for (const raw of ['01212345678', '0171234567', '017123456789', '1712345678', 'abc']) {
      expect(phoneSchema.safeParse(raw).success).toBe(false);
    }
    expect(PHONE_RE.test(normalisePhone('+880 1912 345678'))).toBe(true);
  });
});

describe('name validation', () => {
  it('accepts Latin names with . \' - and collapses spaces', () => {
    expect(nameSchema.parse("  Md.  Rahim   O'Neil-Uddin ")).toBe("Md. Rahim O'Neil-Uddin");
  });
  it('rejects Bengali script, digits, and bad lengths', () => {
    for (const raw of ['রহিম উদ্দিন', 'Rahim2', 'A', 'x'.repeat(81), 'Rahim <script>']) {
      expect(nameSchema.safeParse(raw).success).toBe(false);
    }
  });
});

describe('registration rules', () => {
  const base = {
    fullName: 'Rahim Uddin', ageYears: '40', sex: 'male', phone: '01712345678', email: '',
    preferredChannel: 'sms_demo', language: 'bn', emailOptIn: false, consent: true, tests: ['FBS'],
  };
  it('accepts a valid registration', () => {
    const r = registerSchema.parse(base);
    expect(r.email).toBeNull();
    expect(r.ageYears).toBe(40);
  });
  it('requires an age: empty is not 0 years', () => {
    expect(registerSchema.safeParse({ ...base, ageYears: '' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, ageYears: '121' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, ageYears: '4.5' }).success).toBe(false);
    expect(registerSchema.parse({ ...base, ageYears: '0' }).ageYears).toBe(0);
  });
  it('requires consent and at least one test', () => {
    expect(registerSchema.safeParse({ ...base, consent: false }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, tests: [] }).success).toBe(false);
  });
  it('needs an email for opt-in and for the email channel', () => {
    expect(registerSchema.safeParse({ ...base, emailOptIn: true }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, preferredChannel: 'email', email: 'a@b.co' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, preferredChannel: 'email', email: 'A@B.co', emailOptIn: true }).data?.email).toBe('a@b.co');
  });
});

describe('codes and masking', () => {
  it('matches the DB code formats', () => {
    expect(PATIENT_CODE_RE.test('MD-2026-00123')).toBe(true);
    expect(PATIENT_CODE_RE.test('MD-26-00123')).toBe(false);
    expect(ORDER_NO_RE.test('ORD-2026-000045')).toBe(true);
  });
  it('masks phone and email', () => {
    expect(maskPhone('01712345689')).toBe('017******89');
    expect(maskEmail('rahim@gmail.com')).toBe('r***@gmail.com');
  });
  it('builds initials and formats taka', () => {
    expect(initials('Rahim Uddin')).toBe('R.U.');
    expect(initials("Md. O'Neil")).toBe('M.O.');
    expect(formatBdt(120000)).toBe('৳1,20,000');
  });
});

describe('search classification', () => {
  it('detects patient codes, phones and names', () => {
    expect(classifyQuery('md-2026-00012')).toEqual({ by: 'code', exact: 'MD-2026-00012' });
    expect(classifyQuery('MD-2026-00')).toEqual({ by: 'code', pattern: 'MD-2026-00%' });
    expect(classifyQuery('+880 1712 345678')).toEqual({ by: 'phone', exact: '01712345678' });
    expect(classifyQuery('5678')).toEqual({ by: 'phone', pattern: '%5678%' });
    expect(classifyQuery('rahim')).toEqual({ by: 'name', pattern: '%rahim%' });
  });
  it('rejects too short or unsupported input', () => {
    expect(classifyQuery('a')).toBeNull();
    expect(classifyQuery('123')).toBeNull();
    expect(classifyQuery('রহিম')).toBeNull();
    expect(classifyQuery('50%')).toBeNull();
  });
  it('escapes LIKE wildcards', () => {
    expect(escapeLike('a%b_c\\')).toBe('a\\%b\\_c\\\\');
  });
});

describe('status transitions (mirror of the DB trigger)', () => {
  it('allows only the SPEC 5.1 table', () => {
    expect(canTransition('registered', 'collected', 'sample_collector')).toBe(true);
    expect(canTransition('resulted', 'in_lab', 'pathologist')).toBe(true);
    expect(canTransition('released', 'downloaded', 'system')).toBe(true);
    expect(canTransition('registered', 'released', 'pathologist')).toBe(false);
    expect(canTransition('in_lab', 'resulted', 'pathologist')).toBe(false);
    expect(canTransition('released', 'downloaded', 'pathologist')).toBe(false);
  });
});
