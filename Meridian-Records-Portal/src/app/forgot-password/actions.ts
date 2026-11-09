'use server';

import { appUrl } from '@/lib/app-url';
import { createClient } from '@/lib/supabase/server';
import { forgotPasswordSchema } from '@/lib/validation/auth';

export interface ForgotState {
  sent?: boolean;
  error?: string;
}

/**
 * Always answers the same way, so the page never reveals whether an account
 * exists (Supabase also returns no error for unknown addresses).
 */
export async function requestPasswordReset(_prev: ForgotState, formData: FormData): Promise<ForgotState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) return { error: 'Enter a valid email address.' };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${appUrl()}/auth/confirm?next=/reset-password`,
  });
  if (error) console.warn('password reset request failed', error.code ?? error.status);

  return { sent: true };
}
