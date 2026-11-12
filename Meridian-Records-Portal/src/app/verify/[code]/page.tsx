import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { LanguageToggle } from '@/components/LanguageToggle';
import { formatDhakaDateTime } from '@/lib/format';
import { t, type Lang } from '@/lib/i18n';
import { getLang } from '@/lib/i18n/server';
import { hashIp } from '@/lib/otp/otp-core';
import { verifyReportCode, type VerifyOutcome } from '@/lib/portal/verify';
import { VERIFY_CODE_RE } from '@/lib/verify-code';

export const metadata: Metadata = { title: 'Report verification', robots: { index: false, follow: false } };

/**
 * Public QR verification (SPEC 13). Admin client, so this page shows ONLY:
 * status, test names, report date, signer and branch, patient initials.
 * Never results or full patient details. Lightly rate-limited by IP hash.
 */
export default async function VerifyPage({ params }: PageProps<'/verify/[code]'>) {
  const lang = await getLang();
  const { code: rawCode } = await params;
  const code = decodeURIComponent(rawCode).trim().toUpperCase();
  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown';
  const ipHash = process.env.OTP_SECRET ? hashIp(process.env.OTP_SECRET, ip) : 'none';
  const outcome = await verifyReportCode(code, ipHash);

  return (
    <>
      <header className="mx-auto flex w-full max-w-xl items-center justify-between gap-3 px-4 pt-5">
        <Link href="/" className="text-sm font-semibold text-ink-muted hover:text-ink">
          {t(lang, 'app.org')}
        </Link>
        <LanguageToggle lang={lang} />
      </header>
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-bold text-ink">{t(lang, 'verify.title')}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {t(lang, 'verify.code')}: <span className="font-mono font-semibold text-ink">{VERIFY_CODE_RE.test(code) ? code : '—'}</span>
        </p>
        <div className="mt-6">
          <Result lang={lang} outcome={outcome} />
        </div>
        <p className="mt-8 text-sm text-ink-muted">{t(lang, 'verify.privacy')}</p>
      </main>
    </>
  );
}

function Result({ lang, outcome }: { lang: Lang; outcome: VerifyOutcome }) {
  if (outcome.kind === 'rate_limited') {
    return <Banner tone="warn" title={t(lang, 'verify.rateLimited')} />;
  }
  if (outcome.kind === 'invalid') {
    return <Banner tone="bad" title={t(lang, 'verify.invalid')} text={t(lang, 'verify.invalidText')} />;
  }
  const valid = outcome.kind === 'valid';
  return (
    <div className="space-y-4">
      <Banner
        tone={valid ? 'good' : 'warn'}
        title={t(lang, valid ? 'verify.valid' : 'verify.superseded')}
        text={t(lang, valid ? 'verify.validText' : 'verify.supersededText')}
      />
      <dl className="grid gap-3 rounded-xl border border-border bg-surface p-5 text-sm sm:grid-cols-2">
        <Item term={t(lang, 'verify.tests')} value={outcome.tests.join(', ')} wide />
        <Item term={t(lang, 'verify.reportDate')} value={formatDhakaDateTime(outcome.signedAt)} />
        <Item term={t(lang, 'verify.version')} value={String(outcome.version)} />
        <Item term={t(lang, 'verify.signedBy')} value={outcome.signer} />
        <Item term={t(lang, 'verify.branch')} value={outcome.branch} />
        <Item term={t(lang, 'verify.patient')} value={outcome.initials} />
      </dl>
    </div>
  );
}

function Banner({ tone, title, text }: { tone: 'good' | 'warn' | 'bad'; title: string; text?: string }) {
  const style = {
    good: 'border-success bg-green-50 text-success',
    warn: 'border-warning-border bg-warning-bg text-warning-fg',
    bad: 'border-danger bg-red-50 text-danger',
  }[tone];
  const symbol = { good: '✓', warn: '!', bad: '✗' }[tone];
  return (
    <div role="status" className={`rounded-xl border-l-4 p-5 ${style}`}>
      <p className="text-xl font-bold">
        <span aria-hidden="true">{symbol} </span>
        {title}
      </p>
      {text && <p className="mt-1 text-ink">{text}</p>}
    </div>
  );
}

function Item({ term, value, wide }: { term: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <dt className="text-ink-muted">{term}</dt>
      <dd className="font-semibold text-ink">{value}</dd>
    </div>
  );
}
