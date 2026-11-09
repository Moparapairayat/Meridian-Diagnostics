'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/staff';
import type { ActionResult } from '@/lib/db-errors';
import { transitionOrder } from '@/lib/order-actions';
import { createClient } from '@/lib/supabase/server';

const orderIdSchema = z.object({ orderId: z.uuid() });

export async function markCollected(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole('sample_collector');
  const parsed = orderIdSchema.safeParse({ orderId: formData.get('orderId') });
  if (!parsed.success) return { error: 'Unknown order.' };

  const result = await transitionOrder(await createClient(), parsed.data.orderId, 'registered', 'collected');
  if (result.ok) revalidatePath('/staff/collection');
  return result.ok ? { ok: true, message: 'Marked as collected.' } : result;
}

export async function sendToLab(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole('sample_collector');
  const parsed = orderIdSchema.safeParse({ orderId: formData.get('orderId') });
  if (!parsed.success) return { error: 'Unknown order.' };

  const result = await transitionOrder(await createClient(), parsed.data.orderId, 'collected', 'in_lab');
  if (result.ok) revalidatePath('/staff/collection');
  return result.ok ? { ok: true, message: 'Sent to the lab.' } : result;
}
