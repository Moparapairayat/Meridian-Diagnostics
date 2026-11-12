import 'server-only';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPortalSession } from './session';

/** For portal pages: the signed-in patient, or back to /portal. */
export async function requirePatient() {
  const session = await getPortalSession();
  if (!session) redirect('/portal?expired=1');
  const admin = createAdminClient();
  const { data: patient } = await admin
    .from('patients')
    .select('id, patient_code, full_name, language')
    .eq('id', session.patientId)
    .maybeSingle();
  if (!patient) redirect('/portal?expired=1');
  return patient;
}

/**
 * The patient's released/downloaded orders with the current report version.
 * Admin client, so the patient filter here IS the access rule.
 */
export async function patientReports(patientId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from('orders')
    .select('id, order_no, status, created_at, released_at, downloaded_at, reports(id, version, status, signed_at), order_items(test_code, test_catalog(name))')
    .eq('patient_id', patientId)
    .in('status', ['released', 'downloaded'])
    .order('released_at', { ascending: false });

  return (data ?? [])
    .map((o) => ({ ...o, current: o.reports.find((r) => r.status === 'released') ?? null }))
    .filter((o) => o.current !== null);
}
