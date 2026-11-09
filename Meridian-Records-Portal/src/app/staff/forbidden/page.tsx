import type { Metadata } from 'next';
import Link from 'next/link';
import { linkClass } from '@/components/ui/styles';

export const metadata: Metadata = { title: 'No access' };

export default function ForbiddenPage() {
  return (
    <div className="max-w-prose space-y-3">
      <p className="text-sm font-semibold text-ink-muted">Error 403</p>
      <h1 className="text-2xl font-bold text-ink">You do not have access to this page</h1>
      <p className="text-ink-muted">
        Your role cannot open this screen. If you think this is wrong, ask your manager to check your account.
      </p>
      <Link href="/staff" className={linkClass}>
        Back to your tasks
      </Link>
    </div>
  );
}
