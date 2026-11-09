import type { Metadata } from 'next';
import Link from 'next/link';
import { LanguageToggle } from '@/components/LanguageToggle';
import { linkClass } from '@/components/ui/styles';
import { t } from '@/lib/i18n';
import { PRIVACY } from '@/lib/i18n/privacy';
import { getLang } from '@/lib/i18n/server';

export const metadata: Metadata = { title: 'Privacy notice' };

export default async function PrivacyPage() {
  const lang = await getLang();
  const content = PRIVACY[lang];

  return (
    <>
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 pt-6">
        <Link href="/" className="text-sm font-semibold text-ink-muted hover:text-ink">
          {t(lang, 'app.name')}
        </Link>
        <LanguageToggle lang={lang} />
      </header>
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <h1 className="text-3xl font-bold text-ink">{content.title}</h1>
        <p className="mt-1 text-sm text-ink-muted">{content.updated}</p>
        <p className="mt-6 rounded-md border-l-4 border-warning-border bg-warning-bg px-4 py-3 font-semibold text-warning-fg">
          {content.demoNotice}
        </p>
        <div className="mt-8 space-y-8">
          {content.sections.map((section, index) => (
            <section key={section.heading} aria-labelledby={`privacy-${index}`}>
              <h2 id={`privacy-${index}`} className="text-xl font-semibold text-ink">
                {section.heading}
              </h2>
              {section.paragraphs?.map((p) => (
                <p key={p} className="mt-3 max-w-prose text-ink">
                  {p}
                </p>
              ))}
              {section.items && (
                <ul className="mt-3 max-w-prose list-disc space-y-2 pl-6 text-ink">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
        <p className="mt-10">
          <Link href="/" className={linkClass}>
            {t(lang, 'placeholder.backHome')}
          </Link>
        </p>
      </main>
    </>
  );
}
