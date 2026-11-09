import Link from 'next/link';
import { notFound } from 'next/navigation';
import { primaryButtonClass, secondaryButtonClass } from '@/components/ui/styles';
import { formatBdt, formatDhakaDateTime } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';

/** Confirmation after registration or a new order: IDs, invoice and next steps. */
export async function OrderConfirmation({ orderId, againHref, againLabel }: { orderId: string; againHref: string; againLabel: string }) {
  const supabase = await createClient();
  const { data: order } = await supabase
    .from('orders')
    .select('id, order_no, created_at, patients(id, patient_code, full_name), invoices(amount_bdt, paid), order_items(test_code, sample_barcode)')
    .eq('id', orderId)
    .maybeSingle();
  if (!order || !order.patients) notFound();

  return (
    <div className="space-y-6">
      <div role="status" className="rounded-xl border-l-4 border-success bg-green-50 p-5">
        <p className="text-sm font-semibold text-success">Registered</p>
        <h1 className="mt-1 text-2xl font-bold text-ink">{order.patients.full_name}</h1>
        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-sm text-ink-muted">Patient ID</dt>
            <dd className="font-mono text-xl font-bold text-ink">{order.patients.patient_code}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-muted">Order number</dt>
            <dd className="font-mono text-xl font-bold text-ink">{order.order_no}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-muted">Invoice total</dt>
            <dd className="text-xl font-bold text-ink">
              {order.invoices ? formatBdt(order.invoices.amount_bdt) : '—'}
              {order.invoices && <span className="ml-2 text-sm font-normal text-ink-muted">{order.invoices.paid ? 'paid' : 'unpaid'}</span>}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-sm text-ink-muted">Created {formatDhakaDateTime(order.created_at)} (Dhaka)</p>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-ink">Samples</h2>
        <ul className="mt-2 divide-y divide-border rounded-md border border-border bg-surface">
          {order.order_items.map((item) => (
            <li key={item.sample_barcode} className="flex justify-between gap-3 px-4 py-2 text-sm">
              <span className="font-semibold">{item.test_code}</span>
              <span className="font-mono">{item.sample_barcode}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href={`/staff/labels/${order.id}`} className={primaryButtonClass}>
          Print labels
        </Link>
        <Link href={againHref} className={secondaryButtonClass}>
          {againLabel}
        </Link>
        <Link href={`/staff/patients/${order.patients.id}`} className={secondaryButtonClass}>
          Open patient record
        </Link>
      </div>
    </div>
  );
}
