import Link from 'next/link';
import { LanguageToggle } from '@/components/LanguageToggle';
import { t, type Lang } from '@/lib/i18n';

export function PortalHeader({ lang, children }: { lang: Lang; children?: React.ReactNode }) {
  return (
    <header className="mx-auto flex w-full max-w-xl flex-wrap items-center justify-between gap-3 px-4 pt-5">
      <Link href="/" className="text-sm font-semibold text-ink-muted hover:text-ink">
        {t(lang, 'app.org')}
      </Link>
      <div className="flex items-center gap-2">
        {children}
        <LanguageToggle lang={lang} />
      </div>
    </header>
  );
}
