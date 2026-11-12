import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, ClipboardList, Clock, FileCheck2, ShieldCheck, UserRound } from 'lucide-react';
import { PortalHeader, PublicFooter } from '@/components/portal/PortalHeader';
import { Alert } from '@/components/ui/primitives';
import { t } from '@/lib/i18n';
import { getLang } from '@/lib/i18n/server';
import { getPendingChallenge, getPortalSession } from '@/lib/portal/session';
import { PortalFlow } from './PortalFlow';

export const metadata: Metadata = { title: 'Patient portal' };

export default async function PortalPage({ searchParams }: PageProps<'/portal'>) {
  if (await getPortalSession()) redirect('/portal/reports');
  const lang = await getLang();
  const params = await searchParams;
  const pending = await getPendingChallenge();

  const trust = [
    { icon: Clock, text: t(lang, 'portal.trust1') },
    { icon: UserRound, text: t(lang, 'portal.trust2') },
    { icon: ShieldCheck, text: t(lang, 'portal.trust3') },
  ];

  return (
    <>
      <PortalHeader lang={lang} />
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-5 pt-8 pb-16 sm:px-8 lg:pt-14">
        <div className="grid items-start gap-10 lg:grid-cols-[1fr_minmax(0,27rem)] lg:gap-16">
          <section className="animate-fade-up lg:pt-6">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary-ink">
              <FileCheck2 aria-hidden="true" className="size-3.5" />
              {t(lang, 'portal.title')}
            </p>
            <h1 className="font-display text-[2.4rem] leading-[1.08] font-semibold tracking-[-0.02em] text-balance text-ink sm:text-[3.1rem]">
              {t(lang, 'portal.headline')}
            </h1>
            <p className="mt-5 max-w-lg text-lg text-pretty text-ink-2">{t(lang, 'portal.lede')}</p>
            <Link
              href="/portal/preparation"
              className="group mt-6 inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-line bg-surface px-4 text-sm font-semibold text-ink-2 shadow-xs transition-colors hover:border-line-strong hover:text-ink"
            >
              <ClipboardList aria-hidden="true" className="size-4 text-primary" />
              {t(lang, 'portal.prepLink')}
              <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <ul className="mt-8 hidden space-y-3.5 lg:block">
              {trust.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-ink-2">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full border border-line bg-surface text-primary shadow-xs">
                    <Icon aria-hidden="true" className="size-4" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </section>

          <div className="animate-fade-up rounded-[20px] border border-line bg-surface p-6 shadow-md sm:p-8 [animation-delay:80ms]">
            {params.signedout === '1' && (
              <div className="mb-5">
                <Alert tone="info">{t(lang, 'portal.signedOut')}</Alert>
              </div>
            )}
            {params.expired === '1' && (
              <div className="mb-5">
                <Alert tone="info">{t(lang, 'portal.expired')}</Alert>
              </div>
            )}
            <PortalFlow
              lang={lang}
              initial={pending ? { step: 'code', destination: pending.destination, attempt: 0 } : { step: 'request', attempt: 0 }}
            />
          </div>
        </div>

        <ul className="mt-10 grid gap-3 sm:grid-cols-3 lg:hidden">
          {trust.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 rounded-[12px] border border-line bg-surface px-4 py-3 text-sm text-ink-2">
              <Icon aria-hidden="true" className="size-4 shrink-0 text-primary" />
              {text}
            </li>
          ))}
        </ul>

      </main>
      <PublicFooter privacy={t(lang, 'portal.privacyLink')} staff={t(lang, 'portal.staffLink')} preparation={t(lang, 'portal.prepTitle')} />
    </>
  );
}
