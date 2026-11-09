import type { Metadata } from 'next';
import Link from 'next/link';
import { ActionForm } from '@/components/staff/ActionForm';
import { OrderCard, WORKLIST_SELECT } from '@/components/staff/OrderCard';
import { ResultsTable } from '@/components/staff/ResultsTable';
import { BranchBadge, StatusBadge } from '@/components/staff/StatusBadge';
import { Notice } from '@/components/ui/Notice';
import { linkClass, secondaryButtonClass } from '@/components/ui/styles';
import { logStaffRead } from '@/lib/audit';
import { requireRole } from '@/lib/auth/staff';
import { UUID_RE, formatDhakaDateTime } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import { amendReport, releaseReport, requestRetest } from './actions';

export const metadata: Metadata = { title: 'Review' };

function Tabs({ active }: { active: 'review' | 'released' }) {
  const tab = (key: 'review' | 'released', label: string, href: string) => (
    <Link
      href={href}
      aria-current={active === key ? 'page' : undefined}
      className={`inline-flex min-h-11 items-center border-b-2 px-3 text-sm font-semibold ${
        active === key ? 'border-primary text-primary' : 'border-transparent text-ink-muted hover:text-ink'
      }`}
    >
      {label}
    </Link>
  );
  return (
    <nav aria-label="Review lists" className="flex gap-1 border-b border-border">
      {tab('review', 'To review', '/staff/review')}
      {tab('released', 'Released', '/staff/review?tab=released')}
    </nav>
  );
}

export default async function ReviewPage({ searchParams }: PageProps<'/staff/review'>) {
  await requireRole('pathologist');
  const { order, tab } = await searchParams;
  if (typeof order === 'string' && UUID_RE.test(order)) return <ReviewOrder orderId={order} />;

  const supabase = await createClient();
  if (tab === 'released') {
    const { data: released } = await supabase
      .from('orders')
      .select(`${WORKLIST_SELECT}, released_at, reports(id, version, status, signed_at)`)
      .in('status', ['released', 'downloaded'])
      .order('released_at', { ascending: false })
      .limit(40);

    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-ink">Pathologist review</h1>
        <Tabs active="released" />
        <ul className="space-y-3">
          {released?.map((o) => {
            const current = o.reports.find((r) => r.status === 'released');
            return (
              <OrderCard key={o.id} order={o}>
                {current && (
                  <>
                    <span className="text-sm text-ink-muted">
                      Report v{current.version} · signed {formatDhakaDateTime(current.signed_at)}
                    </span>
                    <a href={`/staff/reports/${current.id}/pdf`} target="_blank" rel="noopener" className={secondaryButtonClass}>
                      View PDF<span className="sr-only"> for {o.order_no}</span>
                    </a>
                    <ActionForm
                      action={amendReport}
                      fields={{ orderId: o.id }}
                      label="Amend"
                      pendingLabel="Issuing new version…"
                      variant="secondary"
                      reasonLabel="Reason for the amendment (required)"
                    />
                  </>
                )}
              </OrderCard>
            );
          })}
        </ul>
      </div>
    );
  }

  const { data: toReview } = await supabase
    .from('orders')
    .select(WORKLIST_SELECT)
    .eq('status', 'resulted')
    .order('created_at')
    .limit(100);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Pathologist review</h1>
      <Tabs active="review" />
      {!toReview?.length && <p className="text-ink-muted">No results waiting for review.</p>}
      <ul className="space-y-3">
        {toReview?.map((o) => <OrderCard key={o.id} order={o} href={`/staff/review?order=${o.id}`} />)}
      </ul>
    </div>
  );
}

