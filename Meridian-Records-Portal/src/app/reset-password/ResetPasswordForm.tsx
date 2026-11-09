'use client';

import { useActionState } from 'react';
import { Notice } from '@/components/ui/Notice';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { inputClass, labelClass } from '@/components/ui/styles';
import { PASSWORD_RULE_TEXT } from '@/lib/validation/auth';
import { updatePassword, type ResetState } from './actions';

export function ResetPasswordForm() {
  const [state, formAction] = useActionState<ResetState, FormData>(updatePassword, {});

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <div className="space-y-1.5">
        <label htmlFor="password" className={labelClass}>
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          aria-describedby="password-rule"
          aria-invalid={state.error ? true : undefined}
          className={inputClass}
        />
        <p id="password-rule" className="text-sm text-ink-muted">
          {PASSWORD_RULE_TEXT}
        </p>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="confirm" className={labelClass}>
          Confirm new password
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={state.error ? true : undefined}
          className={inputClass}
        />
      </div>
      <SubmitButton pendingText="Saving…">Save new password</SubmitButton>
    </form>
  );
}
