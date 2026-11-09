'use server';

import { logStaffRead } from '@/lib/audit';
import { requireStaff } from '@/lib/auth/staff';
import { maskPhone } from '@/lib/format';
import { classifyQuery, type SearchBy } from '@/lib/search';
import { createClient } from '@/lib/supabase/server';

export interface SearchResult {
  id: string;
  patientCode: string;
  fullName: string;
  ageYears: number;
  sex: string;
  phoneMasked: string;
  branchName: string;
  branchCode: string;
  latestStatus: string | null;
  latestOrderAt: string | null;
}

export interface SearchState {
  attempt: number;
  query?: string;
  by?: SearchBy;
  results?: SearchResult[];
  elapsedMs?: number;
  error?: string;
}

/**
 * Cross-branch patient search (SPEC 11). Runs as a POST Server Action so the
 * query never appears in a URL or request log; the audit row stores only the
 * kind of search and the result count (SPEC 7.3).
 */
export async function searchPatients(prev: SearchState, formData: FormData): Promise<SearchState> {
  await requireStaff();
  const attempt = prev.attempt + 1;
  const raw = formData.get('q');
  const query = typeof raw === 'string' ? raw.slice(0, 80) : '';
  const classified = classifyQuery(query);

  if (!classified) {
    return {
      attempt,
      query,
      error: 'Type at least 2 characters: a Patient ID (MD-…), a mobile number (4 or more digits) or a name in English letters.',
    };
  }

  const started = performance.now();
  const supabase = await createClient();
  let request = supabase
    .from('patients')
    .select('id, patient_code, full_name, age_years, sex, phone, created_at, branches(name, code), orders(status, created_at)')
    .order('created_at', { referencedTable: 'orders', ascending: false })
    .limit(1, { referencedTable: 'orders' })
    .order('created_at', { ascending: false })
    .limit(25);

  const column = classified.by === 'code' ? 'patient_code' : classified.by === 'phone' ? 'phone' : 'full_name';
  request = classified.exact ? request.eq(column, classified.exact) : request.ilike(column, classified.pattern!);

  const { data, error } = await request;
  const elapsedMs = Math.round(performance.now() - started);

  if (error) {
    console.warn('search failed', error.code);
    return { attempt, query, error: 'Search is not available right now. Please try again.' };
  }

  const results: SearchResult[] = (data ?? []).map((p) => ({
    id: p.id,
    patientCode: p.patient_code,
    fullName: p.full_name,
    ageYears: p.age_years,
    sex: p.sex,
    phoneMasked: maskPhone(p.phone),
    branchName: p.branches?.name ?? '',
    branchCode: p.branches?.code ?? '',
    latestStatus: p.orders[0]?.status ?? null,
    latestOrderAt: p.orders[0]?.created_at ?? null,
  }));

  await logStaffRead(supabase, 'search', 'patients', null, { by: classified.by, results: results.length });

  return { attempt, query, by: classified.by, results, elapsedMs };
}
