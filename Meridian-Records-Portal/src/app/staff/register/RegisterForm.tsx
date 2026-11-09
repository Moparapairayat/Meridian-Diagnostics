'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { Notice } from '@/components/ui/Notice';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { inputClass, labelClass, linkClass, secondaryButtonClass } from '@/components/ui/styles';
import { TestPicker, type CatalogTest } from '@/components/staff/TestPicker';
import { registerPatient, type RegisterState } from './actions';

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-sm text-danger">
      {message}
    </p>
  );
}

export function RegisterForm({ tests }: { tests: CatalogTest[] }) {
  const [state, formAction] = useActionState<RegisterState, FormData>(registerPatient, { attempt: 0 });
  const v = state.values;
  const e = state.fieldErrors ?? {};
  const err = (field: keyof typeof e) => (e[field] ? { 'aria-invalid': true, 'aria-describedby': `${field}-error` } : {});

  return (
    // Re-mount after each server response so defaults reflect what was typed.
    <form key={state.attempt} action={formAction} className="space-y-6" noValidate>
      {Object.keys(e).length > 0 && <Notice tone="error">Please correct the highlighted fields.</Notice>}
      {state.formError && (
        <Notice tone="error">
          {state.formError}{' '}
          {state.savedPatientId && (
            <Link href={`/staff/patients/${state.savedPatientId}`} className={linkClass}>
              Open patient record
            </Link>
          )}
        </Notice>
      )}

      {state.duplicates && (
        <div role="alert" className="space-y-3 rounded-md border-l-4 border-warning-border bg-warning-bg p-4 text-warning-fg">
          <p className="font-semibold">Possible duplicate: this mobile number is already registered.</p>
          <p className="text-sm">Returning patients must not be registered again. Open their record and use New order.</p>
          <ul className="space-y-1 text-sm">
            {state.duplicates.map((d) => (
              <li key={d.id}>
                <Link href={`/staff/patients/${d.id}`} className="font-semibold underline underline-offset-4">
                  {d.patientCode} · {d.fullName}
                </Link>{' '}
                · {d.branch}
              </li>
            ))}
          </ul>
          <button type="submit" name="confirmDuplicate" value="yes" className={secondaryButtonClass}>
            This is a different person: register anyway
          </button>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2" aria-labelledby="patient-heading">
        <h2 id="patient-heading" className="text-lg font-semibold text-ink sm:col-span-2">
          Patient details
        </h2>
        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="fullName" className={labelClass}>
            Full name (English letters)
          </label>
          <input id="fullName" name="fullName" autoComplete="off" defaultValue={v?.fullName} className={inputClass} {...err('fullName')} />
          <FieldError id="fullName-error" message={e.fullName} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="ageYears" className={labelClass}>
            Age (years)
          </label>
          <input id="ageYears" name="ageYears" type="number" inputMode="numeric" min={0} max={120} defaultValue={v?.ageYears} className={inputClass} {...err('ageYears')} />
          <FieldError id="ageYears-error" message={e.ageYears} />
        </div>
        <fieldset className="space-y-1.5" {...(e.sex ? { 'aria-describedby': 'sex-error' } : {})}>
          <legend className={labelClass}>Sex</legend>
          <div className="flex flex-wrap gap-2">
            {(['female', 'male', 'other'] as const).map((s) => (
              <label key={s} className="flex min-h-11 items-center gap-2 rounded-md border border-border bg-surface px-3 has-[:checked]:border-primary has-[:checked]:bg-primary-soft">
                <input type="radio" name="sex" value={s} defaultChecked={v?.sex === s} className="size-5 accent-primary" />
                <span className="capitalize">{s}</span>
              </label>
            ))}
          </div>
          <FieldError id="sex-error" message={e.sex} />
        </fieldset>
        <div className="space-y-1.5">
          <label htmlFor="phone" className={labelClass}>
            Mobile number
          </label>
          <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="off" placeholder="01712345678" defaultValue={v?.phone} className={inputClass} {...err('phone')} />
          <FieldError id="phone-error" message={e.phone} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="email" className={labelClass}>
            Email (optional)
          </label>
          <input id="email" name="email" type="email" autoComplete="off" defaultValue={v?.email} className={inputClass} {...err('email')} />
          <FieldError id="email-error" message={e.email} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="language" className={labelClass}>
            Language for portal and emails
          </label>
          <select id="language" name="language" defaultValue={v?.language ?? 'bn'} className={inputClass}>
            <option value="bn">Bangla</option>
            <option value="en">English</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="preferredChannel" className={labelClass}>
            Preferred channel for one-time codes
          </label>
          <select id="preferredChannel" name="preferredChannel" defaultValue={v?.preferredChannel ?? 'sms_demo'} className={inputClass} {...err('preferredChannel')}>
            <option value="sms_demo">SMS (demo)</option>
            <option value="email">Email</option>
          </select>
          <FieldError id="preferredChannel-error" message={e.preferredChannel} />
        </div>
      </section>

      <section aria-labelledby="tests-heading" className="space-y-2">
        <h2 id="tests-heading" className="text-lg font-semibold text-ink">
          Order
        </h2>
        <TestPicker tests={tests} defaultSelected={v?.tests} error={e.tests} />
      </section>

      <section aria-labelledby="consent-heading" className="space-y-3 rounded-md border border-border bg-surface p-4">
        <h2 id="consent-heading" className="text-lg font-semibold text-ink">
          Consent
        </h2>
        <label className="flex items-start gap-3">
          <input type="checkbox" name="consent" defaultChecked={v?.consent} className="mt-1 size-5 shrink-0 accent-primary" {...err('consent')} />
          <span>
            <strong>Required.</strong> The{' '}
            <Link href="/privacy" target="_blank" className={linkClass}>
              privacy notice
            </Link>{' '}
            has been shown and the patient agrees to the processing of their data for diagnostic services.
          </span>
        </label>
        <FieldError id="consent-error" message={e.consent} />
        <label className="flex items-start gap-3">
          <input type="checkbox" name="emailOptIn" defaultChecked={v?.emailOptIn ?? false} className="mt-1 size-5 shrink-0 accent-primary" />
          <span>
            <strong>Optional.</strong> Patient agrees to receive email notifications.
          </span>
        </label>
      </section>

      <div className="sm:max-w-xs">
        <SubmitButton pendingText="Registering…">Register and create order</SubmitButton>
      </div>
    </form>
  );
}
