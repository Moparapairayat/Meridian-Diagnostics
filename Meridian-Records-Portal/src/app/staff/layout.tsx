import type { Metadata } from 'next';
import { IdleTimeout } from '@/components/staff/IdleTimeout';
import { StaffShell } from '@/components/staff/StaffShell';
import { ROLE_LABELS, navFor } from '@/lib/auth/roles';
import { requireStaff } from '@/lib/auth/staff';

export const metadata: Metadata = { title: { default: 'Staff', template: '%s · Staff · Meridian Records Portal' } };

/** Guard for every /staff page: active staff only, idle re-check on each request. */
export default async function StaffLayout({ children }: LayoutProps<'/staff'>) {
  const staff = await requireStaff();

  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <StaffShell
        items={navFor(staff.role)}
        user={{ fullName: staff.fullName, roleLabel: ROLE_LABELS[staff.role], branchName: staff.branchName, branchCode: staff.branchCode }}
      />
      <IdleTimeout />
      <main id="main" tabIndex={-1} className="min-w-0 flex-1 px-4 py-8 sm:px-8 lg:px-12 lg:py-10 print:m-0 print:p-0">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
