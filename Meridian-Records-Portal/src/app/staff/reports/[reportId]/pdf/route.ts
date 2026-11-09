// Staff "View PDF" (lab technician, pathologist). Re-checks role, lets RLS
// decide whether the report is visible, generates a missing PDF on first view,
// logs view_report, then redirects to a 60-second signed URL.
import { NextResponse, type NextRequest } from 'next/server';
import { logStaffRead } from '@/lib/audit';
import { requireRole } from '@/lib/auth/staff';
import { UUID_RE } from '@/lib/format';
import { ensureReportPdf, signedReportUrl } from '@/lib/pdf/ensure';
import { createClient } from '@/lib/supabase/server';

export async function GET(_request: NextRequest, { params }: RouteContext<'/staff/reports/[reportId]/pdf'>) {
  await requireRole('lab_technician', 'pathologist');
  const { reportId } = await params;
  if (!UUID_RE.test(reportId)) return new NextResponse('Not found', { status: 404 });

  const supabase = await createClient();
  const { data: report } = await supabase.from('reports').select('id, pdf_path').eq('id', reportId).maybeSingle();
  if (!report) return new NextResponse('Not found', { status: 404 });

  const path = report.pdf_path ?? (await ensureReportPdf(report.id));
  const url = path ? await signedReportUrl(path, 60) : null;
  if (!url) return new NextResponse('The report is not available right now. Please try again.', { status: 503 });

  await logStaffRead(supabase, 'view_report', 'reports', report.id);
  const response = NextResponse.redirect(url, 303);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
