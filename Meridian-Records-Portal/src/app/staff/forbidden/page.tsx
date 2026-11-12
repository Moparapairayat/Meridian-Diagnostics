import type { Metadata } from 'next';
import { ShieldCheck } from 'lucide-react';
import { EmptyState, LinkButton } from '@/components/ui/primitives';

export const metadata: Metadata = { title: 'No access' };

export default function ForbiddenPage() {
  return (
    <div className="py-10">
      <p className="mb-4 text-center text-xs font-semibold tracking-widest text-ink-muted uppercase">Error 403</p>
      <EmptyState
        icon={ShieldCheck}
        title="You do not have access to this page"
        description="Your role cannot open this screen. Access follows the role matrix, so each person sees only what their job needs. Ask your manager if you think this is wrong."
        action={
          <LinkButton href="/staff" variant="secondary">
            Back to your tasks
          </LinkButton>
        }
      />
    </div>
  );
}
