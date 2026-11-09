'use server';

import { redirect } from 'next/navigation';
import { markActive } from '@/lib/auth/staff';
import { createClient } from '@/lib/supabase/server';
import { PASSWORD_RULE_TEXT, newPasswordSchema } from '@/lib/validation/auth';

export interface ResetState {
  error?: string;
}

export async function updatePassword(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect('/login?error=link');

  const parsed = newPasswordSchema.safeParse({
    password: formData.get('password'),
    confirm: formData.get('confirm'),
  });
  if (!parsed.success) {
    const mismatch = parsed.error.issues.some((i) => i.path[0] === 'confirm');
    return { error: mismatch ? 'The two passwords do not match.' : `Choose a stronger password. ${PASSWORD_RULE_TEXT}` };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    console.warn('password update failed', error.code ?? error.status);
    return { error: `The password could not be saved. ${PASSWORD_RULE_TEXT} It must also differ from your old password.` };
  }

  await markActive();
  redirect('/staff?password=updated');
}
