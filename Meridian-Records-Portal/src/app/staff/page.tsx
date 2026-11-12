import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookOpen, ChartColumn, FlaskConical, ScrollText, Search, Stethoscope, TestTubeDiagonal, UserPlus, type LucideIcon } from 'lucide-react';
import { Alert, PageHeader } from '@/components/ui/primitives';
import { ROLE_LABELS, navFor, type StaffRole } from '@/lib/auth/roles';
import { requireStaff } from '@/lib/auth/staff';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Home' };

const ICONS: Record<string, LucideIcon> = {
  '/staff/register': UserPlus,
  '/staff/search': Search,
  '/staff/collection': TestTubeDiagonal,
  '/staff/lab': FlaskConical,
  '/staff/review': Stethoscope,
  '/staff/knowledge': BookOpen,
  '/staff/dashboard': ChartColumn,
  '/staff/audit': ScrollText,
};

function greeting(): string {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dhaka', hour: 'numeric', hour12: false }).format(new Date()));
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
}

/** Live counts for the role's main worklist (RLS applies). */
async function workload(role: StaffRole, branchId: string): Promise<Record<string, string>> {
  const supabase = await createClient();
  const count = async (status: string) =>
    (await supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', status)).count ?? 0;

  switch (role) {
    case 'sample_collector': {
      const [toCollect, toSend] = await Promise.all([count('registered'), count('collected')]);
      return { '/staff/collection': `${toCollect} to collect · ${toSend} to send` };
    }
    case 'lab_technician':
      return { '/staff/lab': `${await count('in_lab')} in the lab` };
    case 'pathologist':
      return { '/staff/review': `${await count('resulted')} waiting for review` };
    case 'receptionist': {
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date());
      const { count: n } = await supabase
        .from('patients')
        .select('id', { count: 'exact', head: true })
        .eq('registered_branch_id', branchId)
        .gte('created_at', new Date(`${today}T00:00:00+06:00`).toISOString());
      return { '/staff/register': `${n ?? 0} registered today at your branch` };
    }
    default:
      return {};
  }
}

export default async function StaffHomePage({ searchParams }: PageProps<'/staff'>) {
  const staff = await requireStaff();
  const params = await searchParams;
  const tasks = navFor(staff.role);
  const counts = await workload(staff.role, staff.branchId);
  const firstName = staff.fullName.replace(/^Dr\.?\s+/i, 'Dr ').split(' ').slice(0, staff.fullName.startsWith('Dr') ? 2 : 1).join(' ');

  return (
    <div className="space-y-8">
      {params.password === 'updated' && <Alert tone="success">Your new password has been saved.</Alert>}
      <PageHeader
        eyebrow={`${ROLE_LABELS[staff.role]} · ${staff.branchName} branch`}
        title={`${greeting()}, ${firstName}.`}
        description="Here is what needs you today. Everything you open is recorded in the audit log."
      />

      <ul className="grid gap-4 sm:grid-cols-2">
        {tasks.map((task, index) => {
          const Icon = ICONS[task.href] ?? ArrowRight;
          const main = index === 0;
          return (
            <li key={task.href} className="animate-fade-up" style={{ animationDelay: `${index * 50}ms` }}>
              <Link
                href={task.href}
                className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border p-5 transition-[box-shadow,transform,border-color] duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                  main ? 'border-primary bg-primary text-primary-fg shadow-sm' : 'border-line bg-surface text-ink shadow-xs hover:border-line-strong'
                }`}
              >
                <span
                  className={`grid size-11 place-items-center rounded-[12px] ${main ? 'bg-white/15 text-white' : 'bg-primary-soft text-primary'}`}
                >
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <span className="mt-4 flex items-center gap-2 text-lg font-semibold">
                  {task.label}
                  <ArrowRight aria-hidden="true" className="size-4 opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:opacity-100" />
                </span>
                <span className={`mt-1 text-sm ${main ? 'text-white/85' : 'text-ink-muted'}`}>{task.description}</span>
                {counts[task.href] && (
                  <span className={`mt-4 inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${main ? 'bg-white/15 text-white' : 'bg-sunken text-ink-2'}`}>
                    {counts[task.href]}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
