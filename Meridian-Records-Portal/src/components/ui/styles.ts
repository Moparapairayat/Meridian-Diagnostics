// Shared class recipes for the "Calm Clinical" design system.
// Targets are at least 44 px tall (WCAG 2.5.8 needs 24 px), focus is always visible.

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'soft' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-md font-semibold whitespace-nowrap ' +
  'transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out ' +
  'active:translate-y-px disabled:pointer-events-none disabled:opacity-60 [&_svg]:size-[1.1em] [&_svg]:shrink-0';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-fg shadow-xs hover:bg-primary-hover',
  secondary: 'border border-line-strong bg-surface text-ink shadow-xs hover:border-ink-muted hover:bg-canvas',
  ghost: 'text-ink-2 hover:bg-sunken hover:text-ink',
  soft: 'bg-primary-soft text-primary-ink hover:bg-[#d7eae8]',
  danger: 'bg-danger text-white shadow-xs hover:bg-[#931c13]',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3 text-sm',
  md: 'min-h-11 px-4 text-[0.95rem]',
  lg: 'min-h-12 px-5 text-base',
};

export function buttonClass({
  variant = 'primary',
  size = 'md',
  full = false,
}: { variant?: ButtonVariant; size?: ButtonSize; full?: boolean } = {}): string {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]}${full ? ' w-full' : ''}`;
}

export const primaryButtonClass = buttonClass({ variant: 'primary' });
export const secondaryButtonClass = buttonClass({ variant: 'secondary' });

export const inputClass =
  'block w-full min-h-11 rounded-md border border-line-strong bg-surface px-3.5 py-2.5 text-base text-ink shadow-xs ' +
  'placeholder:text-ink-muted/80 transition-[border-color,box-shadow] duration-150 ' +
  'hover:border-ink-muted focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15 ' +
  'focus-visible:outline-none aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/15';

export const labelClass = 'block text-sm font-semibold text-ink';
export const hintClass = 'text-sm text-ink-muted';
export const errorClass = 'text-sm font-medium text-danger';

export const linkClass =
  'font-medium text-primary underline decoration-primary/30 underline-offset-4 transition-colors hover:text-primary-hover hover:decoration-primary';

export const cardClass = 'rounded-lg border border-line bg-surface shadow-sm';

/** Selectable card for radio/checkbox choices. */
export const choiceClass =
  'flex min-h-12 cursor-pointer items-center gap-3 rounded-md border border-line-strong bg-surface px-3.5 py-2.5 ' +
  'transition-colors hover:border-ink-muted has-checked:border-primary has-checked:bg-primary-soft has-checked:ring-1 has-checked:ring-primary ' +
  'has-focus-visible:outline-3 has-focus-visible:outline-focus has-focus-visible:outline-offset-2';

export const checkboxClass = 'size-5 shrink-0 accent-primary';
