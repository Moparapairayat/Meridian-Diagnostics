'use client';

import { useActionState } from 'react';
import { MailCheck } from 'lucide-react';
import { IconInput } from '@/components/ui/IconInput';
import { Alert } from '@/components/ui/primitives';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { labelClass } from '@/components/ui/styles';
import { requestPasswordReset, type ForgotState } from './actions';

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState<ForgotState, FormData>(requestPasswordReset, {});

  if (state.sent) {
    return (
      <div role="status" className="animate-fade-up rounded-2xl border border-line bg-surface p-6 text-center shadow-sm">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-primary-soft text-primary">
          <MailCheck aria-hidden="true" className="size-6" />
        </span>
        <p className="mt-4 font-semibold text-ink">Check your inbox</p>
        <p className="mt-1.5 text-sm text-ink-muted">
          If an account exists for that address, a reset link is on its way. It works once and expires in one hour.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      <div className="space-y-1.5">
        <label htmlFor="email" className={labelClass}>
          Work email
        </label>
        <IconInput
          icon="mail"
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          spellCheck={false}
          placeholder="name@meridian.example"
          required
          aria-invalid={state.error ? true : undefined}
        />
      </div>
      <SubmitButton pendingText="Sending…">Send reset link</SubmitButton>
    </form>
  );
}
