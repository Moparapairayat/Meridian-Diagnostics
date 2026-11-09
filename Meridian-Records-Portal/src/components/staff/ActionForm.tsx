'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import type { ActionResult } from '@/lib/db-errors';
import { inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from '@/components/ui/styles';

type ServerAction = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

function Submit({ label, pendingLabel, variant }: { label: string; pendingLabel: string; variant: 'primary' | 'secondary' }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={variant === 'primary' ? primaryButtonClass : secondaryButtonClass}>
      {pending ? pendingLabel : label}
    </button>
  );
}

/**
 * One button (optionally with a required reason, or a confirm step) that runs
 * a Server Action and shows its error or success message as text.
 */
export function ActionForm({
  action,
  fields,
  label,
  pendingLabel,
  variant = 'primary',
  reasonLabel,
  confirmText,
}: {
  action: ServerAction;
  fields: Record<string, string>;
  label: string;
  pendingLabel: string;
  variant?: 'primary' | 'secondary';
  /** When set, a required "reason" text box is shown first. */
  reasonLabel?: string;
  /** When set, the user must confirm before the action runs. */
  confirmText?: string;
}) {
  const [state, formAction] = useActionState<ActionResult, FormData>(action, {});
  const [open, setOpen] = useState(false);
  const needsStep = Boolean(reasonLabel || confirmText);
  const id = `af-${Object.values(fields).join('-')}-${label.replace(/\W+/g, '')}`;

  if (needsStep && !open) {
    return (
      <div className="space-y-2">
        <button type="button" onClick={() => setOpen(true)} className={variant === 'primary' ? primaryButtonClass : secondaryButtonClass}>
          {label}
        </button>
        {state.message && <p role="status" className="text-sm text-success">{state.message}</p>}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {reasonLabel && (
        <div className="space-y-1">
          <label htmlFor={`${id}-reason`} className={labelClass}>
            {reasonLabel}
          </label>
          <textarea id={`${id}-reason`} name="reason" required minLength={3} maxLength={500} rows={2} className={inputClass} />
        </div>
      )}
      {confirmText && <p className="text-sm font-semibold text-ink">{confirmText}</p>}
      <div className="flex flex-wrap gap-2">
        <Submit label={needsStep ? `Confirm: ${label}` : label} pendingLabel={pendingLabel} variant={variant} />
        {needsStep && (
          <button type="button" onClick={() => setOpen(false)} className={secondaryButtonClass}>
            Cancel
          </button>
        )}
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-danger">
          <span className="font-semibold">Error:</span> {state.error}
        </p>
      )}
      {state.message && <p role="status" className="text-sm text-success">{state.message}</p>}
    </form>
  );
}
