import Link from 'next/link';

/** Centered card layout for the staff auth pages. */
export function AuthCard({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <main id="main" tabIndex={-1} className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-10">
      <Link href="/" className="mb-6 text-sm font-semibold text-ink-muted hover:text-ink">
        Meridian Records Portal
      </Link>
      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold text-ink">{title}</h1>
        {intro && <p className="mt-2 text-ink-muted">{intro}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}
