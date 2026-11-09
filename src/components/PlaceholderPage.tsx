import Link from 'next/link';
import { LanguageToggle } from '@/components/LanguageToggle';
import { t, type MessageKey } from '@/lib/i18n';
import { getLang } from '@/lib/i18n/server';

/** Temporary page body for routes built in later phases. */
export async function PlaceholderPage({ titleKey }: { titleKey: MessageKey }) {
  const lang = await getLang();

  return (
    <>
      <header className="mx-auto flex w-full max-w-3xl justify-end px-4 pt-6">
        <LanguageToggle lang={lang} />
      </header>
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <h1 className="text-3xl font-bold text-ink">{t(lang, titleKey)}</h1>
        <p className="mt-3 text-ink-muted">{t(lang, 'placeholder.comingSoon')}</p>
        <Link href="/" className="mt-6 inline-block py-2 text-primary underline underline-offset-4 hover:text-primary-hover">
          {t(lang, 'placeholder.backHome')}
        </Link>
      </main>
    </>
  );
}
