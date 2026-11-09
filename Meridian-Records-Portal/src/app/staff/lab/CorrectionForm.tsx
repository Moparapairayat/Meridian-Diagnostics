'use client';

import { useActionState, useState } from 'react';
import { inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from '@/components/ui/styles';
import type { ActionResult } from '@/lib/db-errors';
import { correctResult } from './actions';

/** Per-value correction with a mandatory reason (source becomes manual_correction). */
export function CorrectionForm({ resultId, analyte, current }: { resultId: string; analyte: string; current: number }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(correctResult, {});
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div>
        <button type="button" onClick={() => setOpen(true)} className="min-h-11 text-sm font-semibold text-primary underline underline-offset-4">
          Correct<span className="sr-only"> {analyte}</span>
        </button>
        {state.message && <p role="status" className="text-xs text-success">{state.message}</p>}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-2 rounded-md border border-border bg-page p-3">
      <input type="hidden" name="resultId" value={resultId} />
      <div className="space-y-1">
        <label htmlFor={`v-${resultId}`} className={labelClass}>
          Corrected value for {analyte}
        </label>
        <input id={`v-${resultId}`} name="value" inputMode="decimal" defaultValue={String(current)} required className={inputClass} />
      </div>
      <div className="space-y-1">
        <label htmlFor={`r-${resultId}`} className={labelClass}>
          Reason (required)
        </label>
        <input id={`r-${resultId}`} name="reason" required minLength={3} maxLength={500} className={inputClass} />
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? 'Saving…' : 'Save correction'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={secondaryButtonClass}>
          Cancel
        </button>
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-danger">
          <span className="font-semibold">Error:</span> {state.error}
        </p>
      )}
    </form>
  );
}
