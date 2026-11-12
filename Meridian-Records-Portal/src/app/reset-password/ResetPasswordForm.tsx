'use client';

import { useActionState, useState } from 'react';
import { Check } from 'lucide-react';
import { PasswordInput } from '@/components/ui/IconInput';
import { Alert } from '@/components/ui/primitives';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { labelClass } from '@/components/ui/styles';
import { updatePassword, type ResetState } from './actions';

const RULES = [
  { label: 'At least 10 characters', test: (p: string) => p.length >= 10 },
  { label: 'An upper-case letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'A lower-case letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'A number', test: (p: string) => /[0-9]/.test(p) },
];

export function ResetPasswordForm() {
  const [state, formAction] = useActionState<ResetState, FormData>(updatePassword, {});
  const [password, setPassword] = useState('');

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      <div className="space-y-1.5">
        <label htmlFor="password" className={labelClass}>
          New password
        </label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          required
          aria-describedby="password-rule"
          aria-invalid={state.error ? true : undefined}
          onChange={(e) => setPassword(e.currentTarget.value)}
        />
        <ul id="password-rule" className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-1.5 text-sm" aria-label="Password rules">
          {RULES.map((rule) => {
            const met = rule.test(password);
            return (
              <li key={rule.label} className={`flex items-center gap-1.5 transition-colors ${met ? 'text-success' : 'text-ink-muted'}`}>
                <span className={`grid size-4 place-items-center rounded-full ${met ? 'bg-success text-white' : 'border border-line-strong'}`}>
                  {met && <Check aria-hidden="true" className="size-3" strokeWidth={3} />}
                </span>
                {rule.label}
                <span className="sr-only">{met ? '(done)' : '(not yet)'}</span>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="confirm" className={labelClass}>
          Confirm new password
        </label>
        <PasswordInput id="confirm" name="confirm" autoComplete="new-password" required aria-invalid={state.error ? true : undefined} />
      </div>
      <SubmitButton pendingText="Saving…">Save new password</SubmitButton>
    </form>
  );
}
