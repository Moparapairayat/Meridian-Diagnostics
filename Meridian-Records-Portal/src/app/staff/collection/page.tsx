import type { Metadata } from 'next';
import Link from 'next/link';
import { ActionForm } from '@/components/staff/ActionForm';
import { OrderCard, WORKLIST_SELECT } from '@/components/staff/OrderCard';
import { secondaryButtonClass } from '@/components/ui/styles';
import { requireRole } from '@/lib/auth/staff';
import { createClient } from '@/lib/supabase/server';
import { markCollected, sendToLab } from './actions';

export const metadata: Metadata = { title: 'Collection' };

export default async function CollectionPage() {
  await requireRole('sample_collector');
  const supabase = await createClient();

  const [{ data: toCollect }, { data: toSend }] = await Promise.all([
    supabase.from('orders').select(WORKLIST_SELECT).eq('status', 'registered').order('created_at').limit(100),
    supabase.from('orders').select(WORKLIST_SELECT).eq('status', 'collected').order('created_at').limit(100),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-ink">Sample collection</h1>
        <p className="mt-1 text-ink-muted">Print the labels, collect the sample, then send it to the central lab.</p>
      </div>

      <section aria-labelledby="collect-heading" className="space-y-3">
        <h2 id="collect-heading" className="text-lg font-semibold text-ink">
          To collect ({toCollect?.length ?? 0})
        </h2>
        {!toCollect?.length && <p className="text-ink-muted">No orders waiting for collection.</p>}
        <ul className="space-y-3">
          {toCollect?.map((order) => (
            <OrderCard key={order.id} order={order}>
              <Link href={`/staff/labels/${order.id}`} className={secondaryButtonClass}>
                Print labels
              </Link>
              <ActionForm action={markCollected} fields={{ orderId: order.id }} label="Mark collected" pendingLabel="Saving…" />
            </OrderCard>
          ))}
        </ul>
      </section>

      <section aria-labelledby="send-heading" className="space-y-3">
        <h2 id="send-heading" className="text-lg font-semibold text-ink">
          Collected, ready for the lab ({toSend?.length ?? 0})
        </h2>
        {!toSend?.length && <p className="text-ink-muted">Nothing waiting to be sent.</p>}
        <ul className="space-y-3">
          {toSend?.map((order) => (
            <OrderCard key={order.id} order={order}>
              <ActionForm action={sendToLab} fields={{ orderId: order.id }} label="Send to lab" pendingLabel="Sending…" />
            </OrderCard>
          ))}
        </ul>
      </section>
    </div>
  );
}
