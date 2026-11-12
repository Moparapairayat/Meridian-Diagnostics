import Link from 'next/link';
import { ArrowUpRight, RotateCcw } from 'lucide-react';
import { BranchBadge, StatusBadge, StatusStepper } from '@/components/staff/StatusBadge';
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

/**
 * One order in a worklist. Patient first (that is what staff scan for), then
 * the order's place in the process, then the actions, separated by a hairline.
 */
export function OrderCard({ order, href, children }: { order: WorklistOrder; href?: string; children?: React.ReactNode }) {
  const title = (
    <>
      <span className="block truncate text-[1.02rem] font-semibold text-ink">{order.patients?.full_name}</span>
      <span className="tabular mt-0.5 flex flex-wrap items-center gap-x-2 font-mono text-xs text-ink-muted">
        <span>{order.patients?.patient_code}</span>
        <span aria-hidden="true">·</span>
        <span>{order.order_no}</span>
      </span>
    </>
  );

  return (
    <li className="group/card animate-fade-up overflow-hidden rounded-2xl border border-line bg-surface shadow-xs transition-[box-shadow,border-color] duration-200 hover:border-line-strong hover:shadow-sm">
      <div className="px-5 pt-4 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          {href ? (
            <Link href={href} className="group/link min-w-0 rounded-md">
              <span className="flex items-start gap-1.5">
                <span className="min-w-0">{title}</span>
                <ArrowUpRight aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-ink-muted transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 group-hover/link:text-primary" />
              </span>
            </Link>
          ) : (
            <div className="min-w-0">{title}</div>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            {order.retest_count > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-warning-bg px-2 py-0.5 text-xs font-semibold text-warning-fg ring-1 ring-warning-border ring-inset">
                <RotateCcw aria-hidden="true" className="size-3" />
                Re-test{order.retest_count > 1 ? ` ×${order.retest_count}` : ''}
              </span>
            )}
            <StatusBadge status={order.status} />
          </div>
        </div>

        <div className="mt-4">
          <StatusStepper status={order.status} retest={order.retest_count} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
          <ul className="flex flex-wrap gap-1.5" aria-label="Tests">
            {order.order_items.map((i) => (
              <li key={i.test_code} className="rounded-sm bg-sunken px-2 py-0.5 font-mono text-xs font-semibold text-ink-2">
                {i.test_code}
              </li>
            ))}
          </ul>
          <span className="ml-auto flex items-center gap-2 text-xs text-ink-muted">
            {order.branches && <BranchBadge name={order.branches.name} code={order.branches.code} />}
            <time dateTime={order.created_at}>{formatDhakaDateTime(order.created_at)}</time>
          </span>
        </div>
      </div>
      {children && <div className="flex flex-wrap items-start gap-2.5 border-t border-line bg-[#fcfbf9] px-5 py-3.5">{children}</div>}
    </li>
  );
}

export const WORKLIST_SELECT =
  'id, order_no, status, created_at, retest_count, branches(name, code), patients(id, patient_code, full_name), order_items(test_code)' as const;
