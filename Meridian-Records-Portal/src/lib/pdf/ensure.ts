import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { loadReportInput, reportPath } from './data';
import { buildReportPdf } from './report';

/**
 * Returns the storage path of a report's PDF, generating and storing it on
 * first view when it is missing (seeded reports have pdf_path = null).
 * Shared by the staff PDF route and the patient portal download.
 *
 * Uses the admin client, so THE CALLER MUST ALREADY HAVE CHECKED that the
 * viewer may see this report (staff role via RLS, or portal ownership).
 */
export async function ensureReportPdf(reportId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data: report } = await admin
    .from('reports')
    .select('id, order_id, version, signed_at, signed_by, verify_code, amend_reason, pdf_path')
    .eq('id', reportId)
    .maybeSingle();
  if (!report) return null;
  if (report.pdf_path) return report.pdf_path;

  const { data: signer } = report.signed_by
    ? await admin.from('staff_profiles').select('full_name').eq('user_id', report.signed_by).maybeSingle()
    : { data: null };

  const input = await loadReportInput(admin, report.order_id, {
    verifyCode: report.verify_code,
    version: report.version,
    amendReason: report.amend_reason,
    signerName: signer?.full_name ?? 'the reporting pathologist',
    signedAt: report.signed_at,
  });
  if (!input) return null;

  const bytes = await buildReportPdf(input);
  const path = reportPath(report.order_id, report.version);
  const { error: uploadError } = await admin.storage
    .from('reports')
    .upload(path, bytes, { contentType: 'application/pdf', upsert: true });
  if (uploadError) {
    console.warn('pdf: upload failed', uploadError.name);
    return null;
  }

  // Only fill a missing path; never overwrite one set concurrently.
  await admin.from('reports').update({ pdf_path: path }).eq('id', report.id).is('pdf_path', null);
  return path;
}

/** 60-second signed URL for a stored report (SPEC 8.1). Caller must authorise. */
export async function signedReportUrl(path: string, seconds = 60): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from('reports').createSignedUrl(path, seconds, { download: false });
  if (error || !data) {
    console.warn('pdf: signed url failed', error?.name);
    return null;
  }
  return data.signedUrl;
}

/** Removes an uploaded file after a failed release/amend (SPEC 11.2 step 4). */
export async function removeReportFile(path: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.storage.from('reports').remove([path]);
  if (error) console.warn('pdf: cleanup failed', error.name);
}

/** Uploads a freshly built PDF before the database step (SPEC 11.2 step 2). */
export async function uploadReportFile(path: string, bytes: Uint8Array): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin.storage.from('reports').upload(path, bytes, { contentType: 'application/pdf', upsert: true });
  if (error) console.warn('pdf: upload failed', error.name);
  return !error;
}
