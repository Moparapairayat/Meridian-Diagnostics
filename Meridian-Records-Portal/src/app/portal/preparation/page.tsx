import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Droplet, Info, Utensils } from 'lucide-react';
import { PortalHeader, PublicFooter } from '@/components/portal/PortalHeader';
import { t } from '@/lib/i18n';
import { getLang } from '@/lib/i18n/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const metadata: Metadata = { title: 'Preparing for your test' };

const NO_PREP = new Set(['No special preparation is needed.', 'বিশেষ কোনো প্রস্তুতির প্রয়োজন নেই।']);

/**
 * Public test-preparation guide (SPEC 10), in the visitor's language.
 * Reads only test_catalog (names, specimen, prep text): no patient data.
 */
export default async function PreparationPage() {
  const lang = await getLang();
  const admin = createAdminClient();
  const { data } = await admin.from('test_catalog').select('code, name, specimen, prep_en, prep_bn').eq('active', true).order('name');
  const tests = (data ?? []).map((test) => {
    const prep = lang === 'bn' ? test.prep_bn : test.prep_en;
    return { ...test, prep, none: NO_PREP.has(prep), fasting: /fast|না খেয়ে থাকুন/i.test(prep) && !/No fasting|প্রয়োজন নেই/i.test(prep) };
  });
  // Tests that need something from the patient first, then the rest.
  tests.sort((a, b) => Number(a.none) - Number(b.none) || a.name.localeCompare(b.name));

  return (
    <>
      <PortalHeader lang={lang} />
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-4xl flex-1 px-5 pt-8 pb-16 sm:px-8 lg:pt-12">
        <Link href="/portal" className="mb-6 inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink">
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t(lang, 'portal.prepBack')}
        </Link>
        <header className="animate-fade-up">
          <h1 className="font-display text-[2.2rem] leading-tight font-semibold tracking-[-0.02em] text-ink sm:text-[2.6rem]">{t(lang, 'portal.prepTitle')}</h1>
          <p className="mt-3 max-w-2xl text-lg text-ink-2">{t(lang, 'portal.prepLede')}</p>
        </header>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {tests.map((test, i) => (
            <li
              key={test.code}
              className="animate-fade-up rounded-2xl border border-line bg-surface p-5 shadow-xs"
              style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-[1.05rem] font-semibold text-ink">{test.name}</h2>
                {test.fasting ? (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-warning-bg px-2.5 py-0.5 text-xs font-semibold text-warning-fg ring-1 ring-warning-border ring-inset">
                    <Utensils aria-hidden="true" className="size-3" />
                    {t(lang, 'portal.prepFasting')}
                  </span>
                ) : test.none ? (
                  <span className="inline-flex shrink-0 rounded-full bg-success-bg px-2.5 py-0.5 text-xs font-semibold text-success ring-1 ring-success-line ring-inset">
                    {t(lang, 'portal.prepNone')}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
                <Droplet aria-hidden="true" className="size-3" />
                {t(lang, 'portal.prepSpecimen')}: {test.specimen}
              </p>
              {!test.none && (
                <p className="mt-3 border-t border-line pt-3 text-[0.95rem] text-ink-2" lang={lang}>
                  {test.prep}
                </p>
              )}
            </li>
          ))}
        </ul>

        <p className="mt-10 flex items-start gap-2 rounded-[12px] bg-info-bg px-4 py-3 text-sm text-info">
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {t(lang, 'portal.prepAsk')}
        </p>
      </main>
      <PublicFooter privacy={t(lang, 'portal.privacyLink')} staff={t(lang, 'portal.staffLink')} />
    </>
  );
}
