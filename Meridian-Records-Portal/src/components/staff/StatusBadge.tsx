import { STATUS_LABELS, isOrderStatus } from '@/lib/orders';

// Text label always present; colour is only a secondary cue (WCAG 1.4.1).
const STYLES: Record<string, string> = {
  registered: 'bg-slate-100 text-slate-800',
  collected: 'bg-sky-100 text-sky-900',
  in_lab: 'bg-amber-100 text-amber-900',
  resulted: 'bg-violet-100 text-violet-900',
  released: 'bg-emerald-100 text-emerald-900',
  downloaded: 'bg-teal-100 text-teal-900',
};

export function StatusBadge({ status }: { status: string }) {
  const label = isOrderStatus(status) ? STATUS_LABELS[status] : status;
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STYLES[status] ?? 'bg-slate-100 text-slate-800'}`}>
      <span className="sr-only">Status: </span>
      {label}
    </span>
  );
}

export function BranchBadge({ name, code }: { name: string; code: string }) {
  return (
    <span className="inline-flex rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-semibold text-primary">
      <span className="sr-only">Branch: </span>
      {name} ({code})
    </span>
  );
}
