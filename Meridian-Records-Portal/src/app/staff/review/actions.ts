'use server';

import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/staff';
import { notifyReportReady, notifyRetestRequested } from '@/lib/email/notify';
import { friendlyDbError, type ActionResult } from '@/lib/db-errors';
import { transitionOrder } from '@/lib/order-actions';
import { loadReportInput, reportPath } from '@/lib/pdf/data';
import { removeReportFile, uploadReportFile } from '@/lib/pdf/ensure';
import { buildReportPdf } from '@/lib/pdf/report';
import { createClient } from '@/lib/supabase/server';
import { generateVerifyCode } from '@/lib/verify-code';

const orderIdSchema = z.object({ orderId: z.uuid() });
const withReasonSchema = z.object({ orderId: z.uuid(), reason: z.string().trim().min(3).max(500) });

/**
 * E-sign & release (SPEC 11.2), in this order because storage and the
 * database cannot share a transaction:
 *   1. verify the caller is a pathologist   2. build the PDF
 *   3. upload it (admin client)             4. release_order() with the USER session
 *   5. if step 4 fails, delete the uploaded file.
 */
export async function releaseReport(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const staff = await requireRole('pathologist');
  const parsed = orderIdSchema.safeParse({ orderId: formData.get('orderId') });
  if (!parsed.success) return { error: 'Unknown order.' };
  const { orderId } = parsed.data;

  const supabase = await createClient();
  const { data: order } = await supabase.from('orders').select('status').eq('id', orderId).maybeSingle();
  if (order?.status !== 'resulted') return { error: 'This order is not waiting for release. Refresh the list.' };

  const verifyCode = generateVerifyCode();
  const input = await loadReportInput(supabase, orderId, {
    verifyCode,
    version: 1,
    amendReason: null,
    signerName: staff.fullName,
    signedAt: new Date().toISOString(),
  });
  if (!input) return { error: 'The report data could not be loaded.' };

  const path = reportPath(orderId, 1);
  const bytes = await buildReportPdf(input);
  if (!(await uploadReportFile(path, bytes))) return { error: 'The PDF could not be stored. Nothing was released.' };

  const { error } = await supabase.rpc('release_order', { p_order_id: orderId, p_verify_code: verifyCode, p_pdf_path: path });
  if (error) {
    await removeReportFile(path);
    console.warn('release_order failed', error.code);
    return { error: friendlyDbError(error.code) };
  }

  // report_ready after the response: email + opt-in only, portal link only (SPEC 9).
  after(() => notifyReportReady(orderId, 1));

  revalidatePath('/staff/review');
  return { ok: true, message: `Signed and released. Verification code ${verifyCode}.` };
}

/** Result OK? No -> back to the lab with a mandatory reason (SPEC 5.1). */
export async function requestRetest(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole('pathologist');
  const parsed = withReasonSchema.safeParse({ orderId: formData.get('orderId'), reason: formData.get('reason') });
  if (!parsed.success) return { error: 'Write a reason of at least 3 characters.' };

  const result = await transitionOrder(await createClient(), parsed.data.orderId, 'resulted', 'in_lab', {
    retest_reason: parsed.data.reason,
  });
  if (!result.ok) return result;

  // retest_requested to lab technicians after the response: order number + link only.
  const retestOrderId = parsed.data.orderId;
  after(() => notifyRetestRequested(retestOrderId));

  revalidatePath('/staff/review');
  return { ok: true, message: 'Re-test requested. The order is back in the lab.' };
}

/**
 * Amend a released report: new version with a new PDF and verify code; the
 * old version becomes superseded. The order status does not change.
 */
export async function amendReport(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const staff = await requireRole('pathologist');
  const parsed = withReasonSchema.safeParse({ orderId: formData.get('orderId'), reason: formData.get('reason') });
  if (!parsed.success) return { error: 'Write a reason of at least 3 characters.' };
  const { orderId, reason } = parsed.data;

  const supabase = await createClient();
  const { data: current } = await supabase
    .from('reports')
    .select('version')
    .eq('order_id', orderId)
    .eq('status', 'released')
    .maybeSingle();
  if (!current) return { error: 'There is no released report to amend.' };

  const version = current.version + 1;
  const verifyCode = generateVerifyCode();
  const input = await loadReportInput(supabase, orderId, {
    verifyCode,
    version,
    amendReason: reason,
    signerName: staff.fullName,
    signedAt: new Date().toISOString(),
  });
  if (!input) return { error: 'The report data could not be loaded.' };

  const path = reportPath(orderId, version);
  if (!(await uploadReportFile(path, await buildReportPdf(input)))) {
    return { error: 'The PDF could not be stored. Nothing was changed.' };
  }

  const { error } = await supabase.rpc('amend_report', {
    p_order_id: orderId,
    p_reason: reason,
    p_verify_code: verifyCode,
    p_pdf_path: path,
  });
  if (error) {
    await removeReportFile(path);
    console.warn('amend_report failed', error.code);
    return { error: friendlyDbError(error.code) };
  }

  // The patient is told a (new) report is ready; still no health data.
  after(() => notifyReportReady(orderId, version));

  revalidatePath('/staff/review');
  return { ok: true, message: `Version ${version} issued. The previous version is now superseded.` };
}
