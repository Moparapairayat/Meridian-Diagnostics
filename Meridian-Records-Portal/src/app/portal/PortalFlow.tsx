'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from '@/components/ui/styles';
import { t, type Lang } from '@/lib/i18n';
import { portalAction, type PortalState } from './actions';

function Submit({ label, pending: pendingLabel, intent, secondary }: { label: string; pending: string; intent: string; secondary?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name="intent"
      value={intent}
      disabled={pending}
      className={`${secondary ? secondaryButtonClass : primaryButtonClass} w-full`}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

function Message({ lang, state }: { lang: Lang; state: PortalState }) {
  if (!state.messageKey) return null;
  const isError = state.messageKey !== 'portal.newCodeSent';
  return (
    <p role={isError ? 'alert' : 'status'} className={`rounded-md border-l-4 px-4 py-3 text-sm ${isError ? 'border-danger bg-red-50 text-danger' : 'border-primary bg-primary-soft text-ink'}`}>
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

/** Two-step OTP login: details -> code. All checks happen in the Server Action. */
export function PortalFlow({ lang, initial }: { lang: Lang; initial: PortalState }) {
  const [state, formAction] = useActionState<PortalState, FormData>(portalAction, initial);
  const wait = useSecondsUntil(state.resendAt);

  if (state.step === 'request') {
    return (
      <form key={state.attempt} action={formAction} className="space-y-5" noValidate>
        <Message lang={lang} state={state} />
        <div className="space-y-1.5">
          <label htmlFor="patientCode" className={labelClass}>
            {t(lang, 'portal.patientId')}
          </label>
          <input id="patientCode" name="patientCode" autoComplete="off" autoCapitalize="characters" placeholder="MD-2026-00012" aria-describedby="patientCode-hint" className={`${inputClass} font-mono uppercase`} />
          <p id="patientCode-hint" className="text-sm text-ink-muted">
            {t(lang, 'portal.patientIdHint')}
          </p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="phone" className={labelClass}>
            {t(lang, 'portal.phone')}
          </label>
          <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="01712345678" aria-describedby="phone-hint" className={inputClass} />
          <p id="phone-hint" className="text-sm text-ink-muted">
            {t(lang, 'portal.phoneHint')}
          </p>
        </div>
        <fieldset className="space-y-2">
          <legend className={labelClass}>{t(lang, 'portal.channel')}</legend>
          {(['sms_demo', 'email'] as const).map((ch) => (
            <label key={ch} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-border bg-surface px-3 has-checked:border-primary has-checked:bg-primary-soft">
              <input type="radio" name="channel" value={ch} defaultChecked={ch === 'sms_demo'} className="size-5 accent-primary" />
              <span>{t(lang, ch === 'sms_demo' ? 'portal.channelSms' : 'portal.channelEmail')}</span>
            </label>
          ))}
        </fieldset>
        <Submit intent="request" label={t(lang, 'portal.sendCode')} pending={t(lang, 'portal.sending')} />
      </form>
    );
  }

  return (
    <div className="space-y-5">
      <p role="status" className="text-ink">
        {t(lang, 'portal.sentGeneric')}{' '}
        {state.destination && (
          <span className="block text-sm text-ink-muted">
            {t(lang, 'portal.sentTo')}: <span className="font-mono">{state.destination}</span>
          </span>
        )}
      </p>

      {state.demoCode && (
        <aside aria-label={t(lang, 'portal.demoSmsTitle')} className="rounded-lg border-2 border-dashed border-warning-border bg-warning-bg p-4 text-warning-fg">
          <p className="text-sm font-bold uppercase tracking-wide">{t(lang, 'portal.demoSmsTitle')}</p>
          <p className="mt-1 font-mono text-3xl font-bold tracking-[0.3em]">{state.demoCode}</p>
          <p className="mt-1 text-xs">{t(lang, 'portal.demoSmsNote')}</p>
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
            aria-describedby="code-hint"
            className={`${inputClass} font-mono text-2xl tracking-[0.4em]`}
          />
          <p id="code-hint" className="text-sm text-ink-muted">
            {t(lang, 'portal.codeHint')}
          </p>
        </div>
        <Submit intent="code" label={t(lang, 'portal.verify')} pending={t(lang, 'portal.verifying')} />
      </form>

      <form action={formAction} className="space-y-2">
        {wait > 0 ? (
          <p className="text-sm text-ink-muted" aria-live="polite">
            {t(lang, 'portal.resendIn')} {wait} {t(lang, 'portal.seconds')}
          </p>
        ) : (
          <Submit intent="resend" secondary label={t(lang, 'portal.resend')} pending={t(lang, 'portal.sending')} />
        )}
      </form>
      <form action={formAction}>
        <button type="submit" name="intent" value="restart" className="min-h-11 text-sm font-semibold text-primary underline underline-offset-4">
          {t(lang, 'portal.startOver')}
        </button>
      </form>
    </div>
  );
}
