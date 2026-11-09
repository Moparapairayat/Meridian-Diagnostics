// Shared Tailwind class strings for form controls (24px+ targets, visible focus).
export const inputClass =
  'block w-full min-h-11 rounded-md border border-border bg-surface px-3 py-2 text-base text-ink placeholder:text-ink-muted ' +
  'aria-[invalid=true]:border-danger';

export const labelClass = 'block text-sm font-semibold text-ink';

export const primaryButtonClass =
  'inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 py-2 text-base font-semibold text-primary-fg ' +
  'transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70';

export const secondaryButtonClass =
  'inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-4 py-2 text-sm font-semibold text-ink ' +
  'transition-colors hover:bg-primary-soft';

export const linkClass = 'text-primary underline underline-offset-4 hover:text-primary-hover';
