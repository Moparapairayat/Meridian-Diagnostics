'use client';

import { useActionState, useState } from 'react';
import { TestPicker, type CatalogTest } from '@/components/staff/TestPicker';
import { Notice } from '@/components/ui/Notice';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { primaryButtonClass } from '@/components/ui/styles';
import { createOrderForPatient, type NewOrderState } from './actions';

export function NewOrderForm({ patientId, tests }: { patientId: string; tests: CatalogTest[] }) {
  const [state, formAction] = useActionState<NewOrderState, FormData>(createOrderForPatient, { attempt: 0 });
  const [open, setOpen] = useState(false);

  if (!open && !state.error) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={primaryButtonClass}>
        New order
      </button>
    );
  }

  return (
    <form key={state.attempt} action={formAction} className="space-y-4 rounded-xl border border-border bg-surface p-4">
      <h2 className="text-lg font-semibold text-ink">New order</h2>
      <p className="text-sm text-ink-muted">Patient details are already on file. Choose the tests only.</p>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <input type="hidden" name="patientId" value={patientId} />
      <TestPicker tests={tests} defaultSelected={state.tests} />
      <div className="sm:max-w-xs">
        <SubmitButton pendingText="Creating order…">Create order and invoice</SubmitButton>
      </div>
    </form>
  );
}
