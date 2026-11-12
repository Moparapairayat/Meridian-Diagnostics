import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalHeader } from '@/components/portal/PortalHeader';
import { Notice } from '@/components/ui/Notice';
import { t } from '@/lib/i18n';
import { getLang } from '@/lib/i18n/server';
import { getPendingChallenge, getPortalSession } from '@/lib/portal/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { PortalFlow } from './PortalFlow';

export const metadata: Metadata = { title: 'Patient portal' };

export default async function PortalPage({ searchParams }: PageProps<'/portal'>) {
  if (await getPortalSession()) redirect('/portal/reports');
  const lang = await getLang();
  const params = await searchParams;
  const pending = await getPendingChallenge();

  // Public test-preparation guidance (SPEC 10), in the visitor's language.
  const admin = createAdminClient();
  const { data: tests } = await admin.from('test_catalog').select('code, name, prep_en, prep_bn').eq('active', true).order('name');

  return (
    <>
      <PortalHeader lang={lang} />
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-xl flex-1 px-4 py-8">
        <h1 className="text-3xl font-bold text-ink">{t(lang, 'portal.title')}</h1>
        <p className="mt-2 text-ink-muted">{t(lang, 'portal.intro')}</p>
        <div className="mt-6 space-y-4 rounded-xl border border-border bg-surface p-5 shadow-sm">
          {params.signedout === '1' && <Notice tone="info">{t(lang, 'portal.signedOut')}</Notice>}
          {params.expired === '1' && <Notice tone="info">{t(lang, 'portal.expired')}</Notice>}
          <PortalFlow
            lang={lang}
            initial={pending ? { step: 'code', destination: pending.destination, attempt: 0 } : { step: 'request', attempt: 0 }}
          />
        </div>

        <section aria-labelledby="prep-heading" className="mt-10">
          <h2 id="prep-heading" className="text-xl font-semibold text-ink">
            {t(lang, 'portal.prepTitle')}
          </h2>
          <ul className="mt-3 space-y-2">
            {tests?.map((test) => (
              <li key={test.code}>
                <details className="rounded-md border border-border bg-surface px-4 py-3">
                  <summary className="min-h-6 cursor-pointer font-medium text-ink">{test.name}</summary>
                  <p className="mt-2 text-ink" lang={lang}>
                    {lang === 'bn' ? test.prep_bn : test.prep_en}
                  </p>
                </details>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
