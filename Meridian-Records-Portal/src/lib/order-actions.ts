import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { friendlyDbError, type ActionResult } from '@/lib/db-errors';
import type { OrderStatus } from '@/lib/orders';

/**
 * Moves one order from `from` to `to` with the USER-SESSION client, so RLS and
 * the status trigger decide (role, allowed transition, DB timestamps). Only
 * updates when the order is still in `from`, which avoids double clicks.
 */
export async function transitionOrder(
  supabase: SupabaseClient<Database>,
  orderId: string,
  from: OrderStatus,
  to: OrderStatus,
  extra: { retest_reason?: string } = {},
): Promise<ActionResult> {
  const { data, error } = await supabase
    .from('orders')
    .update({ status: to, ...extra })
    .eq('id', orderId)
    .eq('status', from)
    .select('id');

  if (error) {
    console.warn('order transition rejected', from, to, error.code);
    return { error: friendlyDbError(error.code) };
  }
  if (!data || data.length === 0) {
    return { error: 'This order is no longer in the expected step. Refresh the list.' };
  }
  return { ok: true };
}
