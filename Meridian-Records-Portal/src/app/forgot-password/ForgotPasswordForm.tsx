'use client';

import { useActionState } from 'react';
import { Notice } from '@/components/ui/Notice';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { inputClass, labelClass } from '@/components/ui/styles';
import { requestPasswordReset, type ForgotState } from './actions';

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState<ForgotState, FormData>(requestPasswordReset, {});

  if (state.sent) {
    return (
      <Notice tone="success">
        If an account exists for that address, a reset link has been sent. The link works once and expires in one hour.
      </Notice>
    );
  }

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <div className="space-y-1.5">
        <label htmlFor="email" className={labelClass}>
          Work email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          aria-invalid={state.error ? true : undefined}
          className={inputClass}
        />
      </div>
      <SubmitButton pendingText="Sending…">Send reset link</SubmitButton>
    </form>
  );
}
