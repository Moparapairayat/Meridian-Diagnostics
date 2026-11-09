'use client';

import { useFormStatus } from 'react-dom';
import { primaryButtonClass } from './styles';

/** Submit button that disables itself and shows progress while the form action runs. */
export function SubmitButton({ children, pendingText }: { children: React.ReactNode; pendingText: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={`${primaryButtonClass} w-full`} disabled={pending} aria-disabled={pending}>
      {pending ? pendingText : children}
    </button>
  );
}
