import { setLanguage } from '@/lib/i18n/actions';
import { LANGS, t, type Lang } from '@/lib/i18n';

/**
 * English / Bangla switch for public pages. A plain form posting to a
 * Server Action, so it works without client-side JavaScript.
 */
export function LanguageToggle({ lang }: { lang: Lang }) {
  return (
    <form action={setLanguage} aria-label={t(lang, 'lang.label')} className="flex gap-1">
      {LANGS.map((option) => {
        const active = option === lang;
        return (
          <button
            key={option}
            type="submit"
            name="lang"
            value={option}
            lang={option}
            aria-pressed={active}
            className={`min-h-11 min-w-11 rounded-md border px-3 text-sm font-medium transition-colors ${
              active
                ? 'border-primary bg-primary text-primary-fg'
                : 'border-border bg-surface text-ink hover:bg-primary-soft'
            }`}
          >
            {t(option, `lang.${option}`)}
          </button>
        );
      })}
    </form>
  );
}
