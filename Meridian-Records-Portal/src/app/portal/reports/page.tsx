import type { Metadata } from 'next';
import { PortalHeader } from '@/components/portal/PortalHeader';
import { Notice } from '@/components/ui/Notice';
import { primaryButtonClass, secondaryButtonClass } from '@/components/ui/styles';
import { formatDhakaDateTime } from '@/lib/format';
import { t } from '@/lib/i18n';
import { getLang } from '@/lib/i18n/server';
import { patientReports, requirePatient } from '@/lib/portal/patient';

export const metadata: Metadata = { title: 'Your reports' };

export default async function PortalReportsPage({ searchParams }: PageProps<'/portal/reports'>) {
  const patient = await requirePatient();
  const lang = await getLang();
  const params = await searchParams;
  const reports = await patientReports(patient.id);

  return (
    <>
      <PortalHeader lang={lang}>
        <form action="/portal/logout" method="post">
          <button type="submit" className={secondaryButtonClass}>
            {t(lang, 'portal.logout')}
          </button>
        </form>
      </PortalHeader>
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-xl flex-1 px-4 py-8">
        <h1 className="text-3xl font-bold text-ink">{t(lang, 'portal.reportsTitle')}</h1>
        <p className="mt-1 text-ink">
          {patient.full_name} · <span className="font-mono">{patient.patient_code}</span>
        </p>
        <p className="mt-1 text-sm text-ink-muted">{t(lang, 'portal.sessionNote')}</p>

        {params.error === 'unavailable' && (
          <div className="mt-4">
            <Notice tone="error">{t(lang, 'portal.unavailable')}</Notice>
          </div>
        )}

        {reports.length === 0 ? (
          <p className="mt-8 text-ink-muted">{t(lang, 'portal.noReports')}</p>
        ) : (
          <ul className="mt-6 space-y-4">
            {reports.map((o) => (
              <li key={o.id} className="rounded-xl border border-border bg-surface p-4 shadow-sm">
                <p className="text-sm text-ink-muted">
                  {t(lang, 'portal.order')} <span className="font-mono">{o.order_no}</span>
                </p>
                <p className="mt-1 font-semibold text-ink">
                  {t(lang, 'portal.tests')}: {o.order_items.map((i) => i.test_catalog?.name ?? i.test_code).join(', ')}
                </p>
                <p className="mt-1 text-sm text-ink-muted">
                  {t(lang, 'portal.releasedOn')}: {formatDhakaDateTime(o.current!.signed_at)} · {t(lang, 'portal.version')} {o.current!.version}
                  {o.current!.version > 1 && ` (${t(lang, 'portal.amended')})`}
                  {o.downloaded_at && ` · ${t(lang, 'portal.downloadedBefore')}`}
                </p>
                <a href={`/portal/reports/${o.id}/download`} className={`${primaryButtonClass} mt-3 w-full sm:w-auto`}>
                  {t(lang, 'portal.download')}
                  <span className="sr-only"> {o.order_no}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-6 text-sm text-ink-muted">{t(lang, 'portal.reportPdfNote')}</p>
      </main>
    </>
  );
}