async function ReviewOrder({ orderId }: { orderId: string }) {
  const supabase = await createClient();
  const { data: order } = await supabase
    .from('orders')
    .select(
      'id, order_no, status, created_at, resulted_at, retest_count, retest_reason, branches(name, code), patients(patient_code, full_name, age_years, sex), ' +
        'order_items(id, test_code, test_catalog(name), results(id, analyte, value, unit, ref_low, ref_high, flag, source, correction_reason))',
    )
    .eq('id', orderId)
    .maybeSingle()
    .overrideTypes<ReviewOrderRow, { merge: false }>();
  if (!order) return <Notice tone="error">Order not found.</Notice>;

  const items = [...order.order_items].sort((a, b) => a.test_code.localeCompare(b.test_code));
  const count = items.reduce((n, i) => n + i.results.length, 0);
  const abnormal = items.reduce((n, i) => n + i.results.filter((r) => r.flag !== 'N').length, 0);
  if (count > 0) await logStaffRead(supabase, 'view_results', 'orders', order.id, { results: count });

  return (
    <div className="space-y-6">
      <p>
        <Link href="/staff/review" className={linkClass}>
          ← Back to review list
        </Link>
      </p>
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="font-mono text-xl font-bold text-ink">{order.order_no}</h1>
            <p className="text-ink">
              {order.patients?.full_name} · <span className="font-mono">{order.patients?.patient_code}</span> · {order.patients?.age_years} y ·{' '}
              {order.patients?.sex}
            </p>
            <p className="text-sm text-ink-muted">Resulted {order.resulted_at ? formatDhakaDateTime(order.resulted_at) : '—'}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {order.branches && <BranchBadge name={order.branches.name} code={order.branches.code} />}
            <StatusBadge status={order.status} />
          </div>
        </div>
        <p className="mt-3 text-sm text-ink">
          {count} values, <strong>{abnormal} outside the reference range</strong>.
          {order.retest_count > 0 && ` Re-tested ${order.retest_count}× (last reason: ${order.retest_reason}).`}
        </p>
      </div>

      {items.map((item) => (
        <section key={item.id} aria-labelledby={`t-${item.id}`} className="space-y-2 rounded-xl border border-border bg-surface p-4">
          <h2 id={`t-${item.id}`} className="font-semibold text-ink">
            {item.test_catalog?.name} ({item.test_code})
          </h2>
          <ResultsTable caption={`${item.test_code} results`} rows={[...item.results].sort((a, b) => a.analyte.localeCompare(b.analyte))} />
        </section>
      ))}

      {order.status === 'resulted' ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <ActionForm
            action={releaseReport}
            fields={{ orderId: order.id }}
            label="E-sign & release"
            pendingLabel="Signing and building PDF…"
            confirmText="I have reviewed these results. Sign electronically and release the report to the patient portal."
          />
          <ActionForm
            action={requestRetest}
            fields={{ orderId: order.id }}
            label="Request re-test"
            pendingLabel="Sending back to lab…"
            variant="secondary"
            reasonLabel="Reason for the re-test (required)"
          />
        </div>
      ) : (
        <OutcomePanel order={order} />
      )}
    </div>
  );
}

/** What happened to an order that has left the review step (shown after an action). */
async function OutcomePanel({ order }: { order: ReviewOrderRow }) {
  if (order.status === 'in_lab') {
    return (
      <Notice tone="info">
        Sent back to the lab for a re-test. Reason: {order.retest_reason}. It will return here when the lab submits new results.
      </Notice>
    );
  }
  const supabase = await createClient();
  const { data: report } = await supabase
    .from('reports')
    .select('id, version, verify_code, signed_at')
    .eq('order_id', order.id)
    .eq('status', 'released')
    .maybeSingle();
  if (!report) return <Notice tone="info">This order is no longer waiting for review (status: {order.status}).</Notice>;

  return (
    <div role="status" className="space-y-3 rounded-xl border-l-4 border-success bg-green-50 p-5">
      <p className="font-semibold text-success">Signed and released to the patient portal</p>
      <dl className="grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-ink-muted">Report version</dt>
          <dd className="font-semibold text-ink">v{report.version}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Verification code</dt>
          <dd className="font-mono font-semibold text-ink">{report.verify_code}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Signed</dt>
          <dd className="text-ink">{formatDhakaDateTime(report.signed_at)}</dd>
        </div>
      </dl>
      <a href={`/staff/reports/${report.id}/pdf`} target="_blank" rel="noopener" className={secondaryButtonClass}>
        View PDF
      </a>
    </div>
  );
}

interface ReviewOrderRow {
  id: string;
  order_no: string;
  status: string;
  created_at: string;
  resulted_at: string | null;
  retest_count: number;
  retest_reason: string | null;
  branches: { name: string; code: string } | null;
  patients: { patient_code: string; full_name: string; age_years: number; sex: string } | null;
  order_items: {
    id: string;
    test_code: string;
    test_catalog: { name: string } | null;
    results: {
      id: string;
      analyte: string;
      value: number;
      unit: string;
      ref_low: number;
      ref_high: number;
      flag: string;
      source: string;
      correction_reason: string | null;
    }[];
  }[];
}
