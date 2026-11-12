import type { Metadata } from 'next';
import { Download, FileText, Inbox, LogOut, QrCode } from 'lucide-react';
import { PortalHeader, PublicFooter } from '@/components/portal/PortalHeader';
import { Alert, EmptyState } from '@/components/ui/primitives';
import { buttonClass } from '@/components/ui/styles';
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
  const firstName = patient.full_name.split(' ')[0];

  return (
    <>
      <PortalHeader lang={lang}>
        <form action="/portal/logout" method="post">
          <button type="submit" className={buttonClass({ variant: 'ghost', size: 'sm' })}>
            <LogOut aria-hidden="true" />
            <span className="hidden sm:inline">{t(lang, 'portal.logout')}</span>
            <span className="sr-only sm:hidden">{t(lang, 'portal.logout')}</span>
          </button>
        </form>
      </PortalHeader>
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-3xl flex-1 px-5 pt-8 pb-16 sm:px-8 lg:pt-12">
        <header className="animate-fade-up">
          <p className="tabular font-mono text-sm text-ink-muted">{patient.patient_code}</p>
          <h1 className="mt-1 font-display text-[2.1rem] leading-tight font-semibold tracking-[-0.02em] text-ink sm:text-[2.5rem]">
            {t(lang, 'portal.reportsTitle')}
          </h1>
          <p className="mt-2 text-ink-2">
            {firstName}
            {reports.length > 0 && (
              <>
                {' · '}
                <span className="tabular">{reports.length}</span> {t(lang, 'portal.reportCount')}
              </>
            )}
          </p>
        </header>

        {params.error === 'unavailable' && (
          <div className="mt-6">
            <Alert tone="danger">{t(lang, 'portal.unavailable')}</Alert>
          </div>
        )}

        {reports.length === 0 ? (
          <div className="mt-8">
            <EmptyState icon={Inbox} title={t(lang, 'portal.noReports')} />
          </div>
        ) : (
          <ul className="mt-8 space-y-4">
            {reports.map((o, i) => (
              <li
                key={o.id}
                className="animate-fade-up overflow-hidden rounded-[18px] border border-line bg-surface shadow-sm"
                style={{ animationDelay: `${Math.min(i, 6) * 50}ms` }}
              >
                <div className="flex gap-4 p-5">
                  <span className="grid size-12 shrink-0 place-items-center rounded-[12px] bg-primary-soft text-primary">
                    <FileText aria-hidden="true" className="size-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink">{o.order_items.map((it) => it.test_catalog?.name ?? it.test_code).join(', ')}</p>
                    <p className="mt-1 text-sm text-ink-muted">
                      {t(lang, 'portal.releasedOn')} <time dateTime={o.current!.signed_at}>{formatDhakaDateTime(o.current!.signed_at)}</time>
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5 text-xs">
                      <span className="tabular rounded-full bg-sunken px-2.5 py-0.5 font-mono font-medium text-ink-2">{o.order_no}</span>
                      <span className="rounded-full bg-sunken px-2.5 py-0.5 font-medium text-ink-2">
                        {t(lang, 'portal.version')} {o.current!.version}
                      </span>
                      {o.current!.version > 1 && (
                        <span className="rounded-full bg-warning-bg px-2.5 py-0.5 font-semibold text-warning-fg">{t(lang, 'portal.amended')}</span>
                      )}
                      {o.downloaded_at && <span className="rounded-full bg-success-bg px-2.5 py-0.5 font-medium text-success">{t(lang, 'portal.downloadedBefore')}</span>}
                    </div>
                  </div>
                </div>
                <div className="border-t border-line bg-[#fcfbf9] px-5 py-3.5">
                  <a href={`/portal/reports/${o.id}/download`} className={buttonClass({ variant: 'primary', size: 'md', full: true })}>
                    <Download aria-hidden="true" />
                    {t(lang, 'portal.download')}
                    <span className="sr-only"> {o.order_no}</span>
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-8 space-y-3 text-sm text-ink-muted">
          <p className="flex items-start gap-2">
            <QrCode aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {t(lang, 'portal.verifyNote')}
          </p>
          <p>
            {t(lang, 'portal.reportPdfNote')} {t(lang, 'portal.sessionNote')}
          </p>
        </div>
      </main>
      <PublicFooter privacy={t(lang, 'portal.privacyLink')} staff={t(lang, 'portal.staffLink')} preparation={t(lang, 'portal.prepTitle')} />
    </>
  );
}
