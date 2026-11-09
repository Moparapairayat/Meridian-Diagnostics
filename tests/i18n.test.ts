import { describe, expect, it } from 'vitest';
import en from '@/lib/i18n/en.json';
import bn from '@/lib/i18n/bn.json';
import { isLang, normaliseLang, t } from '@/lib/i18n';

describe('i18n', () => {
  it('returns the message for the requested language', () => {
    expect(t('en', 'demo.banner')).toBe('Demo – synthetic data only');
    expect(t('bn', 'home.staffLogin')).toBe('স্টাফ লগইন');
  });

  it('has the same keys in English and Bangla', () => {
    expect(Object.keys(bn).sort()).toEqual(Object.keys(en).sort());
  });

  it('accepts only supported languages and falls back to English', () => {
    expect(isLang('bn')).toBe(true);
    expect(isLang('fr')).toBe(false);
    expect(normaliseLang(undefined)).toBe('en');
    expect(normaliseLang('xx')).toBe('en');
  });
});
