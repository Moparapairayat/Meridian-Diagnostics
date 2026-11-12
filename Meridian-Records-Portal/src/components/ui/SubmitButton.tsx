'use client';

import { LoaderCircle } from 'lucide-react';
import { useFormStatus } from 'react-dom';
import { buttonClass, type ButtonVariant } from './styles';

/** Submit button that disables itself and shows progress while the form action runs. */
export function SubmitButton({
  children,
  pendingText,
  variant = 'primary',
  full = true,
}: {
  children: React.ReactNode;
  pendingText: string;
  variant?: ButtonVariant;
  full?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={buttonClass({ variant, size: 'lg', full })} disabled={pending} aria-disabled={pending}>
      {pending && <LoaderCircle aria-hidden="true" className="animate-spin" />}
      {pending ? pendingText : children}
    </button>
  );
}
