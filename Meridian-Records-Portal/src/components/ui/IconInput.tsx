'use client';

import { useState, type ComponentProps } from 'react';
import { Eye, EyeOff, Lock, Mail, type LucideIcon } from 'lucide-react';
import { inputClass } from './styles';

const ICONS = { mail: Mail, lock: Lock } as const satisfies Record<string, LucideIcon>;

/** Input with a leading icon. The icon is decorative; the <label> names the field. */
export function IconInput({ icon, className = '', ...props }: ComponentProps<'input'> & { icon: keyof typeof ICONS }) {
  const Icon = ICONS[icon];
  return (
    <div className="relative">
      <Icon aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 size-[1.05rem] -translate-y-1/2 text-ink-muted" />
      <input {...props} className={`${inputClass} pl-10 ${className}`} />
    </div>
  );
}

/** Password input with a show/hide button (keyboard and screen-reader friendly). */
export function PasswordInput(props: ComponentProps<'input'>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Lock aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 size-[1.05rem] -translate-y-1/2 text-ink-muted" />
      <input {...props} type={visible ? 'text' : 'password'} className={`${inputClass} pr-12 pl-10`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-pressed={visible}
        aria-controls={props.id}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute top-1/2 right-1.5 grid size-9 -translate-y-1/2 place-items-center rounded-[8px] text-ink-muted transition-colors hover:bg-sunken hover:text-ink"
      >
        {visible ? <EyeOff aria-hidden="true" className="size-[1.05rem]" /> : <Eye aria-hidden="true" className="size-[1.05rem]" />}
      </button>
    </div>
  );
}
