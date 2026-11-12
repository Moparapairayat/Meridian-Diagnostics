import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/lib/database.types';

export type PortalAction = 'portal_login' | 'portal_download' | 'portal_otp_failed' | 'portal_locked';

/**
 * Audit rows written by admin-client code (patients and the public have no
 * Supabase session, so log_event cannot be used). Never put codes, phone
 * numbers, names or result values in `details`.
 */
export async function logAdminEvent(
  admin: SupabaseClient<Database>,
  actorRole: 'patient' | 'public' | 'system',
  action: PortalAction | 'verify_report',
  table: string | null,
  recordId: string | null,
  details: Record<string, Json> = {},
): Promise<void> {
  const { error } = await admin.from('audit_log').insert({
    actor_id: null,
    actor_role: actorRole,
    action,
    table_name: table,
    record_id: recordId,
    details,
  });
  if (error) console.warn('audit: admin insert failed', action, error.code);
}
