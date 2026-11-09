import type { Metadata } from 'next';
import Link from 'next/link';
import { ActionForm } from '@/components/staff/ActionForm';
import { OrderCard, WORKLIST_SELECT } from '@/components/staff/OrderCard';
import { ResultsTable } from '@/components/staff/ResultsTable';
import { BranchBadge, StatusBadge } from '@/components/staff/StatusBadge';
import { Notice } from '@/components/ui/Notice';
import { linkClass } from '@/components/ui/styles';
import { logStaffRead } from '@/lib/audit';
import { requireRole } from '@/lib/auth/staff';
import { UUID_RE, formatDhakaDateTime } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import { importFromAnalyser, submitResults } from './actions';
import { CorrectionForm } from './CorrectionForm';

export const metadata: Metadata = { title: 'Lab worklist' };

export default async function LabPage({ searchParams }: PageProps<'/staff/lab'>) {
  await requireRole('lab_technician');
  const { order: orderParam } = await searchParams;
  const supabase = await createClient();

  if (typeof orderParam === 'string' && UUID_RE.test(orderParam)) {
    return <LabOrder orderId={orderParam} />;
  }

  const { data: orders } = await supabase
    .from('orders')
    .select(WORKLIST_SELECT)
    .eq('status', 'in_lab')
    .order('retest_count', { ascending: false })
    .order('created_at')
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Lab worklist</h1>
        <p className="mt-1 text-ink-muted">Samples in the central lab from all branches. Re-tests are listed first.</p>
      </div>
      {!orders?.length && <p className="text-ink-muted">No samples waiting in the lab.</p>}
      <ul className="space-y-3">
        {orders?.map((order) => <OrderCard key={order.id} order={order} href={`/staff/lab?order=${order.id}`} />)}
      </ul>
    </div>
  );
}

async function LabOrder({ orderId }: { orderId: string }) {
  const supabase = await createClient();
  const { data: order } = await supabase
    .from('orders')
    .select(
      'id, order_no, status, created_at, in_lab_at, retest_count, retest_reason, branches(name, code), patients(patient_code, full_name, age_years, sex), ' +
        'order_items(id, test_code, test_catalog(name, test_analytes(analyte)), results(id, analyte, value, unit, ref_low, ref_high, flag, source, correction_reason))',
    )
    .eq('id', orderId)
    .maybeSingle()
    .overrideTypes<LabOrderRow, { merge: false }>();

  if (!order) {
    return <Notice tone="error">Order not found.</Notice>;
  }

  const items = [...order.order_items].sort((a, b) => a.test_code.localeCompare(b.test_code));
  const expected = items.reduce((n, i) => n + (i.test_catalog?.test_analytes.length ?? 0), 0);
  const imported = items.reduce((n, i) => n + i.results.length, 0);
  const editable = order.status === 'in_lab';
  if (imported > 0) await logStaffRead(supabase, 'view_results', 'orders', order.id, { results: imported });

  return (
    <div className="space-y-6">
      <p>
        <Link href="/staff/lab" className={linkClass}>
          ← Back to worklist
        </Link>
      </p>
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="font-mono text-xl font-bold text-ink">{order.order_no}</h1>
            <p className="text-ink">
              {order.patients?.full_name} · <span className="font-mono">{order.patients?.patient_code}</span> · {order.patients?.age_years} y
            </p>
            <p className="text-sm text-ink-muted">In lab since {order.in_lab_at ? formatDhakaDateTime(order.in_lab_at) : '—'}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {order.branches && <BranchBadge name={order.branches.name} code={order.branches.code} />}
            <StatusBadge status={order.status} />
          </div>
        </div>
        {order.retest_count > 0 && order.retest_reason && (
          <div className="mt-4">
            <Notice tone="info">
              Re-test requested by the pathologist: {order.retest_reason}
            </Notice>
          </div>
        )}
      </div>

      {editable && (
        <ActionForm
          action={importFromAnalyser}
          fields={{ orderId: order.id }}
          label={imported > 0 ? 'Re-import from analyser (simulated)' : 'Import from analyser (simulated)'}
          pendingLabel="Importing…"
          variant={imported > 0 ? 'secondary' : 'primary'}
        />
      )}

      {items.map((item) => (
        <section key={item.id} aria-labelledby={`t-${item.id}`} className="space-y-2 rounded-xl border border-border bg-surface p-4">
          <h2 id={`t-${item.id}`} className="font-semibold text-ink">
            {item.test_catalog?.name} ({item.test_code})
          </h2>
          {item.results.length === 0 ? (
            <p className="text-sm text-ink-muted">No values yet. Import from the analyser.</p>
          ) : (
            <ResultsTable
              caption={`${item.test_code} results`}
              rows={[...item.results].sort((a, b) => a.analyte.localeCompare(b.analyte))}
              renderAction={editable ? (r) => <CorrectionForm resultId={r.id} analyte={r.analyte} current={r.value} /> : undefined}
            />
          )}
        </section>
      ))}

      {editable && (
        <div className="space-y-2">
          <p className="text-sm text-ink-muted">
            {imported} of {expected} values imported.
          </p>
          <ActionForm
            action={submitResults}
            fields={{ orderId: order.id }}
            label="Submit results"
            pendingLabel="Submitting…"
            confirmText="Send these values to the pathologist for review? They can no longer be changed in the lab."
          />
        </div>
      )}
      {!editable && <Notice tone="success">Results submitted. This order is now with the pathologist.</Notice>}
    </div>
  );
}

interface LabOrderRow {
  id: string;
  order_no: string;
  status: string;
  created_at: string;
  in_lab_at: string | null;
  retest_count: number;
  retest_reason: string | null;
  branches: { name: string; code: string } | null;
  patients: { patient_code: string; full_name: string; age_years: number; sex: string } | null;
  order_items: {
    id: string;
    test_code: string;
    test_catalog: { name: string; test_analytes: { analyte: string }[] } | null;
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
