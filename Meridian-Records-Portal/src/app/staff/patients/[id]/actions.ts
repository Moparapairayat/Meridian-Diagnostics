'use server';

import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/staff';
import { createClient } from '@/lib/supabase/server';
import { newOrderSchema } from '@/lib/validation/patient';

export interface NewOrderState {
  attempt: number;
  tests?: string[];
  error?: string;
}

/** Returning patient (SPEC 5.2): a new order on the existing record, no re-registration. */
export async function createOrderForPatient(prev: NewOrderState, formData: FormData): Promise<NewOrderState> {
  await requireRole('receptionist');
  const attempt = prev.attempt + 1;
  const tests = formData.getAll('tests').filter((t): t is string => typeof t === 'string').slice(0, 20);

  const parsed = newOrderSchema.safeParse({ patientId: formData.get('patientId'), tests });
  if (!parsed.success) return { attempt, tests, error: 'Select at least one test.' };

  const supabase = await createClient();
  const { data: orderId, error } = await supabase.rpc('create_order', {
    p_patient_id: parsed.data.patientId,
    p_test_codes: parsed.data.tests,
  });
  if (error || !orderId) {
    console.warn('new order: create_order failed', error?.code);
    return { attempt, tests, error: 'The order could not be created. Please try again.' };
  }

  redirect(`/staff/register?done=${orderId}`);
}
