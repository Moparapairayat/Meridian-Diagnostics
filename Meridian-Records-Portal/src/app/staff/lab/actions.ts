'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { flagFor, simulateValue } from '@/lib/analyser';
import { requireRole } from '@/lib/auth/staff';
import { friendlyDbError, type ActionResult } from '@/lib/db-errors';
import { transitionOrder } from '@/lib/order-actions';
import { createClient } from '@/lib/supabase/server';

const orderIdSchema = z.object({ orderId: z.uuid() });

/**
 * "Import from analyser (simulated)" (SPEC 11.1): one value per analyte of
 * every test in the order, saved with source = 'analyser'. Re-importing after
 * a re-test replaces the previous values (same order item + analyte).
 */
export async function importFromAnalyser(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole('lab_technician');
  const parsed = orderIdSchema.safeParse({ orderId: formData.get('orderId') });
  if (!parsed.success) return { error: 'Unknown order.' };

  const supabase = await createClient();
  const { data: order } = await supabase
    .from('orders')
    .select('id, status, order_items(id, test_catalog(test_analytes(analyte, unit, ref_low, ref_high, decimals)))')
    .eq('id', parsed.data.orderId)
    .maybeSingle();
  if (!order) return { error: 'Order not found.' };
  if (order.status !== 'in_lab') return { error: 'Only orders in the lab can receive analyser results.' };

  const rows = order.order_items.flatMap((item) =>
    (item.test_catalog?.test_analytes ?? []).map((a) => {
      const value = simulateValue(a);
      return {
        order_item_id: item.id,
        analyte: a.analyte,
        value,
        unit: a.unit,
        ref_low: a.ref_low,
        ref_high: a.ref_high,
        flag: flagFor(value, a.ref_low, a.ref_high),
        source: 'analyser',
        correction_reason: null,
      };
    }),
  );
  if (rows.length === 0) return { error: 'These tests have no analytes to import.' };

  const { error } = await supabase.from('results').upsert(rows, { onConflict: 'order_item_id,analyte' });
  if (error) {
    console.warn('analyser import failed', error.code);
    return { error: friendlyDbError(error.code) };
  }
  revalidatePath('/staff/lab');
  return { ok: true, message: `Imported ${rows.length} values from the analyser.` };
}

const correctionSchema = z.object({
  resultId: z.uuid(),
  value: z
    .string()
    .trim()
    .regex(/^\d{1,6}(\.\d{1,4})?$/)
    .transform(Number),
  reason: z.string().trim().min(3).max(500),
});

/** Manual correction of one value: reason required, audited (SPEC 11.1). */
export async function correctResult(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole('lab_technician');
  const parsed = correctionSchema.safeParse({
    resultId: formData.get('resultId'),
    value: formData.get('value'),
    reason: formData.get('reason'),
  });
  if (!parsed.success) {
    return { error: 'Enter the corrected value as a number (for example 5.4) and a reason of at least 3 characters.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('results')
    .update({ value: parsed.data.value, source: 'manual_correction', correction_reason: parsed.data.reason })
    .eq('id', parsed.data.resultId)
    .select('id');
  if (error) return { error: friendlyDbError(error.code) };
  if (!data?.length) return { error: 'Results can only be corrected while the order is in the lab.' };

  revalidatePath('/staff/lab');
  return { ok: true, message: 'Correction saved.' };
}

/** All analytes present -> in_lab to resulted (trigger also requires results). */
export async function submitResults(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole('lab_technician');
  const parsed = orderIdSchema.safeParse({ orderId: formData.get('orderId') });
  if (!parsed.success) return { error: 'Unknown order.' };

  const supabase = await createClient();
  const { data: order } = await supabase
    .from('orders')
    .select('order_items(test_catalog(test_analytes(analyte)), results(id))')
    .eq('id', parsed.data.orderId)
    .maybeSingle();
  const expected = order?.order_items.reduce((n, i) => n + (i.test_catalog?.test_analytes.length ?? 0), 0) ?? 0;
  const actual = order?.order_items.reduce((n, i) => n + i.results.length, 0) ?? 0;
  if (expected === 0 || actual < expected) {
    return { error: 'Import results for every test before submitting.' };
  }

  const result = await transitionOrder(supabase, parsed.data.orderId, 'in_lab', 'resulted');
  if (!result.ok) return result;
  revalidatePath('/staff/lab');
  return { ok: true, message: 'Results submitted for pathologist review.' };
}
