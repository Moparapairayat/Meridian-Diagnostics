'use server';

import { redirect } from 'next/navigation';
import { markActive } from '@/lib/auth/staff';
import { safeNextPath } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';
import { loginSchema } from '@/lib/validation/auth';

export interface LoginState {
  error?: string;
  email?: string;
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    next: formData.get('next') ?? undefined,
  });
  const typedEmail = typeof formData.get('email') === 'string' ? String(formData.get('email')).slice(0, 254) : '';

  if (!parsed.success) {
    return { error: 'Enter your work email address and password.', email: typedEmail };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // Log the category only, never the email or password.
    console.warn('login failed', error.code ?? error.status);
    return { error: 'The email or password is not correct.', email: typedEmail };
  }

  await markActive();
  redirect(safeNextPath(parsed.data.next));
}
