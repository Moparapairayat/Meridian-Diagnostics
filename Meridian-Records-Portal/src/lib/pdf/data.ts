import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { appUrl } from '@/lib/app-url';
import type { Database } from '@/lib/database.types';
import { SEX_LABELS } from '@/lib/format';
import type { ReportPdfInput } from './report';

export interface ReportMeta {
  verifyCode: string;
  version: number;
  amendReason: string | null;
  signerName: string;
  signedAt: string;
}

/**
 * Collects everything the PDF needs for one order. Works with the user-session
 * client (pathologist: RLS applies) or the admin client (portal/first view).
 */
export async function loadReportInput(
  client: SupabaseClient<Database>,
  orderId: string,
  meta: ReportMeta,
): Promise<ReportPdfInput | null> {
  const { data: order } = await client
    .from('orders')
    .select(
      'order_no, created_at, collected_at, resulted_at, branches(name), patients(patient_code, full_name, age_years, sex), ' +
        'order_items(test_code, test_catalog(name), results(analyte, value, unit, ref_low, ref_high, flag))',
    )
    .eq('id', orderId)
    .maybeSingle()
    .overrideTypes<OrderForReport, { merge: false }>();

  if (!order || !order.patients) return null;

  return {
    branchName: order.branches?.name ?? '',
    patientCode: order.patients.patient_code,
    patientName: order.patients.full_name,
    ageYears: order.patients.age_years,
    sex: SEX_LABELS[order.patients.sex] ?? order.patients.sex,
    orderNo: order.order_no,
    createdAt: order.created_at,
    collectedAt: order.collected_at,
    resultedAt: order.resulted_at,
    signedAt: meta.signedAt,
    signerName: meta.signerName,
    version: meta.version,
    amendReason: meta.amendReason,
    verifyCode: meta.verifyCode,
    verifyUrl: `${appUrl()}/verify/${meta.verifyCode}`,
    tests: [...order.order_items]
      .sort((a, b) => a.test_code.localeCompare(b.test_code))
      .map((item) => ({
        code: item.test_code,
        name: item.test_catalog?.name ?? item.test_code,
        results: item.results.map((r) => ({
          analyte: r.analyte,
          value: Number(r.value),
          unit: r.unit,
          refLow: Number(r.ref_low),
          refHigh: Number(r.ref_high),
          flag: r.flag,
        })),
      })),
  };
}

interface OrderForReport {
  order_no: string;
  created_at: string;
  collected_at: string | null;
  resulted_at: string | null;
  branches: { name: string } | null;
  patients: { patient_code: string; full_name: string; age_years: number; sex: string } | null;
  order_items: {
    test_code: string;
    test_catalog: { name: string } | null;
    results: { analyte: string; value: number; unit: string; ref_low: number; ref_high: number; flag: string }[];
  }[];
}

export function reportPath(orderId: string, version: number): string {
  return `${orderId}/v${version}.pdf`;
}
