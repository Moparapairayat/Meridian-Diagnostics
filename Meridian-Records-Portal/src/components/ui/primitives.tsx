import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from 'lucide-react';
import { buttonClass, cardClass, errorClass, hintClass, labelClass, type ButtonSize, type ButtonVariant } from './styles';

/* ----------------------------------------------------------------------------
 * Small, server-safe building blocks for the "Calm Clinical" design system.
 * ------------------------------------------------------------------------- */

export function LinkButton({
  variant,
  size,
  full,
  className = '',
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize; full?: boolean }) {
  return <Link {...props} className={`${buttonClass({ variant, size, full })} ${className}`} />;
}

export function Card({ className = '', ...rest }: ComponentProps<'div'>) {
  return <div className={`${cardClass} ${className}`} {...rest} />;
}

export function CardHeader({ title, description, action, id }: { title: ReactNode; description?: ReactNode; action?: ReactNode; id?: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
      <div className="min-w-0">
        <h2 id={id} className="text-base font-semibold text-ink">
          {title}
        </h2>
        {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'clay';

const BADGE: Record<Tone, string> = {
  neutral: 'bg-sunken text-ink-2 ring-line-strong',
  primary: 'bg-primary-soft text-primary-ink ring-[#bfdcd9]',
  success: 'bg-success-bg text-success ring-success-line',
  warning: 'bg-warning-bg text-warning-fg ring-warning-border',
  danger: 'bg-danger-bg text-danger ring-danger-line',
  info: 'bg-info-bg text-info ring-[#c3d7ea]',
  clay: 'bg-[#f7ece4] text-clay ring-[#e6cbb8]',
};
const DOT: Record<Tone, string> = {
  neutral: 'bg-ink-muted',
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-[#c57a1c]',
  danger: 'bg-danger',
  info: 'bg-info',
  clay: 'bg-clay',
};

export function Badge({ tone = 'neutral', dot = false, children, srLabel }: { tone?: Tone; dot?: boolean; children: ReactNode; srLabel?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${BADGE[tone]}`}>
      {dot && <span aria-hidden="true" className={`size-1.5 rounded-full ${DOT[tone]}`} />}
      {srLabel && <span className="sr-only">{srLabel} </span>}
      {children}
    </span>
  );
}

const ALERT: Record<'info' | 'success' | 'warning' | 'danger', { box: string; icon: LucideIcon; label: string }> = {
  info: { box: 'border-[#c3d7ea] bg-info-bg text-info', icon: Info, label: 'Note' },
  success: { box: 'border-success-line bg-success-bg text-success', icon: CircleCheck, label: 'Done' },
  warning: { box: 'border-warning-border bg-warning-bg text-warning-fg', icon: TriangleAlert, label: 'Warning' },
  danger: { box: 'border-danger-line bg-danger-bg text-danger', icon: CircleAlert, label: 'Error' },
};

/** Message box: meaning is carried by an icon, a hidden label and the text (not colour only). */
export function Alert({ tone = 'info', title, children, srLabel }: { tone?: keyof typeof ALERT; title?: ReactNode; children?: ReactNode; srLabel?: string }) {
  const a = ALERT[tone];
  const Icon = a.icon;
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={`flex gap-3 rounded-[10px] border px-4 py-3 text-sm ${a.box}`}>
      <Icon aria-hidden="true" className="mt-0.5 size-[1.15rem] shrink-0" />
      <div className="min-w-0 text-ink">
        <span className="sr-only">{srLabel ?? a.label}: </span>
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? 'mt-0.5 text-ink-2' : ''}>{children}</div>}
      </div>
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className = '',
  optional,
}: {
  label: ReactNode;
  htmlFor: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
  optional?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={htmlFor} className={labelClass}>
        {label}
        {optional && <span className="ml-1.5 font-normal text-ink-muted">{optional}</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${htmlFor}-hint`} className={hintClass}>
          {hint}
        </p>
      )}
      {error && (
        <p id={`${htmlFor}-error`} className={`${errorClass} flex items-start gap-1.5`}>
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

/** aria wiring for a Field's control. */
export function fieldAria(id: string, { hint, error }: { hint?: boolean; error?: string }) {
  if (error) return { 'aria-invalid': true as const, 'aria-describedby': `${id}-error` };
  return hint ? { 'aria-describedby': `${id}-hint` } : {};
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  back,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <header className="mb-8 animate-fade-up">
      {back && (
        <Link href={back.href} className="mb-4 inline-flex min-h-9 items-center gap-1 text-sm font-medium text-ink-muted hover:text-ink">
          <span aria-hidden="true">←</span> {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && <p className="mb-1.5 text-xs font-semibold tracking-[0.08em] text-primary uppercase">{eyebrow}</p>}
          <h1 className="font-display text-[1.85rem] leading-tight font-semibold tracking-[-0.01em] text-ink sm:text-[2.15rem]">{title}</h1>
          {description && <p className="mt-2 max-w-2xl text-[0.98rem] text-ink-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-[14px] border border-dashed border-line-strong bg-surface/60 px-6 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-primary-soft text-primary">
        <Icon aria-hidden="true" className="size-6" />
      </span>
      <p className="mt-4 font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-[10px] bg-sunken ${className}`} />;
}

export function SectionTitle({ children, id, aside }: { children: ReactNode; id?: string; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 id={id} className="text-[0.8rem] font-semibold tracking-[0.08em] text-ink-muted uppercase">
        {children}
      </h2>
      {aside}
    </div>
  );
}

/** Definition list item used in record headers and receipts. */
export function Meta({ label, children, mono }: { label: ReactNode; children: ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-ink-muted">{label}</dt>
      <dd className={`mt-0.5 truncate text-[0.95rem] font-semibold text-ink ${mono ? 'tabular font-mono text-[0.9rem]' : ''}`}>{children}</dd>
    </div>
  );
}

export { buttonClass };
