'use client';

import { primaryButtonClass } from '@/components/ui/styles';

export function PrintButton({ label = 'Print labels' }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={primaryButtonClass}>
      {label}
    </button>
  );
}
