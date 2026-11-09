import type { Metadata } from 'next';
import Link from 'next/link';
import { IdleTimeout } from '@/components/staff/IdleTimeout';
import { StaffNav } from '@/components/staff/StaffNav';
import { secondaryButtonClass } from '@/components/ui/styles';
import { ROLE_LABELS, navFor } from '@/lib/auth/roles';
import { requireStaff } from '@/lib/auth/staff';

export const metadata: Metadata = { title: { default: 'Staff', template: '%s · Staff · Meridian Records Portal' } };

/** Guard for every /staff page: active staff only, idle re-check on each request. */
export default async function StaffLayout({ children }: LayoutProps<'/staff'>) {
  const staff = await requireStaff();

  return (
    <div className="flex flex-1 flex-col">
      <header className="bg-surface print:hidden">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/staff" className="text-base font-bold text-ink">
            Meridian Records Portal
          </Link>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
            <span className="font-semibold text-ink">{staff.fullName}</span>
            <span className="text-ink-muted">{ROLE_LABELS[staff.role]}</span>
            <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-semibold text-primary">
              <span className="sr-only">Branch: </span>
              {staff.branchName} ({staff.branchCode})
            </span>
            <form action="/auth/signout" method="post">
              <button type="submit" className={secondaryButtonClass}>
                Sign out
              </button>
            </form>
          </div>
        </div>
        <StaffNav items={navFor(staff.role)} />
      </header>
      <IdleTimeout />
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 print:m-0 print:max-w-none print:p-0">
        {children}
      </main>
    </div>
  );
}
