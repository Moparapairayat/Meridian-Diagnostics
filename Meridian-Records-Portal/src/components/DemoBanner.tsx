import { t, type Lang } from '@/lib/i18n';

/** Persistent banner shown on every page (SPEC 7.6). */
export function DemoBanner({ lang }: { lang: Lang }) {
  return (
    <div
      role="note"
      className="sticky top-0 z-50 print:hidden bg-warning-bg px-4 py-2 text-center text-sm font-semibold text-warning-fg border-b border-warning-border"
    >
      {t(lang, 'demo.banner')}
    </div>
  );
}
