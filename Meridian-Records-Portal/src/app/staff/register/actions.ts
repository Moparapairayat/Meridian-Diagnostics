'use server';

import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/staff';
import { PRIVACY_VERSION } from '@/lib/i18n/privacy';
import { createClient } from '@/lib/supabase/server';
import { FIELD_MESSAGES, registerSchema, type RegisterField } from '@/lib/validation/patient';

/** What the receptionist typed, echoed back so nothing has to be typed twice. */
export interface RegisterValues {
  fullName: string;
  ageYears: string;
  sex: string;
  phone: string;
  email: string;
  preferredChannel: string;
  language: string;
  emailOptIn: boolean;
  consent: boolean;
  tests: string[];
}

export interface DuplicateMatch {
  id: string;
  patientCode: string;
  fullName: string;
  branch: string;
}

export interface RegisterState {
  attempt: number;
  values?: RegisterValues;
  fieldErrors?: Partial<Record<RegisterField, string>>;
  duplicates?: DuplicateMatch[];
  formError?: string;
  savedPatientId?: string;
}

function str(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === 'string' ? v.slice(0, 300) : '';
}

export async function registerPatient(prev: RegisterState, formData: FormData): Promise<RegisterState> {
  const staff = await requireRole('receptionist');
  const attempt = prev.attempt + 1;

  const values: RegisterValues = {
    fullName: str(formData, 'fullName'),
    ageYears: str(formData, 'ageYears'),
    sex: str(formData, 'sex'),
    phone: str(formData, 'phone'),
    email: str(formData, 'email'),
    preferredChannel: str(formData, 'preferredChannel') || 'sms_demo',
    language: str(formData, 'language') || 'bn',
    emailOptIn: formData.get('emailOptIn') === 'on',
    consent: formData.get('consent') === 'on',
    tests: formData.getAll('tests').filter((t): t is string => typeof t === 'string').slice(0, 20),
  };

  const parsed = registerSchema.safeParse({ ...values });
  if (!parsed.success) {
    const fieldErrors: Partial<Record<RegisterField, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as RegisterField;
      if (field in FIELD_MESSAGES) fieldErrors[field] ??= FIELD_MESSAGES[field];
    }
    return { attempt, values, fieldErrors };
  }
  const input = parsed.data;
  const supabase = await createClient();

  // Returning patients are never re-registered (SPEC 5.2): warn on the same phone.
  if (formData.get('confirmDuplicate') !== 'yes') {
    const { data: matches } = await supabase
      .from('patients')
      .select('id, patient_code, full_name, branches(name, code)')
      .eq('phone', input.phone)
      .limit(5);
    if (matches && matches.length > 0) {
      return {
        attempt,
        values,
        duplicates: matches.map((m) => ({
          id: m.id,
          patientCode: m.patient_code,
          fullName: m.full_name,
          branch: m.branches ? `${m.branches.name} (${m.branches.code})` : '',
        })),
      };
    }
  }

  const { data: patient, error: insertError } = await supabase
    .from('patients')
    .insert({
      full_name: input.fullName,
      age_years: input.ageYears,
      sex: input.sex,
      phone: input.phone,
      email: input.email,
      email_opt_in: input.emailOptIn,
      preferred_channel: input.preferredChannel,
      language: input.language,
      registered_branch_id: staff.branchId,
      consent_version: PRIVACY_VERSION,
    })
    .select('id')
    .single();

  if (insertError || !patient) {
    console.warn('register: patient insert failed', insertError?.code);
    return { attempt, values, formError: 'The patient could not be saved. Please check the details and try again.' };
  }

  const { data: orderId, error: orderError } = await supabase.rpc('create_order', {
    p_patient_id: patient.id,
    p_test_codes: input.tests,
  });

  if (orderError || !orderId) {
    console.warn('register: create_order failed', orderError?.code);
    return {
      attempt,
      values,
      savedPatientId: patient.id,
      formError: 'The patient was saved, but the order could not be created. Open the patient record and use New order.',
    };
  }

  redirect(`/staff/register?done=${orderId}`);
}
