/** Meridian mark: a meridian arc over a horizon line, in brand teal. */
export function LogoMark({ className = 'size-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="9" fill="#0d6b70" />
      <path d="M8 21.5a8 8 0 0 1 16 0" fill="none" stroke="#faf8f5" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M16 8.5v13" stroke="#faf8f5" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M7 24.5h18" stroke="#9fd3cf" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ subtitle }: { subtitle?: string }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark />
      <span className="leading-tight">
        <span className="block font-display text-[1.05rem] font-semibold tracking-[-0.01em] text-ink">Meridian</span>
        {subtitle && <span className="block text-[0.7rem] font-medium tracking-[0.06em] text-ink-muted uppercase">{subtitle}</span>}
      </span>
    </span>
  );
}
