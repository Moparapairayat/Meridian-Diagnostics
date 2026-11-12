import Link from 'next/link';
import { Building, FileSearch, ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

const POINTS = [
  { icon: FileSearch, title: 'One record, every branch', text: 'Find any patient in seconds from Central, North, South, East or West.' },
  { icon: ShieldCheck, title: 'Private by design', text: 'Each role sees only what the job needs, and every access is logged.' },
  { icon: Building, title: 'Typed once, never again', text: 'Registration, barcodes and results flow through without re-typing.' },
];

const TIMELINE = [
  { label: 'Registered', time: '09:12', done: true },
  { label: 'Collected', time: '09:31', done: true },
  { label: 'In lab', time: '10:05', done: true },
  { label: 'Released', time: '14:40', now: true },
];

/** Brand panel: the product story, told quietly. Hidden on small screens. */
function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-ink text-white lg:flex lg:flex-col lg:justify-between lg:px-14 lg:py-12">
      {/* soft light and a meridian arc, purely decorative */}
      <div aria-hidden="true" className="pointer-events-none absolute -top-40 -right-40 size-[34rem] rounded-full bg-[radial-gradient(closest-side,rgb(13_107_112/0.55),transparent)]" />
      <svg aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-24 size-[30rem] text-white/[0.06]" viewBox="0 0 400 400" fill="none">
        <circle cx="200" cy="200" r="198" stroke="currentColor" />
        <circle cx="200" cy="200" r="150" stroke="currentColor" />
        <circle cx="200" cy="200" r="102" stroke="currentColor" />
        <path d="M200 2v396M2 200h396" stroke="currentColor" />
      </svg>

      <Link href="/portal" className="relative w-fit rounded-lg">
        <Logo tone="light" subtitle="Records Portal" />
      </Link>

      <div className="relative max-w-md">
        <h2 className="font-display text-[2.35rem] leading-[1.1] font-semibold tracking-[-0.02em] text-balance">
          Calm, careful work for every sample.
        </h2>
        <ul className="mt-9 space-y-6">
          {POINTS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-white/[0.08] ring-1 ring-white/10">
                <Icon aria-hidden="true" className="size-[1.1rem] text-[#9fd3cf]" />
              </span>
              <span>
                <span className="block font-semibold">{title}</span>
                <span className="mt-0.5 block text-sm leading-relaxed text-[#b9cdcf]">{text}</span>
              </span>
            </li>
          ))}
        </ul>

        {/* A tiny, illustrative order timeline (no real data). */}
        <div aria-hidden="true" className="mt-10 w-[19rem] rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs text-[#b9cdcf]">
            <span className="font-mono">ORD-2026-000134</span>
            <span className="rounded-full bg-[#9fd3cf]/15 px-2 py-0.5 font-semibold text-[#bfe6e2]">Released</span>
          </div>
          <ol className="mt-4 space-y-2.5">
            {TIMELINE.map((s) => (
              <li key={s.label} className="flex items-center gap-3 text-sm">
                <span className={`size-2 rounded-full ${s.now ? 'bg-[#9fd3cf] ring-4 ring-[#9fd3cf]/20' : 'bg-white/40'}`} />
                <span className={s.now ? 'font-semibold' : 'text-[#d3e1e2]'}>{s.label}</span>
                <span className="ml-auto font-mono text-xs text-[#9db5b8]">{s.time}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <p className="relative text-xs text-[#9db5b8]">Meridian Diagnostics · Central · North · South · East · West</p>
    </aside>
  );
}

/** Split auth layout: brand story on the left, a quiet form on the right. */
export function AuthCard({
  eyebrow = 'Staff workspace',
  title,
  intro,
  children,
  footer,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="grid flex-1 lg:min-h-dvh lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <BrandPanel />
      <main id="main" tabIndex={-1} className="flex flex-col px-5 py-8 sm:px-10 lg:px-16 lg:py-12">
        <Link href="/portal" className="w-fit rounded-lg lg:hidden">
          <Logo subtitle="Records Portal" />
        </Link>
        <div className="mx-auto flex w-full max-w-[24rem] flex-1 flex-col justify-center py-10 lg:py-0">
          <div className="animate-fade-up">
            <p className="text-xs font-semibold tracking-widest text-primary uppercase">{eyebrow}</p>
            <h1 className="mt-2 font-display text-[2.1rem] leading-tight font-semibold tracking-[-0.02em] text-ink">{title}</h1>
            {intro && <p className="mt-2 text-ink-muted">{intro}</p>}
            <div className="mt-8">{children}</div>
          </div>
        </div>
        <div className="mx-auto w-full max-w-[24rem] text-sm text-ink-muted">
          {footer ?? (
            <Link href="/portal" className="inline-flex min-h-6 items-center gap-1 hover:text-ink">
              Looking for your report? <span className="font-medium text-ink-2">Patient portal →</span>
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}
