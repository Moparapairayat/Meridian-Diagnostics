import { setLanguage } from '@/lib/i18n/actions';
import { LANGS, t, type Lang } from '@/lib/i18n';

/**
 * English / Bangla segmented switch for public pages. A plain form posting to
 * a Server Action, so it works without client-side JavaScript.
 */
export function LanguageToggle({ lang }: { lang: Lang }) {
  return (
    <form action={setLanguage} aria-label={t(lang, 'lang.label')} className="inline-flex rounded-[10px] border border-line-strong bg-surface p-0.5 shadow-xs">
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
            className={`min-h-10 min-w-11 rounded-[8px] px-3 text-sm font-semibold transition-colors ${
              active ? 'bg-ink text-white shadow-xs' : 'text-ink-2 hover:bg-sunken hover:text-ink'
            }`}
          >
            {t(option, `lang.${option}`)}
          </button>
        );
      })}
    </form>
  );
}
