// Pure i18n helpers (no server-only imports, so they can be unit-tested).
import en from './en.json';
import bn from './bn.json';

export const LANGS = ['en', 'bn'] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = 'en';
export const LANG_COOKIE = 'lang';

export type MessageKey = keyof typeof en;

// Typing bn as Record<MessageKey, string> makes a missing Bangla key a compile error.
const dictionaries: Record<Lang, Record<MessageKey, string>> = { en, bn };

export function isLang(value: unknown): value is Lang {
  return typeof value === 'string' && (LANGS as readonly string[]).includes(value);
}

export function normaliseLang(value: unknown): Lang {
  return isLang(value) ? value : DEFAULT_LANG;
}

export function t(lang: Lang, key: MessageKey): string {
  return dictionaries[lang][key] ?? dictionaries[DEFAULT_LANG][key];
}
