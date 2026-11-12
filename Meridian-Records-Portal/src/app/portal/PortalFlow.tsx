'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { LoaderCircle, Mail, MessageSquareText, RotateCcw, Smartphone } from 'lucide-react';
import { buttonClass, choiceClass, inputClass, labelClass } from '@/components/ui/styles';
import { t, type Lang } from '@/lib/i18n';
import { portalAction, type PortalState } from './actions';

function Submit({ label, pending: pendingLabel, intent, variant = 'primary' }: { label: string; pending: string; intent: string; variant?: 'primary' | 'secondary' }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name="intent" value={intent} disabled={pending} className={buttonClass({ variant, size: 'lg', full: true })}>
      {pending && <LoaderCircle aria-hidden="true" className="animate-spin" />}
      {pending ? pendingLabel : label}
    </button>
  );
}

function Message({ lang, state }: { lang: Lang; state: PortalState }) {
  if (!state.messageKey) return null;
  const isError = state.messageKey !== 'portal.newCodeSent';
  return (
    <p
      role={isError ? 'alert' : 'status'}
      className={`rounded-[10px] border px-4 py-3 text-sm ${isError ? 'border-danger-line bg-danger-bg text-danger' : 'border-[#bfdcd9] bg-primary-soft text-primary-ink'}`}
    >
      {t(lang, state.messageKey)}
    </p>
  );
}

function useSecondsUntil(at?: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!at) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [at]);
  // Capped at 60: the server and browser clocks can differ by a moment.
  return at ? Math.min(60, Math.max(0, Math.ceil((at - now) / 1000))) : 0;
}

function Steps({ lang, step }: { lang: Lang; step: 1 | 2 }) {
  const items = [t(lang, 'portal.stepDetails'), t(lang, 'portal.stepCode')];
  return (
    <ol className="mb-6 flex items-center gap-3 text-sm" aria-label={`${t(lang, 'portal.stepOf')} ${step} / 2`}>
      {items.map((label, i) => {
        const n = (i + 1) as 1 | 2;
        const active = n === step;
        const done = n < step;
        return (
          <li key={label} className="flex items-center gap-2" aria-current={active ? 'step' : undefined}>
            <span
              className={`grid size-7 place-items-center rounded-full text-xs font-bold ${
                active ? 'bg-primary text-white' : done ? 'bg-primary-soft text-primary-ink' : 'bg-sunken text-ink-muted'
              }`}
            >
              {n}
            </span>
            <span className={active ? 'font-semibold whitespace-nowrap text-ink' : 'hidden whitespace-nowrap text-ink-muted sm:inline'}>{label}</span>
            {n === 1 && <span aria-hidden="true" className="mx-1 h-px w-6 bg-line-strong" />}
          </li>
        );
      })}
    </ol>
  );
}

