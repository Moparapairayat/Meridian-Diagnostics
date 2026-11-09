'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { BranchBadge, StatusBadge } from '@/components/staff/StatusBadge';
import { Notice } from '@/components/ui/Notice';
import { inputClass, labelClass, primaryButtonClass } from '@/components/ui/styles';
import { SEX_LABELS, formatDhakaDate } from '@/lib/format';
import { searchPatients, type SearchState } from './actions';

const BY_LABEL = { code: 'Patient ID', phone: 'mobile number', name: 'name' } as const;

export function SearchClient({ canRegister }: { canRegister: boolean }) {
  const [state, formAction, pending] = useActionState<SearchState, FormData>(searchPatients, { attempt: 0 });

  return (
    <div className="space-y-6">
      <form key={state.attempt} action={formAction} role="search" className="space-y-2">
        <label htmlFor="q" className={labelClass}>
          Patient ID, mobile number or name
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="q"
            name="q"
            type="search"
            autoComplete="off"
            autoFocus
            defaultValue={state.query}
            placeholder="MD-2026-00012, 01712345678 or Rahim"
            className={inputClass}
            aria-describedby="q-hint"
          />
          <button type="submit" className={`${primaryButtonClass} sm:w-40`} disabled={pending}>
            {pending ? 'Searching…' : 'Search'}
          </button>
        </div>
        <p id="q-hint" className="text-sm text-ink-muted">
          Searches all five branches.
        </p>
      </form>

      {state.error && <Notice tone="error">{state.error}</Notice>}

      {state.results && (
        <section aria-labelledby="results-heading" className="space-y-3">
          <h2 id="results-heading" className="text-lg font-semibold text-ink" aria-live="polite">
            {state.results.length === 0
              ? `No patient found by ${BY_LABEL[state.by!]}.`
              : `${state.results.length} patient${state.results.length === 1 ? '' : 's'} found by ${BY_LABEL[state.by!]}`}
            <span className="ml-2 text-sm font-normal text-ink-muted">in {state.elapsedMs} ms</span>
          </h2>
          {state.results.length === 0 && canRegister && (
            <p>
              <Link href="/staff/register" className="text-primary underline underline-offset-4">
                Register a new patient
              </Link>
            </p>
          )}
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
            {state.results.map((r) => (
              <li key={r.id}>
                <Link href={`/staff/patients/${r.id}`} className="flex flex-col gap-2 px-4 py-3 hover:bg-primary-soft sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    <span className="block font-semibold text-ink">{r.fullName}</span>
                    <span className="block text-sm text-ink-muted">
                      <span className="font-mono">{r.patientCode}</span> · {r.ageYears} y · {SEX_LABELS[r.sex] ?? r.sex} ·{' '}
                      <span className="font-mono">{r.phoneMasked}</span>
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-2">
                    <BranchBadge name={r.branchName} code={r.branchCode} />
                    {r.latestStatus ? (
                      <>
                        <StatusBadge status={r.latestStatus} />
                        <span className="text-xs text-ink-muted">{formatDhakaDate(r.latestOrderAt!)}</span>
                      </>
                    ) : (
                      <span className="text-xs text-ink-muted">No orders</span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
