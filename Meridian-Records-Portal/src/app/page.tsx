import Link from 'next/link';
import { LanguageToggle } from '@/components/LanguageToggle';
import { t } from '@/lib/i18n';
import { getLang } from '@/lib/i18n/server';

export default async function HomePage() {
  const lang = await getLang();

  return (
    <>
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 pt-6">
        <p className="text-sm font-semibold text-ink-muted">{t(lang, 'app.org')}</p>
        <LanguageToggle lang={lang} />
      </header>

      <main id="main" tabIndex={-1} className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10 sm:py-16">
        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">{t(lang, 'app.name')}</h1>
        <p className="mt-3 max-w-prose text-lg text-ink-muted">{t(lang, 'home.tagline')}</p>

        <nav aria-label={t(lang, 'app.name')} className="mt-10 grid gap-4 sm:grid-cols-2">
          <Link
            href="/login"
            className="flex min-h-24 flex-col justify-center rounded-xl bg-primary px-6 py-5 text-primary-fg shadow-sm transition-colors hover:bg-primary-hover"
          >
            <span className="text-xl font-semibold">{t(lang, 'home.staffLogin')}</span>
            <span className="mt-1 text-sm">{t(lang, 'home.staffLoginHint')}</span>
          </Link>
          <Link
            href="/portal"
            className="flex min-h-24 flex-col justify-center rounded-xl border-2 border-primary bg-surface px-6 py-5 text-primary shadow-sm transition-colors hover:bg-primary-soft"
          >
            <span className="text-xl font-semibold">{t(lang, 'home.patientPortal')}</span>
            <span className="mt-1 text-sm text-ink-muted">{t(lang, 'home.patientPortalHint')}</span>
          </Link>
        </nav>
      </main>

      <footer className="mx-auto w-full max-w-3xl px-4 pb-8">
        <Link href="/privacy" className="inline-block py-2 text-primary underline underline-offset-4 hover:text-primary-hover">
          {t(lang, 'home.privacy')}
        </Link>
      </footer>
    </>
  );
}
