import 'server-only';
import { logAdminEvent } from '@/lib/audit-admin';
import { initials } from '@/lib/format';
import { createAdminClient } from '@/lib/supabase/admin';
import { VERIFY_CODE_RE } from '@/lib/verify-code';

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT = 30;

export type VerifyOutcome =
  | { kind: 'rate_limited' }
  | { kind: 'invalid' }
  | {
      kind: 'valid' | 'superseded';
      version: number;
      signedAt: string;
      signer: string;
      branch: string;
      tests: string[];
      initials: string;
    };

/**
 * Public QR verification (SPEC 13). Admin client, so this returns ONLY the
 * allowed fields: status, test names, report date, signer and branch, patient
 * initials. Never results or full patient details. Rate-limited per IP hash,
 * and every check is audited as `verify_report` with actor `public`.
 */
export async function verifyReportCode(code: string, ipHash: string): Promise<VerifyOutcome> {
  const admin = createAdminClient();

  const { count } = await admin
    .from('audit_log')
    .select('id', { count: 'exact', head: true })
    .eq('action', 'verify_report')
    .eq('details->>ip_hash', ipHash)
    .gte('at', new Date(Date.now() - RATE_WINDOW_MS).toISOString());
  if ((count ?? 0) >= RATE_LIMIT) return { kind: 'rate_limited' };

  let outcome: VerifyOutcome = { kind: 'invalid' };
  let reportId: string | null = null;

  if (VERIFY_CODE_RE.test(code)) {
    const { data: report } = await admin
      .from('reports')
      .select('id, version, status, signed_at, signed_by, orders(patients(full_name), order_items(test_catalog(name)))')
      .eq('verify_code', code)
      .maybeSingle();
    if (report) {
      reportId = report.id;
      const { data: signer } = report.signed_by
        ? await admin.from('staff_profiles').select('full_name, branches(name)').eq('user_id', report.signed_by).maybeSingle()
        : { data: null };
      outcome = {
        kind: report.status === 'released' ? 'valid' : 'superseded',
        version: report.version,
        signedAt: report.signed_at,
        signer: signer?.full_name ?? '—',
        branch: signer?.branches?.name ?? '—',
        tests: (report.orders?.order_items ?? []).map((i) => i.test_catalog?.name ?? '').filter(Boolean),
        initials: report.orders?.patients ? initials(report.orders.patients.full_name) : '—',
      };
    }
  }

  await logAdminEvent(admin, 'public', 'verify_report', 'reports', reportId, { result: outcome.kind, ip_hash: ipHash });
  return outcome;
}
