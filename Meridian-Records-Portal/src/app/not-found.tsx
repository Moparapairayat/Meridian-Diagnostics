import Link from 'next/link';
import { Compass } from 'lucide-react';
import { LogoMark } from '@/components/ui/Logo';
import { buttonClass } from '@/components/ui/styles';

export default function NotFound() {
  return (
    <main id="main" tabIndex={-1} className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-6 py-20 text-center">
      <LogoMark className="size-10" />
      <span className="mt-8 grid size-14 place-items-center rounded-full bg-primary-soft text-primary">
        <Compass aria-hidden="true" className="size-7" />
      </span>
      <p className="mt-6 text-xs font-semibold tracking-[0.1em] text-ink-muted uppercase">Error 404</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-ink">This page is not here</h1>
      <p className="mt-3 text-ink-muted">The link may be old, or this part of the prototype is not built yet.</p>
      <Link href="/" className={`${buttonClass({ variant: 'secondary' })} mt-8`}>
        Back to the start
      </Link>
    </main>
  );
}