/** Two-step OTP login: details -> code. All checks happen in the Server Action. */
export function PortalFlow({ lang, initial }: { lang: Lang; initial: PortalState }) {
  const [state, formAction] = useActionState<PortalState, FormData>(portalAction, initial);
  const wait = useSecondsUntil(state.resendAt);

  if (state.step === 'request') {
    return (
      <div>
        <Steps lang={lang} step={1} />
        <form key={state.attempt} action={formAction} className="space-y-5" noValidate>
          <Message lang={lang} state={state} />
          <div className="space-y-1.5">
            <label htmlFor="patientCode" className={labelClass}>
              {t(lang, 'portal.patientId')}
            </label>
            <input
              id="patientCode"
              name="patientCode"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="MD-2026-00012"
              aria-describedby="patientCode-hint"
              className={`${inputClass} tabular font-mono tracking-wide uppercase`}
            />
            <p id="patientCode-hint" className="text-sm text-ink-muted">
              {t(lang, 'portal.patientIdHint')}
            </p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="phone" className={labelClass}>
              {t(lang, 'portal.phone')}
            </label>
            <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="01712345678" aria-describedby="phone-hint" className={`${inputClass} tabular`} />
            <p id="phone-hint" className="text-sm text-ink-muted">
              {t(lang, 'portal.phoneHint')}
            </p>
          </div>
          <fieldset className="space-y-2">
            <legend className={`${labelClass} mb-1.5`}>{t(lang, 'portal.channel')}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {(['sms_demo', 'email'] as const).map((ch) => {
                const Icon = ch === 'sms_demo' ? Smartphone : Mail;
                return (
                  <label key={ch} className={choiceClass}>
                    <input type="radio" name="channel" value={ch} defaultChecked={ch === 'sms_demo'} className="sr-only" />
                    <Icon aria-hidden="true" className="size-5 shrink-0 text-primary" />
                    <span className="text-[0.95rem] font-medium text-ink">{t(lang, ch === 'sms_demo' ? 'portal.channelSms' : 'portal.channelEmail')}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          <Submit intent="request" label={t(lang, 'portal.sendCode')} pending={t(lang, 'portal.sending')} />
        </form>
      </div>
    );
  }

  return (
    <div>
      <Steps lang={lang} step={2} />
      <div className="space-y-5">
        <div role="status">
          <p className="font-medium text-ink">{t(lang, 'portal.sentGeneric')}</p>
          {state.destination && (
            <p className="mt-0.5 text-sm text-ink-muted">
              {t(lang, 'portal.sentTo')}: <span className="tabular font-mono text-ink-2">{state.destination}</span>
            </p>
          )}
        </div>

        {state.demoCode && (
          <aside aria-label={t(lang, 'portal.demoSmsTitle')} className="animate-fade-up rounded-[14px] border border-warning-border bg-warning-bg p-4 text-warning-fg shadow-xs">
            <p className="flex items-center gap-2 text-xs font-bold tracking-[0.08em] uppercase">
              <MessageSquareText aria-hidden="true" className="size-4" />
              {t(lang, 'portal.demoSmsTitle')}
            </p>
            <p className="tabular mt-2 font-mono text-[2rem] leading-none font-bold tracking-[0.35em] text-ink">{state.demoCode}</p>
            <p className="mt-2 text-xs">{t(lang, 'portal.demoSmsNote')}</p>
            {state.fellBack && <p className="mt-1 text-xs">{t(lang, 'portal.emailFallback')}</p>}
          </aside>
        )}

        <form key={state.attempt} action={formAction} className="space-y-4" noValidate>
          <Message lang={lang} state={state} />
          <div className="space-y-1.5">
            <label htmlFor="code" className={labelClass}>
              {t(lang, 'portal.codeLabel')}
            </label>
            <input
              id="code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              placeholder="••••••"
              aria-describedby="code-hint"
              className={`${inputClass} tabular h-16 text-center font-mono text-[1.75rem] font-semibold tracking-[0.5em] placeholder:tracking-[0.5em]`}
            />
            <p id="code-hint" className="text-sm text-ink-muted">
              {t(lang, 'portal.codeHint')}
            </p>
          </div>
          <Submit intent="code" label={t(lang, 'portal.verify')} pending={t(lang, 'portal.verifying')} />
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <form action={formAction}>
            {wait > 0 ? (
              <p className="tabular text-sm text-ink-muted" aria-live="polite">
                {t(lang, 'portal.resendIn')} {wait} {t(lang, 'portal.seconds')}
              </p>
            ) : (
              <button type="submit" name="intent" value="resend" className={buttonClass({ variant: 'ghost', size: 'sm' })}>
                <RotateCcw aria-hidden="true" />
                {t(lang, 'portal.resend')}
              </button>
            )}
          </form>
          <form action={formAction}>
            <button type="submit" name="intent" value="restart" className="min-h-9 text-sm font-medium text-ink-muted underline-offset-4 hover:text-ink hover:underline">
              {t(lang, 'portal.startOver')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
