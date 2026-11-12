// Patient report download (SPEC 8.1 step 8). Re-checks the portal session and
// that the order belongs to this patient, generates a missing PDF, marks the
// first download, writes an audit row, then redirects to a 60-second signed URL.
import { NextResponse, type NextRequest } from 'next/server';
import { logAdminEvent } from '@/lib/audit-admin';
import { UUID_RE } from '@/lib/format';
import { ensureReportPdf, signedReportUrl } from '@/lib/pdf/ensure';
import { getPortalSession } from '@/lib/portal/session';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest, { params }: RouteContext<'/portal/reports/[orderId]/download'>) {
  const session = await getPortalSession();
  if (!session) return NextResponse.redirect(new URL('/portal?expired=1', request.url), 303);

  const { orderId } = await params;
  const notAvailable = () => NextResponse.redirect(new URL('/portal/reports?error=unavailable', request.url), 303);
  if (!UUID_RE.test(orderId)) return notAvailable();

  const admin = createAdminClient();
  // Ownership is the access rule: the order must belong to the session patient.
  const { data: order } = await admin
    .from('orders')
    .select('id, status, patient_id, reports(id, version, status)')
    .eq('id', orderId)
    .eq('patient_id', session.patientId)
    .in('status', ['released', 'downloaded'])
    .maybeSingle();
  const current = order?.reports.find((r) => r.status === 'released');
  if (!order || !current) return notAvailable();

  const path = await ensureReportPdf(current.id);
  const url = path ? await signedReportUrl(path, 60) : null;
  if (!url) return notAvailable();

  // First download only: released -> downloaded (trusted-server rule in the trigger).
  let first = false;
  if (order.status === 'released') {
    const { data: moved } = await admin
      .from('orders')
      .update({ status: 'downloaded', downloaded_at: new Date().toISOString() })
      .eq('id', order.id)
      .eq('status', 'released')
      .select('id');
    first = !!moved?.length;
  }
  await logAdminEvent(admin, 'patient', 'portal_download', 'orders', order.id, { report_version: current.version, first });

  const response = NextResponse.redirect(url, 303);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
