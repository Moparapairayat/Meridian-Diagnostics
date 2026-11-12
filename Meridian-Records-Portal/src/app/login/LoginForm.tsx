'use client';

import Link from 'next/link';
import { useActionState, useRef } from 'react';
import { ChevronRight, UsersRound } from 'lucide-react';
import { IconInput, PasswordInput } from '@/components/ui/IconInput';
import { Alert } from '@/components/ui/primitives';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { labelClass } from '@/components/ui/styles';
import { login, type LoginState } from './actions';

export interface DemoAccount {
  email: string;
  role: string;
  branch: string;
}

export function LoginForm({ next, demoAccounts }: { next: string; demoAccounts?: DemoAccount[] }) {
  const [state, formAction] = useActionState<LoginState, FormData>(login, {});
  const emailRef = useRef<HTMLInputElement>(null);

  // Demo helper: fills the email only. The password is never shown or filled.
  const fillAccount = (email: string) => {
    if (emailRef.current) emailRef.current.value = email;
    document.getElementById('password')?.focus();
  };

  return (
    <div className="space-y-8">
      <form action={formAction} className="space-y-5" noValidate>
        {state.error && <Alert tone="danger">{state.error}</Alert>}
        <input type="hidden" name="next" value={next} />
        <div className="space-y-1.5">
          <label htmlFor="email" className={labelClass}>
            Work email
          </label>
          <IconInput
            ref={emailRef}
            icon="mail"
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            spellCheck={false}
            placeholder="name@meridian.example"
            required
            defaultValue={state.email}
            aria-invalid={state.error ? true : undefined}
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="password" className={labelClass}>
              Password
            </label>
            <Link href="/forgot-password" className="text-sm font-medium text-primary hover:text-primary-hover hover:underline hover:underline-offset-4">
              Forgot password?
            </Link>
          </div>
          <PasswordInput id="password" name="password" autoComplete="current-password" required aria-invalid={state.error ? true : undefined} />
        </div>
        <div className="pt-1">
          <SubmitButton pendingText="Signing in…">Sign in</SubmitButton>
        </div>
      </form>

      {demoAccounts && demoAccounts.length > 0 && (
        <details className="group rounded-lg border border-line bg-surface shadow-xs">
          <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
            <UsersRound aria-hidden="true" className="size-4 text-primary" />
            Demo accounts
            <span className="ml-auto text-xs font-normal text-ink-muted">Fills the email only</span>
            <ChevronRight aria-hidden="true" className="size-4 text-ink-muted transition-transform group-open:rotate-90" />
          </summary>
          <ul className="border-t border-line p-1.5">
            {demoAccounts.map((a) => (
              <li key={a.email}>
                <button
                  type="button"
                  onClick={() => fillAccount(a.email)}
                  className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-canvas"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink">{a.role}</span>
                    <span className="block truncate font-mono text-xs text-ink-muted">{a.email}</span>
                  </span>
                  <span className="rounded-full bg-sunken px-2 py-0.5 text-xs font-semibold text-ink-2">{a.branch}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="border-t border-line px-4 py-3 text-xs text-ink-muted">All demo accounts share the demo password for this deployment. All data is synthetic.</p>
        </details>
      )}
    </div>
  );
}
