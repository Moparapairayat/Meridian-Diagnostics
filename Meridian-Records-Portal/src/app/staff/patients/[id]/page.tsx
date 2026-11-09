import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BranchBadge, StatusBadge } from '@/components/staff/StatusBadge';
import { secondaryButtonClass } from '@/components/ui/styles';
import { logStaffRead } from '@/lib/audit';
import { requireStaff } from '@/lib/auth/staff';
import { SEX_LABELS, UUID_RE, formatBdt, formatDhakaDateTime, maskEmail, maskPhone } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import { NewOrderForm } from './NewOrderForm';

export const metadata: Metadata = { title: 'Patient record' };

const FLAG_TEXT: Record<string, string> = { L: 'Low', N: 'Normal', H: 'High' };

/**
 * Role-based patient record (SPEC 11). What each role sees is enforced by RLS;
 * the page only mirrors it: results for lab/pathologist, invoices for
 * reception/manager, full contact details for reception/manager.
 */
export default async function PatientPage({ params }: PageProps<'/staff/patients/[id]'>) {
  const staff = await requireStaff();
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const supabase = await createClient();
  const { data: patient } = await supabase
    .from('patients')
    .select('id, patient_code, full_name, age_years, sex, phone, email, email_opt_in, preferred_channel, language, created_at, consent_version, branches(name, code)')
    .eq('id', id)
    .maybeSingle();
  if (!patient) notFound();

  const { data: orderRows } = await supabase
    .from('orders')
    .select('id, order_no, status, created_at, released_at, retest_count, branches(name, code), invoices(amount_bdt, paid), order_items(id, test_code, sample_barcode, test_catalog(name))')
    .eq('patient_id', id)
    .order('created_at', { ascending: false });
  const orders = orderRows ?? [];

  const showResults = staff.role === 'lab_technician' || staff.role === 'pathologist';
  const showInvoices = staff.role === 'receptionist' || staff.role === 'manager';
  const showContact = staff.role === 'receptionist' || staff.role === 'manager';
  const canOrder = staff.role === 'receptionist';
  const canPrintLabels = staff.role === 'receptionist' || staff.role === 'sample_collector';

  const itemIds = orders.flatMap((o) => o.order_items.map((i) => i.id));
  const { data: resultRows } =
    showResults && itemIds.length > 0
      ? await supabase
          .from('results')
          .select('id, order_item_id, analyte, value, unit, ref_low, ref_high, flag, source')
          .in('order_item_id', itemIds)
          .order('analyte')
      : { data: [] };
  const results = resultRows ?? [];

  await logStaffRead(supabase, 'view_patient', 'patients', id);
  if (results.length > 0) {
    const ordersWithResults = orders.filter((o) => o.order_items.some((i) => results.some((r) => r.order_item_id === i.id))).length;
    await logStaffRead(supabase, 'view_results', 'patients', id, { orders: ordersWithResults });
  }

  const { data: tests } = canOrder
    ? await supabase.from('test_catalog').select('code, name, specimen, price_bdt').eq('active', true).order('name')
    : { data: [] };

  return (
    <div className="space-y-8">
      <section aria-labelledby="patient-name" className="rounded-xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-sm font-semibold text-primary">{patient.patient_code}</p>
            <h1 id="patient-name" className="text-2xl font-bold text-ink">
              {patient.full_name}
            </h1>
          </div>
          {patient.branches && <BranchBadge name={patient.branches.name} code={patient.branches.code} />}
        </div>
        <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
          <Detail term="Age" value={`${patient.age_years} years`} />
          <Detail term="Sex" value={SEX_LABELS[patient.sex] ?? patient.sex} />
          <Detail term="Mobile" value={showContact ? patient.phone : maskPhone(patient.phone)} mono />
          <Detail term="Email" value={patient.email ? (showContact ? patient.email : maskEmail(patient.email)) : '—'} />
          <Detail term="Email notifications" value={patient.email_opt_in ? 'Yes' : 'No'} />
          <Detail term="Language" value={patient.language === 'bn' ? 'Bangla' : 'English'} />
          <Detail term="Registered" value={formatDhakaDateTime(patient.created_at)} />
          <Detail term="Consent version" value={patient.consent_version} />
        </dl>
      </section>

      {canOrder && <NewOrderForm patientId={patient.id} tests={tests ?? []} />}

      <section aria-labelledby="orders-heading" className="space-y-3">
        <h2 id="orders-heading" className="text-lg font-semibold text-ink">
          Orders ({orders.length})
        </h2>
        {orders.length === 0 && <p className="text-ink-muted">No orders yet.</p>}
        <ul className="space-y-4">
          {orders.map((order) => {
            const orderResults = results.filter((r) => order.order_items.some((i) => i.id === r.order_item_id));
            return (
              <li key={order.id} className="rounded-xl border border-border bg-surface p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-mono font-semibold text-ink">{order.order_no}</p>
                    <p className="text-sm text-ink-muted">{formatDhakaDateTime(order.created_at)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {order.branches && <BranchBadge name={order.branches.name} code={order.branches.code} />}
                    <StatusBadge status={order.status} />
                    {order.retest_count > 0 && (
                      <span className="text-xs font-semibold text-warning-fg">Re-test ×{order.retest_count}</span>
                    )}
                  </div>
                </div>
                <ul className="mt-3 flex flex-wrap gap-2 text-sm">
                  {order.order_items.map((item) => (
                    <li key={item.id} className="rounded-md bg-page px-2 py-1">
                      <span className="font-semibold">{item.test_code}</span> {item.test_catalog?.name}
                      <span className="ml-1 font-mono text-xs text-ink-muted">{item.sample_barcode}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                  {showInvoices && order.invoices && (
                    <span>
                      Invoice <strong>{formatBdt(order.invoices.amount_bdt)}</strong> · {order.invoices.paid ? 'paid' : 'unpaid'}
                    </span>
                  )}
                  {canPrintLabels && (
                    <Link href={`/staff/labels/${order.id}`} className={secondaryButtonClass}>
                      Labels
                    </Link>
                  )}
                </div>
                {showResults && orderResults.length > 0 && (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[32rem] text-left text-sm">
                      <caption className="sr-only">Results for order {order.order_no}</caption>
                      <thead className="border-b border-border text-ink-muted">
                        <tr>
                          <th scope="col" className="py-2 pr-3 font-semibold">Analyte</th>
                          <th scope="col" className="py-2 pr-3 font-semibold">Value</th>
                          <th scope="col" className="py-2 pr-3 font-semibold">Unit</th>
                          <th scope="col" className="py-2 pr-3 font-semibold">Reference</th>
                          <th scope="col" className="py-2 font-semibold">Flag</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {orderResults.map((r) => (
                          <tr key={r.id}>
                            <td className="py-2 pr-3">{r.analyte}</td>
                            <td className={`py-2 pr-3 font-semibold ${r.flag !== 'N' ? 'text-danger' : ''}`}>{r.value}</td>
                            <td className="py-2 pr-3">{r.unit}</td>
                            <td className="py-2 pr-3">
                              {r.ref_low}–{r.ref_high}
                            </td>
                            <td className="py-2">
                              {r.flag} <span className="text-ink-muted">({FLAG_TEXT[r.flag] ?? r.flag})</span>
                              {r.source === 'manual_correction' && <span className="ml-1 text-xs text-ink-muted">corrected</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function Detail({ term, value, mono }: { term: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-ink-muted">{term}</dt>
      <dd className={`font-medium text-ink ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  );
}
