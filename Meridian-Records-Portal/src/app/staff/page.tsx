import type { Metadata } from 'next';
import Link from 'next/link';
import { Notice } from '@/components/ui/Notice';
import { ROLE_LABELS, navFor } from '@/lib/auth/roles';
import { requireStaff } from '@/lib/auth/staff';

export const metadata: Metadata = { title: 'Home' };

export default async function StaffHomePage({ searchParams }: PageProps<'/staff'>) {
  const staff = await requireStaff();
  const params = await searchParams;
  const tasks = navFor(staff.role);

  return (
    <div className="space-y-6">
      {params.password === 'updated' && <Notice tone="success">Your new password has been saved.</Notice>}
      <div>
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">Hello, {staff.fullName}</h1>
        <p className="mt-1 text-ink-muted">
          {ROLE_LABELS[staff.role]} · {staff.branchName} branch. These are your tasks.
        </p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2">
        {tasks.map((task, index) => (
          <li key={task.href}>
            <Link
              href={task.href}
              className={`flex h-full flex-col rounded-xl border p-5 shadow-sm transition-colors ${
                index === 0
                  ? 'border-primary bg-primary text-primary-fg hover:bg-primary-hover'
                  : 'border-border bg-surface text-ink hover:bg-primary-soft'
              }`}
            >
              <span className="text-lg font-semibold">{task.label}</span>
              <span className={`mt-1 text-sm ${index === 0 ? '' : 'text-ink-muted'}`}>{task.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
