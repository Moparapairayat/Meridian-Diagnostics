import Link from 'next/link';
import { BranchBadge, StatusBadge } from '@/components/staff/StatusBadge';
import { formatDhakaDateTime } from '@/lib/format';

export interface WorklistOrder {
  id: string;
  order_no: string;
  status: string;
  created_at: string;
  retest_count: number;
  branches: { name: string; code: string } | null;
  patients: { id: string; patient_code: string; full_name: string } | null;
  order_items: { test_code: string }[];
}

/** One order in a worklist: identity, branch, status, tests, then actions. */
export function OrderCard({ order, href, children }: { order: WorklistOrder; href?: string; children?: React.ReactNode }) {
  return (
    <li className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          {href ? (
            <Link href={href} className="font-mono font-semibold text-primary underline underline-offset-4">
              {order.order_no}
            </Link>
          ) : (
            <p className="font-mono font-semibold text-ink">{order.order_no}</p>
          )}
          <p className="text-sm text-ink">
            {order.patients?.full_name} · <span className="font-mono">{order.patients?.patient_code}</span>
          </p>
          <p className="text-xs text-ink-muted">{formatDhakaDateTime(order.created_at)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {order.branches && <BranchBadge name={order.branches.name} code={order.branches.code} />}
          <StatusBadge status={order.status} />
          {order.retest_count > 0 && <span className="text-xs font-semibold text-warning-fg">Re-test ×{order.retest_count}</span>}
        </div>
      </div>
      <p className="mt-2 text-sm text-ink-muted">Tests: {order.order_items.map((i) => i.test_code).join(', ')}</p>
      {children && <div className="mt-3 flex flex-wrap items-start gap-3">{children}</div>}
    </li>
  );
}

export const WORKLIST_SELECT =
  'id, order_no, status, created_at, retest_count, branches(name, code), patients(id, patient_code, full_name), order_items(test_code)' as const;
