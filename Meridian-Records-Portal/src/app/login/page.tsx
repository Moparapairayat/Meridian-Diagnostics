import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthCard } from '@/components/AuthCard';
import { Notice } from '@/components/ui/Notice';
import { linkClass } from '@/components/ui/styles';
import { getStaff, isIdle } from '@/lib/auth/staff';
import { safeNextPath } from '@/lib/auth/roles';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = { title: 'Staff login' };

const REASON_TEXT: Record<string, { tone: 'info' | 'error'; text: string }> = {
  idle: { tone: 'info', text: 'You were signed out for security after 15 minutes without activity.' },
  signed_out: { tone: 'info', text: 'You have signed out.' },
  no_access: { tone: 'error', text: 'This account does not have staff access. Contact your manager.' },
};

const DEMO_TAGS = ['reception.central', 'reception.north', 'collector', 'lab', 'patho', 'manager'] as const;

function demoEmails(): string[] {
  const inbox = process.env.DEMO_INBOX;
  const at = inbox?.indexOf('@') ?? -1;
  if (!inbox || at < 1) return DEMO_TAGS.map((tag) => `<inbox>+${tag}@…`);
  return DEMO_TAGS.map((tag) => `${inbox.slice(0, at)}+${tag}@${inbox.slice(at + 1)}`);
}

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const params = await searchParams;
  const reasonKey = typeof params.reason === 'string' ? params.reason : undefined;
  const linkError = params.error === 'link';
  const next = safeNextPath(params.next);

  // Already signed in with an active session: go straight to the staff area.
  if (!reasonKey && (await getStaff()) && !(await isIdle())) redirect(next);

  const reason = reasonKey ? REASON_TEXT[reasonKey] : undefined;
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  return (
    <AuthCard title="Staff login" intro="Sign in with your work email address.">
      <div className="space-y-5">
        {reason && <Notice tone={reason.tone}>{reason.text}</Notice>}
        {linkError && (
          <Notice tone="error">That link is invalid or has expired. Request a new password reset link.</Notice>
        )}
        <LoginForm next={next} />
        <p className="text-sm">
          <Link href="/forgot-password" className={linkClass}>
            Forgot your password?
          </Link>
        </p>
        {demoMode && (
          <details className="rounded-md border border-border bg-page p-4 text-sm">
            <summary className="cursor-pointer font-semibold text-ink">Demo accounts</summary>
            <p className="mt-2 text-ink-muted">
              All demo accounts share the demo password set for this deployment. Data is synthetic.
            </p>
            <ul className="mt-2 space-y-1 break-all font-mono text-xs text-ink">
              {demoEmails().map((email) => (
                <li key={email}>{email}</li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </AuthCard>
  );
}
