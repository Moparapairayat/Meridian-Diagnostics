import Link from 'next/link';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Logo } from '@/components/ui/Logo';
import type { Lang } from '@/lib/i18n';

export function PortalHeader({ lang, children }: { lang: Lang; children?: React.ReactNode }) {
  return (
    <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-5 pt-5 sm:px-8 sm:pt-7">
      <Link href="/portal" className="rounded-lg" aria-label="Meridian Diagnostics, patient portal">
        <Logo subtitle={lang === 'bn' ? 'ডায়াগনস্টিকস' : 'Diagnostics'} />
      </Link>
      <div className="flex items-center gap-2">
        {children}
        <LanguageToggle lang={lang} />
      </div>
    </header>
  );
}

/** Quiet footer for public pages: privacy and the staff entrance. */
export function PublicFooter({ privacy, staff, preparation }: { privacy: string; staff: string; preparation?: string }) {
  return (
    <footer className="mx-auto mt-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-6 text-sm text-ink-muted sm:px-8">
      <span>© Meridian Diagnostics (Demo)</span>
      <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2">
        {preparation && (
          <Link href="/portal/preparation" className="inline-flex min-h-6 items-center hover:text-ink">
            {preparation}
          </Link>
        )}
        <Link href="/privacy" className="inline-flex min-h-6 items-center hover:text-ink">
          {privacy}
        </Link>
        <Link href="/login" className="inline-flex min-h-6 items-center gap-1 font-medium text-ink-2 hover:text-ink">
          {staff} <span aria-hidden="true">→</span>
        </Link>
      </nav>
    </footer>
  );
}
