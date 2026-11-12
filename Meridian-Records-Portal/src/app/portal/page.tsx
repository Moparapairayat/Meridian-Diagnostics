import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, BadgeCheck, ClipboardList, Clock, FileText, ShieldCheck, UserRound } from 'lucide-react';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Logo } from '@/components/ui/Logo';
import { Alert } from '@/components/ui/primitives';
import { t, type Lang } from '@/lib/i18n';
import { getLang } from '@/lib/i18n/server';
import { getPendingChallenge, getPortalSession } from '@/lib/portal/session';
import { PortalFlow } from './PortalFlow';

export const metadata: Metadata = { title: 'Patient portal' };

/** Patient-facing brand panel: what the portal is and why it is safe. */
function PatientBrandPanel({ lang }: { lang: Lang }) {
  const trust = [
    { icon: Clock, text: t(lang, 'portal.trust1') },
    { icon: UserRound, text: t(lang, 'portal.trust2') },
    { icon: ShieldCheck, text: t(lang, 'portal.trust3') },
  ];
  return (
    <aside className="relative hidden overflow-hidden bg-ink text-white lg:flex lg:flex-col lg:justify-between lg:px-14 lg:py-12">
      <div aria-hidden="true" className="pointer-events-none absolute -top-48 -left-32 size-[36rem] rounded-full bg-[radial-gradient(closest-side,rgb(13_107_112/0.5),transparent)]" />
      <svg aria-hidden="true" className="pointer-events-none absolute -right-28 -bottom-28 size-[30rem] text-white/[0.06]" viewBox="0 0 400 400" fill="none">
        <circle cx="200" cy="200" r="198" stroke="currentColor" />
        <circle cx="200" cy="200" r="150" stroke="currentColor" />
        <circle cx="200" cy="200" r="102" stroke="currentColor" />
        <path d="M200 2v396M2 200h396" stroke="currentColor" />
      </svg>

      <Logo tone="light" subtitle={lang === 'bn' ? 'ডায়াগনস্টিকস' : 'Diagnostics'} />

      <div className="relative max-w-md">
        <h2 className="font-display text-[2.5rem] leading-[1.1] font-semibold tracking-[-0.02em] text-balance">{t(lang, 'portal.headline')}</h2>
        <p className="mt-4 text-[1.05rem] leading-relaxed text-[#c3d5d7]">{t(lang, 'portal.lede')}</p>
        <ul className="mt-8 space-y-4">
          {trust.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/[0.08] ring-1 ring-white/10">
                <Icon aria-hidden="true" className="size-4 text-[#9fd3cf]" />
              </span>
              <span className="text-[#e3eced]">{text}</span>
            </li>
          ))}
        </ul>

        {/* Illustrative report card (no real data). */}
        <div aria-hidden="true" className="mt-10 flex w-[20rem] items-center gap-4 rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10 backdrop-blur-sm">
          <span className="grid size-11 shrink-0 place-items-center rounded-md bg-white/[0.1]">
            <FileText className="size-5 text-[#bfe6e2]" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{t(lang, 'portal.mockTitle')}</span>
            <span className="block text-xs text-[#a9c4c6]">{t(lang, 'portal.mockSigned')}</span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#9fd3cf]/15 px-2 py-0.5 text-xs font-semibold text-[#bfe6e2]">
            <BadgeCheck className="size-3.5" />
            {t(lang, 'portal.mockVerified')}
          </span>
        </div>
      </div>

      <p className="relative text-xs text-[#9db5b8]">Meridian Diagnostics · Central · North · South · East · West</p>
    </aside>
  );
}

export default async function PortalPage({ searchParams }: PageProps<'/portal'>) {
  if (await getPortalSession()) redirect('/portal/reports');
  const lang = await getLang();
  const params = await searchParams;
  const pending = await getPendingChallenge();

  return (
    <div className="grid flex-1 lg:min-h-dvh lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <PatientBrandPanel lang={lang} />

      <main id="main" tabIndex={-1} className="flex flex-col px-5 py-6 sm:px-10 lg:px-16 lg:py-10">
        <div className="flex items-center justify-between gap-3">
          <span className="lg:hidden">
            <Logo subtitle={lang === 'bn' ? 'ডায়াগনস্টিকস' : 'Diagnostics'} />
          </span>
          <span className="hidden lg:block" />
          <LanguageToggle lang={lang} />
        </div>

        <div className="mx-auto flex w-full max-w-[25rem] flex-1 flex-col justify-center py-10 lg:py-6">
          <div className="animate-fade-up">
            {/* On phones the brand panel is hidden, so the headline lives here. */}
            <p className="text-xs font-semibold tracking-widest text-primary uppercase">{t(lang, 'portal.title')}</p>
            <h1 className="mt-2 font-display text-[2rem] leading-tight font-semibold tracking-[-0.02em] text-ink">{t(lang, 'portal.formTitle')}</h1>
            <p className="mt-2 text-ink-muted">{t(lang, 'portal.formIntro')}</p>

            <div className="mt-8 space-y-5">
              {params.signedout === '1' && <Alert tone="info">{t(lang, 'portal.signedOut')}</Alert>}
              {params.expired === '1' && <Alert tone="info">{t(lang, 'portal.expired')}</Alert>}
              <PortalFlow
                lang={lang}
                initial={pending ? { step: 'code', destination: pending.destination, attempt: 0 } : { step: 'request', attempt: 0 }}
              />
            </div>

            <Link
              href="/portal/preparation"
              className="group mt-8 flex min-h-14 items-center gap-3 rounded-lg border border-line bg-surface px-4 shadow-xs transition-[border-color,box-shadow] hover:border-line-strong hover:shadow-sm"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary-soft text-primary">
                <ClipboardList aria-hidden="true" className="size-4" />
              </span>
              <span className="flex-1 text-sm font-semibold text-ink">{t(lang, 'portal.prepLink')}</span>
              <ArrowRight aria-hidden="true" className="size-4 text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
            </Link>
          </div>
        </div>

        <nav aria-label="Footer" className="mx-auto flex w-full max-w-[25rem] flex-wrap items-center justify-between gap-3 text-sm text-ink-muted">
          <Link href="/privacy" className="inline-flex min-h-6 items-center hover:text-ink">
            {t(lang, 'portal.privacyLink')}
          </Link>
          <Link href="/login" className="inline-flex min-h-6 items-center gap-1 font-medium text-ink-2 hover:text-ink">
            {t(lang, 'portal.staffLink')} <span aria-hidden="true">→</span>
          </Link>
        </nav>
      </main>
    </div>
  );
}
