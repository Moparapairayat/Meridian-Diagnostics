import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/lib/database.types';

export type StaffReadAction = 'view_patient' | 'search' | 'view_results' | 'view_report';

/**
 * Logs a staff READ through public.log_event (SECURITY DEFINER; actor, role
 * and branch come from the session). Never pass query text, names or result
 * values in `details`. A failure is logged without personal data and does
 * not break the page.
 */
export async function logStaffRead(
  supabase: SupabaseClient<Database>,
  action: StaffReadAction,
  table: string | null,
  recordId: string | null,
  details: Record<string, Json> = {},
): Promise<void> {
  // The generated types mark these SQL args as `string`, but the function
  // accepts NULL (a search has no single record). PostgREST needs every arg.
  const { error } = await supabase.rpc('log_event', {
    p_action: action,
    p_table: table as string,
    p_record: recordId as string,
    p_details: details,
  });
  if (error) console.warn('audit: log_event failed', action, error.code);
}
