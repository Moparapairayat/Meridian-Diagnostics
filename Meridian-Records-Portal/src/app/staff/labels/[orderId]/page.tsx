import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Barcode } from '@/components/staff/Barcode';
import { PrintButton } from '@/components/staff/PrintButton';
import { secondaryButtonClass } from '@/components/ui/styles';
import { requireRole } from '@/lib/auth/staff';
import { UUID_RE, formatDhakaDate, initials } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Barcode labels' };

/**
 * Printable sample labels, one per order item, 50 × 25 mm (`.sample-label`
 * uses the named @page "label" in globals.css). The barcode encodes the
 * sample barcode, which is derived from the patient code: nothing is re-typed.
 */
export default async function LabelsPage({ params }: PageProps<'/staff/labels/[orderId]'>) {
  await requireRole('sample_collector', 'receptionist');
  const { orderId } = await params;
  if (!UUID_RE.test(orderId)) notFound();

  const supabase = await createClient();
  const { data: order } = await supabase
    .from('orders')
    .select('id, order_no, created_at, patients(id, patient_code, full_name), order_items(sample_barcode, test_code, test_catalog(specimen))')
    .eq('id', orderId)
    .maybeSingle();
  if (!order || !order.patients) notFound();

  const items = [...order.order_items].sort((a, b) => a.sample_barcode.localeCompare(b.sample_barcode));
  const date = formatDhakaDate(order.created_at);
  const who = initials(order.patients.full_name);

  return (
    <div className="space-y-6">
      <div className="space-y-3 print:hidden">
        <h1 className="text-2xl font-bold text-ink">Barcode labels</h1>
        <p className="text-ink-muted">
          Order <span className="font-mono">{order.order_no}</span> · {items.length} label{items.length === 1 ? '' : 's'}. Labels print at 50 × 25 mm, one per page.
        </p>
        <div className="flex flex-wrap gap-3">
          <PrintButton />
          <Link href={`/staff/patients/${order.patients.id}`} className={secondaryButtonClass}>
            Back to patient
          </Link>
        </div>
      </div>

      <ul className="flex flex-wrap gap-4 print:block">
        {items.map((item) => (
          <li
            key={item.sample_barcode}
            className="sample-label flex h-[25mm] w-[50mm] flex-col justify-between overflow-hidden border border-dashed border-border bg-white px-[2mm] py-[1.5mm] text-black print:border-0"
          >
            <div className="flex justify-between text-[7pt] font-bold leading-none">
              <span>{order.patients!.patient_code}</span>
              <span>{who}</span>
            </div>
            <Barcode value={item.sample_barcode} />
            <div className="font-mono text-[7pt] leading-none">{item.sample_barcode}</div>
            <div className="flex justify-between text-[6.5pt] leading-none">
              <span className="font-bold">{item.test_code}</span>
              <span>{item.test_catalog?.specimen}</span>
              <span>{date}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
