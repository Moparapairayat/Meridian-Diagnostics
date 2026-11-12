import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthCard } from '@/components/AuthCard';
import { Alert } from '@/components/ui/primitives';
import { getStaff, isIdle } from '@/lib/auth/staff';
import { safeNextPath } from '@/lib/auth/roles';
import { LoginForm, type DemoAccount } from './LoginForm';

export const metadata: Metadata = { title: 'Staff login' };

const REASON_TEXT: Record<string, { tone: 'info' | 'danger'; title: string; text: string }> = {
  idle: { tone: 'info', title: 'Signed out for security', text: 'You were signed out after 15 minutes without activity.' },
  signed_out: { tone: 'info', title: 'You have signed out', text: 'See you next time.' },
  no_access: { tone: 'danger', title: 'No staff access', text: 'This account does not have staff access. Contact your manager.' },
};

const DEMO: { tag: string; role: string; branch: string }[] = [
  { tag: 'reception.central', role: 'Receptionist', branch: 'Central' },
  { tag: 'reception.north', role: 'Receptionist', branch: 'North' },
  { tag: 'collector', role: 'Sample collector', branch: 'Central' },
  { tag: 'lab', role: 'Lab technician', branch: 'Central' },
  { tag: 'patho', role: 'Pathologist', branch: 'Central' },
  { tag: 'manager', role: 'Manager', branch: 'Central' },
];

function demoAccounts(): DemoAccount[] | undefined {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') return undefined;
  const inbox = process.env.DEMO_INBOX;
  const at = inbox?.indexOf('@') ?? -1;
  if (!inbox || at < 1) return undefined;
  return DEMO.map((d) => ({ email: `${inbox.slice(0, at)}+${d.tag}@${inbox.slice(at + 1)}`, role: d.role, branch: d.branch }));
}

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const params = await searchParams;
  const reasonKey = typeof params.reason === 'string' ? params.reason : undefined;
  const linkError = params.error === 'link';
  const next = safeNextPath(params.next);

  // Already signed in with an active session: go straight to the staff area.
  if (!reasonKey && (await getStaff()) && !(await isIdle())) redirect(next);

  const reason = reasonKey ? REASON_TEXT[reasonKey] : undefined;

  return (
    <AuthCard title="Welcome back" intro="Sign in with your work email to open your worklist.">
      <div className="space-y-5">
        {reason && (
          <Alert tone={reason.tone} title={reason.title}>
            {reason.text}
          </Alert>
        )}
        {linkError && (
          <Alert tone="danger" title="Link expired">
            That link is invalid or has expired. Request a new password reset link.
          </Alert>
        )}
        <LoginForm next={next} demoAccounts={demoAccounts()} />
      </div>
    </AuthCard>
  );
}
